import logging
import os
import csv
from datetime import datetime
from typing import Dict, List
from sqlalchemy.orm import Session

from app.tasks.celery_app import celery_app
from app.db.session import SessionLocal
from app.models import SearchJob, Paper
from app.services.scholar_scraper import GoogleScholarScraper
from app.services.semantic_filter import SemanticFilter
from app.services.email_service import EmailService
from app.core.config import settings

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def run_search_job(self, job_id: str):
    """
    Celery task to run a search job.

    This task:
    1. Retrieves the job from database
    2. Runs the Google Scholar scraper
    3. Applies semantic filtering if configured
    4. Saves results to database and CSV
    5. Sends email notification
    6. Handles errors and supports resumption

    Args:
        job_id: UUID of the SearchJob
    """
    db = SessionLocal()

    try:
        # Get job from database
        job = db.query(SearchJob).filter(SearchJob.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found")
            return

        # Update job status
        job.status = "running"
        job.started_at = datetime.utcnow()
        job.celery_task_id = self.request.id
        db.commit()

        logger.info(f"Starting search job {job_id}")

        # Check if we're resuming from a checkpoint
        start_year = job.start_year
        if job.last_checkpoint and job.last_checkpoint.get('last_year_completed'):
            start_year = job.last_checkpoint['last_year_completed'] + 1
            logger.info(f"Resuming from year {start_year}")

        # Initialize scraper
        scraper = GoogleScholarScraper(headless=True)

        # Progress callback to update database
        def update_progress(current: int, estimated_total: int):
            try:
                progress = min((current / max(estimated_total, 1)) * 100, 100)
                job.progress = progress
                job.papers_processed = current
                db.commit()
                logger.info(f"Job {job_id}: {progress:.1f}% complete ({current} papers)")
            except Exception as e:
                logger.error(f"Error updating progress: {e}")

        # Run the search
        papers = scraper.search(
            keywords_include=job.keywords_include,
            keywords_exclude=job.keywords_exclude or [],
            start_year=start_year,
            end_year=job.end_year,
            progress_callback=update_progress
        )

        logger.info(f"Scraping complete: {len(papers)} papers found")

        # Apply semantic filtering if configured
        if job.semantic_criteria:
            logger.info("Applying semantic filtering...")
            semantic_filter = SemanticFilter()

            inclusion_criteria = job.semantic_criteria.get('inclusion')
            exclusion_criteria = job.semantic_criteria.get('exclusion')

            papers = semantic_filter.filter_papers(
                papers,
                inclusion_criteria=inclusion_criteria,
                exclusion_criteria=exclusion_criteria
            )

            logger.info(f"After semantic filtering: {len(papers)} papers remain")

        # Save papers to database
        logger.info("Saving papers to database...")
        for paper_data in papers:
            paper = Paper(
                search_job_id=job.id,
                title=paper_data.get('title', ''),
                authors=paper_data.get('authors', ''),
                year=paper_data.get('year'),
                abstract=paper_data.get('abstract', ''),
                source=paper_data.get('source', ''),
                citations=paper_data.get('citations', 0),
                url=paper_data.get('url', ''),
                publisher=paper_data.get('publisher', ''),
                semantic_score=paper_data.get('semantic_score')
            )
            db.add(paper)

        # Export to CSV
        csv_filename = f"search_{job_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        csv_path = os.path.join(settings.UPLOAD_DIR, csv_filename)

        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

        logger.info(f"Exporting to CSV: {csv_path}")
        _export_to_csv(papers, csv_path)

        # Update job
        job.status = "completed"
        job.completed_at = datetime.utcnow()
        job.total_papers_found = len(papers)
        job.papers_processed = len(papers)
        job.progress = 100.0
        job.csv_file_path = csv_path
        job.last_checkpoint = None  # Clear checkpoint on success
        db.commit()

        logger.info(f"Job {job_id} completed successfully")

        # Send email notification
        try:
            email_service = EmailService()
            user = job.user

            download_url = f"{settings.FRONTEND_URL}/download/{job_id}"

            email_service.send_job_completion_email(
                to_email=user.email,
                user_name=user.name or "User",
                job_name=job.name,
                total_papers=len(papers),
                download_url=download_url
            )

            logger.info(f"Email sent to {user.email}")

        except Exception as e:
            logger.error(f"Error sending email: {e}")
            # Don't fail the job if email fails

    except Exception as e:
        logger.error(f"Error in search job {job_id}: {e}", exc_info=True)

        # Update job with error
        job.status = "failed"
        job.error_message = str(e)
        job.retry_count += 1

        # Save checkpoint for resumption
        if job.end_year and job.start_year:
            # Estimate last completed year based on progress
            if job.progress > 0:
                year_range = job.end_year - job.start_year + 1
                years_completed = int((job.progress / 100.0) * year_range)
                last_year = job.start_year + years_completed - 1

                job.last_checkpoint = {
                    'last_year_completed': last_year,
                    'papers_collected': job.papers_processed,
                    'timestamp': datetime.utcnow().isoformat()
                }

        db.commit()

        # Retry if we haven't exceeded max retries
        if job.retry_count < settings.SCRAPER_RETRY_ATTEMPTS:
            logger.info(f"Retrying job {job_id} (attempt {job.retry_count})")
            raise self.retry(exc=e, countdown=settings.SCRAPER_RETRY_DELAY * job.retry_count)
        else:
            logger.error(f"Job {job_id} failed after {job.retry_count} retries")

    finally:
        db.close()


def _export_to_csv(papers: List[Dict], file_path: str):
    """
    Export papers to CSV file.

    Args:
        papers: List of paper dictionaries
        file_path: Path to save CSV file
    """
    if not papers:
        # Create empty file with headers
        with open(file_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'Title', 'Authors', 'Year', 'Source', 'Publisher',
                'Citations', 'Abstract', 'URL'
            ])
        return

    fieldnames = [
        'title', 'authors', 'year', 'source', 'publisher',
        'citations', 'abstract', 'url'
    ]

    with open(file_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')

        # Write header with nice names
        writer.writerow({
            'title': 'Title',
            'authors': 'Authors',
            'year': 'Year',
            'source': 'Source',
            'publisher': 'Publisher',
            'citations': 'Citations',
            'abstract': 'Abstract',
            'url': 'URL'
        })

        # Write data
        for paper in papers:
            writer.writerow(paper)


@celery_app.task
def resume_failed_job(job_id: str):
    """
    Resume a failed job from its last checkpoint.

    Args:
        job_id: UUID of the SearchJob to resume
    """
    db = SessionLocal()

    try:
        job = db.query(SearchJob).filter(SearchJob.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found")
            return

        if job.status != "failed":
            logger.warning(f"Job {job_id} is not in failed state")
            return

        # Reset job status
        job.status = "pending"
        job.error_message = None
        db.commit()

        # Start the job again (it will resume from checkpoint)
        run_search_job.delay(job_id)

        logger.info(f"Resumed job {job_id}")

    finally:
        db.close()
