from celery import Celery
from celery.signals import worker_ready
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

celery_app = Celery(
    "litrevtool",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)


@worker_ready.connect
def cleanup_stuck_jobs(sender=None, **kwargs):
    """
    Clean up any stuck jobs when the worker starts.
    This runs automatically when Celery worker initializes.
    """
    try:
        from app.db.session import SessionLocal
        from app.models import SearchJob
        from datetime import datetime, timedelta

        db = SessionLocal()

        # Find jobs that are stuck in pending or running state
        # Consider jobs stuck if they've been in these states for more than 30 minutes
        cutoff_time = datetime.utcnow() - timedelta(minutes=30)

        stuck_jobs = db.query(SearchJob).filter(
            SearchJob.status.in_(['running', 'pending']),
            SearchJob.created_at < cutoff_time
        ).all()

        if stuck_jobs:
            logger.warning(f"Found {len(stuck_jobs)} stuck jobs on worker startup, resetting...")

            for job in stuck_jobs:
                logger.info(f"Resetting stuck job: {job.name} (ID: {job.id}, status: {job.status})")
                job.status = 'failed'
                job.status_message = 'Job was stuck and automatically reset on system restart'
                job.error_message = 'Job exceeded maximum runtime or system was restarted while job was pending'
                job.completed_at = datetime.utcnow()

            db.commit()
            logger.info(f"Successfully reset {len(stuck_jobs)} stuck jobs")
        else:
            logger.info("No stuck jobs found on worker startup")

        db.close()

    except Exception as e:
        logger.error(f"Error during stuck job cleanup: {e}", exc_info=True)


# Import tasks to register them with Celery
from app.tasks import scraping_tasks  # noqa: F401, E402
