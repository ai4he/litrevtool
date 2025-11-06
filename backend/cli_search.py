#!/usr/bin/env python3
"""
LitRevTool CLI Search Tool

Command-line interface for testing Google Scholar searches without the web UI.
Directly interacts with the internal API to create jobs and retrieve results.

Usage:
    python cli_search.py --include "machine learning" "deep learning" \
                         --exclude "medical" \
                         --start-year 2020 \
                         --end-year 2023 \
                         --max-results 50 \
                         --output results.csv

Author: LitRevTool Team
"""

import argparse
import sys
import os
import time
import json
from datetime import datetime
from typing import List, Optional
from pathlib import Path

# Add app directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models import SearchJob, Paper, User
from app.tasks.scraping_tasks import run_search_job
from app.core.config import settings
import uuid


class Colors:
    """ANSI color codes for terminal output."""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


def print_header(text: str):
    """Print colored header."""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{text}{Colors.ENDC}")


def print_success(text: str):
    """Print success message."""
    print(f"{Colors.OKGREEN}✓{Colors.ENDC} {text}")


def print_error(text: str):
    """Print error message."""
    print(f"{Colors.FAIL}✗{Colors.ENDC} {text}")


def print_warning(text: str):
    """Print warning message."""
    print(f"{Colors.WARNING}!{Colors.ENDC} {text}")


def print_info(text: str):
    """Print info message."""
    print(f"{Colors.OKCYAN}ℹ{Colors.ENDC} {text}")


def generate_output_filename(
    include_keywords: List[str],
    exclude_keywords: List[str],
    start_year: Optional[int],
    end_year: Optional[int]
) -> str:
    """
    Generate a smart output filename based on search parameters.

    Format: litrev_{keywords}_{years}_{seq}.csv
    Example: litrev_llm_math_2022-2023_001.csv
    """
    # Sanitize keywords for filename
    def sanitize(keywords: List[str], max_words: int = 3) -> str:
        """Convert keywords to filename-safe string."""
        words = []
        for kw in keywords[:max_words]:
            # Take first word if multi-word keyword
            first_word = kw.split()[0] if ' ' in kw else kw
            # Remove special characters
            clean = ''.join(c for c in first_word if c.isalnum())
            words.append(clean.lower())
        return '_'.join(words)

    # Build filename parts
    parts = ['litrev']

    # Add keywords (max 3 words)
    if include_keywords:
        parts.append(sanitize(include_keywords, max_words=3))

    # Add exclusions if any (max 2 words)
    if exclude_keywords:
        parts.append(f"ex_{sanitize(exclude_keywords, max_words=2)}")

    # Add year range
    if start_year and end_year:
        if start_year == end_year:
            parts.append(str(start_year))
        else:
            parts.append(f"{start_year}-{end_year}")
    elif start_year:
        parts.append(f"{start_year}+")
    elif end_year:
        parts.append(f"-{end_year}")

    base_filename = '_'.join(parts)

    # Find next available sequence number
    seq = 1
    while True:
        filename = f"{base_filename}_{seq:03d}.csv"
        if not os.path.exists(filename):
            return filename
        seq += 1
        if seq > 999:  # Safety limit
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            return f"{base_filename}_{timestamp}.csv"


