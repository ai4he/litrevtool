#!/usr/bin/env python3
"""
Script to reset search jobs and kill running scraping processes.
This frees up memory and allows jobs to be restarted cleanly.
"""
import sys
import os
import subprocess

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.search_job import SearchJob


def kill_chrome_processes():
    """Kill all Chrome and Playwright processes."""
    print("Killing Chrome and Playwright processes...")
    try:
        subprocess.run(["pkill", "-f", "chromium_headless_shell"], check=False)
        subprocess.run(["pkill", "-f", "playwright.*driver"], check=False)
        print("✓ Processes killed")
    except Exception as e:
        print(f"Warning: Could not kill some processes: {e}")


def reset_running_jobs():
    """Reset all running/pending jobs to failed state."""
    db: Session = SessionLocal()
    try:
        # Find all non-terminal jobs
        jobs = db.query(SearchJob).filter(
            SearchJob.status.in_(['pending', 'running'])
        ).all()

        if not jobs:
            print("No running or pending jobs found")
            return

        print(f"Found {len(jobs)} jobs to reset:")
        for job in jobs:
            print(f"  - {job.name} (ID: {job.id}, Status: {job.status})")
            job.status = 'failed'
            job.error_message = 'Job was reset manually to free system resources'

        db.commit()
        print(f"\n✓ Reset {len(jobs)} jobs to 'failed' status")

    except Exception as e:
        print(f"Error resetting jobs: {e}")
        db.rollback()
    finally:
        db.close()


def main():
    print("=== LitRevTool Job Reset Script ===\n")

    # Kill Chrome processes
    kill_chrome_processes()

    # Reset jobs in database
    reset_running_jobs()

    print("\n=== Reset Complete ===")
    print("Jobs have been reset. You can restart them from the dashboard.")


if __name__ == "__main__":
    main()