def get_or_create_cli_user(db: SessionLocal) -> User:
    """Get or create a CLI test user."""
    email = "cli-test@litrevtool.local"
    user = db.query(User).filter(User.email == email).first()

    if not user:
        print_info("Creating CLI test user...")
        user = User(
            id=uuid.uuid4(),
            email=email,
            name="CLI Test User",
            google_id="cli-test-user"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


def create_search_job(
    db: SessionLocal,
    user: User,
    include_keywords: List[str],
    exclude_keywords: List[str],
    start_year: Optional[int],
    end_year: Optional[int],
    max_results: Optional[int],
    output_file: str,
    semantic_include: Optional[str] = None,
    semantic_exclude: Optional[str] = None,
    semantic_batch_mode: bool = True
) -> SearchJob:
    """Create a search job in the database."""

    # Generate job name
    job_name = f"CLI Search: {' '.join(include_keywords[:3])}"
    if start_year and end_year:
        job_name += f" ({start_year}-{end_year})"

    # Prepare semantic criteria if provided
    semantic_criteria = None
    if semantic_include or semantic_exclude:
        semantic_criteria = {
            'inclusion': semantic_include,
            'exclusion': semantic_exclude
        }

    # Create job
    job = SearchJob(
        id=uuid.uuid4(),
        user_id=user.id,
        name=job_name,
        keywords_include=include_keywords,
        keywords_exclude=exclude_keywords,
        start_year=start_year,
        end_year=end_year,
        semantic_criteria=semantic_criteria,
        semantic_batch_mode=semantic_batch_mode,
        status="pending",
        status_message="Job created via CLI"
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    return job


def monitor_job(db: SessionLocal, job_id: uuid.UUID, max_results: Optional[int] = None) -> bool:
    """
    Monitor job progress and display updates.

    Returns True if job completed successfully, False otherwise.
    """
    print_header("Monitoring Job Progress")

    last_status = None
    last_progress = -1
    start_time = time.time()

    while True:
        # Refresh job from database
        job = db.query(SearchJob).filter(SearchJob.id == job_id).first()

        if not job:
            print_error("Job not found in database")
            return False

        # Check if status changed
        if job.status != last_status:
            if job.status == "running":
                print_info(f"Status: {Colors.BOLD}RUNNING{Colors.ENDC}")
            elif job.status == "completed":
                print_success(f"Status: {Colors.BOLD}COMPLETED{Colors.ENDC}")
            elif job.status == "failed":
                print_error(f"Status: {Colors.BOLD}FAILED{Colors.ENDC}")
            last_status = job.status

        # Display progress if changed
        if job.progress != last_progress and job.progress > 0:
            papers_found = job.total_papers_found or job.papers_processed or 0

            # Create progress bar
            bar_length = 30
            filled = int(bar_length * job.progress / 100)
            bar = '█' * filled + '░' * (bar_length - filled)

            elapsed = time.time() - start_time

            print(f"\r{Colors.OKCYAN}Progress:{Colors.ENDC} [{bar}] {job.progress:.1f}% | "
                  f"Papers: {papers_found} | Elapsed: {elapsed:.0f}s", end='', flush=True)

            last_progress = job.progress

            # Check if we've reached max_results
            if max_results and papers_found >= max_results:
                print(f"\n{Colors.WARNING}Note:{Colors.ENDC} Reached maximum results ({max_results}), "
                      "but scraper will continue to completion")

        # Display status message if available
        if job.status_message and job.status_message != last_status:
            print(f"\n{Colors.OKCYAN}Status:{Colors.ENDC} {job.status_message}")

        # Check if job is done
        if job.status == "completed":
            print()  # New line after progress bar
            return True
        elif job.status == "failed":
            print()  # New line after progress bar
            print_error(f"Job failed: {job.error_message or 'Unknown error'}")
            return False

        # Wait before next check
        time.sleep(2)
        db.refresh(job)


def export_results(
    db: SessionLocal,
    job_id: uuid.UUID,
    output_file: str,
    max_results: Optional[int] = None
) -> bool:
    """Export job results to CSV file."""

    print_header("Exporting Results")

    # Get job
    job = db.query(SearchJob).filter(SearchJob.id == job_id).first()

    if not job:
        print_error("Job not found")
        return False

    # Get papers
    papers_query = db.query(Paper).filter(Paper.search_job_id == job_id)

    # Apply max_results limit if specified
    if max_results:
        papers_query = papers_query.limit(max_results)

    papers = papers_query.all()

    if not papers:
        print_warning("No papers found to export")
        # Create empty CSV with headers
        with open(output_file, 'w') as f:
            f.write("Title,Authors,Year,Source,Publisher,Citations,Abstract,URL,Semantic_Score\n")
        print_info(f"Created empty CSV: {output_file}")
        return True

    # Write to CSV
    import csv

    try:
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            fieldnames = ['Title', 'Authors', 'Year', 'Source', 'Publisher',
                         'Citations', 'Abstract', 'URL', 'Semantic_Score']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

            for paper in papers:
                # Convert semantic_score to 1 or 0 (None means no semantic filtering was applied, treat as 0)
                semantic_score = 1 if paper.semantic_score == 1 else 0

                writer.writerow({
                    'Title': paper.title or '',
                    'Authors': paper.authors or '',
                    'Year': paper.year or '',
                    'Source': paper.source or '',
                    'Publisher': paper.publisher or '',
                    'Citations': paper.citations or 0,
                    'Abstract': paper.abstract or '',
                    'URL': paper.url or '',
                    'Semantic_Score': semantic_score
                })

        file_size = os.path.getsize(output_file)
        print_success(f"Exported {len(papers)} papers to {output_file}")
        print_info(f"File size: {file_size:,} bytes")
        return True

    except Exception as e:
        print_error(f"Error exporting results: {e}")
        return False


def display_summary(
    db: SessionLocal,
    job_id: uuid.UUID,
    output_file: str,
    start_time: float
):
    """Display job completion summary."""

    job = db.query(SearchJob).filter(SearchJob.id == job_id).first()
    papers_count = db.query(Paper).filter(Paper.search_job_id == job_id).count()

    elapsed = time.time() - start_time

    print_header("Search Summary")
    print(f"  Job ID:          {job_id}")
    print(f"  Job Name:        {job.name}")
    print(f"  Status:          {job.status}")
    print(f"  Papers Found:    {papers_count}")
    print(f"  Total Time:      {elapsed:.1f}s ({elapsed/60:.1f}m)")
    print(f"  Output File:     {output_file}")

    if job.csv_file_path:
        print(f"  Server CSV:      {job.csv_file_path}")

    print()

    # Display strategy statistics if available
    print_info("Multi-strategy scraper used - check logs for which strategy succeeded")
    print_info("Use 'npm run logs:celery' to see detailed scraping logs")


def main():
    """Main CLI entry point."""

    parser = argparse.ArgumentParser(
        description="LitRevTool CLI - Search Google Scholar from command line",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic search
  python cli_search.py --include "machine learning" --start-year 2020 --end-year 2023

  # Search with exclusions
  python cli_search.py --include "AI" "neural networks" --exclude "medical" --max-results 50

  # Search with custom output
  python cli_search.py --include "deep learning" --output my_results.csv

  # Full example
  python cli_search.py \\
    --include "large language models" "mathematical reasoning" \\
    --exclude "survey" "review" \\
    --start-year 2022 \\
    --end-year 2023 \\
    --max-results 30

Note: The scraper will run to completion even if --max-results is reached.
      Only the exported CSV will be limited to the specified number.
        """
    )

    parser.add_argument(
        '--include',
        nargs='+',
        required=True,
        help='Keywords to include (space-separated). Use quotes for multi-word phrases.'
    )

    parser.add_argument(
        '--exclude',
        nargs='+',
        default=[],
        help='Keywords to exclude (space-separated). Use quotes for multi-word phrases.'
    )

    parser.add_argument(
        '--start-year',
        type=int,
        help='Starting year for search (e.g., 2020)'
    )

    parser.add_argument(
        '--end-year',
        type=int,
        help='Ending year for search (e.g., 2023)'
    )

    parser.add_argument(
        '--max-results',
        type=int,
        help='Maximum number of results to export (scraper may find more)'
    )

    parser.add_argument(
        '--output',
        type=str,
        help='Output CSV filename (auto-generated if not specified)'
    )

    parser.add_argument(
        '--no-wait',
        action='store_true',
        help='Create job and exit without waiting for completion'
    )

    parser.add_argument(
        '--semantic-include',
        type=str,
        help='Semantic inclusion criteria (e.g., "papers with practical applications")'
    )

    parser.add_argument(
        '--semantic-exclude',
        type=str,
        help='Semantic exclusion criteria (e.g., "purely theoretical papers")'
    )

    parser.add_argument(
        '--semantic-individual',
        action='store_true',
        help='Analyze papers individually instead of in batches (slower, more API calls)'
    )

    args = parser.parse_args()

    # Validate year range
    if args.start_year and args.end_year:
        if args.start_year > args.end_year:
            print_error("Start year cannot be after end year")
            sys.exit(1)

    # Print banner
    print(f"""
{Colors.HEADER}{Colors.BOLD}╔════════════════════════════════════════════════════════════════╗
║           LitRevTool CLI Search                                ║
║           Google Scholar Scraper via Internal API              ║
╚════════════════════════════════════════════════════════════════╝{Colors.ENDC}
    """)

    # Display search parameters
    print_header("Search Parameters")
    print(f"  Include Keywords: {', '.join(args.include)}")
    if args.exclude:
        print(f"  Exclude Keywords: {', '.join(args.exclude)}")
    if args.start_year or args.end_year:
        year_range = f"{args.start_year or '?'} - {args.end_year or '?'}"
        print(f"  Year Range:       {year_range}")
    if args.max_results:
        print(f"  Max Results:      {args.max_results}")
    if args.semantic_include or args.semantic_exclude:
        print(f"\n  {Colors.BOLD}Semantic Filtering Enabled:{Colors.ENDC}")
        if args.semantic_include:
            print(f"    Include:        {args.semantic_include}")
        if args.semantic_exclude:
            print(f"    Exclude:        {args.semantic_exclude}")
        mode = "Individual" if args.semantic_individual else "Batch"
        print(f"    Mode:           {mode}")

    # Generate output filename if not provided
    if not args.output:
        args.output = generate_output_filename(
            args.include,
            args.exclude,
            args.start_year,
            args.end_year
        )
        print(f"  Output File:      {args.output} (auto-generated)")
    else:
        print(f"  Output File:      {args.output}")

    # Start timer
    start_time = time.time()

    # Initialize database
    db = SessionLocal()

    try:
        # Get or create CLI user
        user = get_or_create_cli_user(db)

        # Create search job
        print_header("Creating Search Job")
        job = create_search_job(
            db=db,
            user=user,
            include_keywords=args.include,
            exclude_keywords=args.exclude,
            start_year=args.start_year,
            end_year=args.end_year,
            max_results=args.max_results,
            output_file=args.output,
            semantic_include=args.semantic_include if hasattr(args, 'semantic_include') else None,
            semantic_exclude=args.semantic_exclude if hasattr(args, 'semantic_exclude') else None,
            semantic_batch_mode=not args.semantic_individual if hasattr(args, 'semantic_individual') else True
        )

        print_success(f"Job created: {job.id}")
        print_info(f"Job name: {job.name}")

        # Trigger Celery task
        print_info("Triggering scraper task...")
        run_search_job.delay(str(job.id))
        print_success("Scraper task queued")

        if args.no_wait:
            print_info("Job created successfully. Exiting without waiting.")
            print_info(f"Monitor job with: npm run logs:celery | grep {job.id}")
            sys.exit(0)

        # Monitor job progress
        success = monitor_job(db, job.id, args.max_results)

        if not success:
            print_error("Job failed. Check logs with: npm run logs:celery")
            sys.exit(1)

        # Export results
        export_success = export_results(db, job.id, args.output, args.max_results)

        if not export_success:
            print_error("Failed to export results")
            sys.exit(1)

        # Display summary
        display_summary(db, job.id, args.output, start_time)

        print_success("Search completed successfully!")
        print()

    except KeyboardInterrupt:
        print()
        print_warning("Interrupted by user")
        print_info("Job will continue running in the background")
        print_info("Monitor with: npm run logs:celery")
        sys.exit(130)

    except Exception as e:
        print_error(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        db.close()


if __name__ == "__main__":
    main()
