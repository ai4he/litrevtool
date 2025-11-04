from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os

from app.db.session import get_db
from app.models.user import User
from app.models.search_job import SearchJob as SearchJobModel
from app.models.paper import Paper as PaperModel
from app.schemas.search_job import SearchJob, SearchJobCreate, SearchJobUpdate, SearchJobList
from app.schemas.paper import Paper, PaperList
from app.api.auth import get_current_user
from app.tasks.scraping_tasks import run_search_job, resume_failed_job

router = APIRouter()


@router.post("/", response_model=SearchJob, status_code=status.HTTP_201_CREATED)
async def create_search_job(
    job_data: SearchJobCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new search job.

    Args:
        job_data: Search job parameters
        current_user: Current authenticated user
        db: Database session

    Returns:
        Created search job
    """
    # Validate parameters
    if job_data.start_year and job_data.end_year:
        if job_data.start_year > job_data.end_year:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="start_year must be less than or equal to end_year"
            )

    if not job_data.keywords_include:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one inclusion keyword is required"
        )

    # Create job
    job = SearchJobModel(
        user_id=current_user.id,
        name=job_data.name,
        keywords_include=job_data.keywords_include,
        keywords_exclude=job_data.keywords_exclude or [],
        semantic_criteria=job_data.semantic_criteria.dict() if job_data.semantic_criteria else None,
        start_year=job_data.start_year,
        end_year=job_data.end_year,
        status="pending"
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    # Start the background task
    task = run_search_job.delay(str(job.id))
    job.celery_task_id = task.id
    db.commit()

    return job


@router.get("/", response_model=SearchJobList)
async def list_search_jobs(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all search jobs for the current user.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of search jobs
    """
    query = db.query(SearchJobModel).filter(SearchJobModel.user_id == current_user.id)

    total = query.count()
    jobs = query.order_by(SearchJobModel.created_at.desc()).offset(skip).limit(limit).all()

    return SearchJobList(jobs=jobs, total=total)


@router.get("/{job_id}", response_model=SearchJob)
async def get_search_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific search job.

    Args:
        job_id: Job UUID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Search job details
    """
    job = db.query(SearchJobModel).filter(
        SearchJobModel.id == job_id,
        SearchJobModel.user_id == current_user.id
    ).first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Search job not found"
        )

    return job


@router.patch("/{job_id}", response_model=SearchJob)
async def update_search_job(
    job_id: str,
    job_data: SearchJobUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a search job.

    Args:
        job_id: Job UUID
        job_data: Fields to update
        current_user: Current authenticated user
        db: Database session

    Returns:
        Updated search job
    """
    job = db.query(SearchJobModel).filter(
        SearchJobModel.id == job_id,
        SearchJobModel.user_id == current_user.id
    ).first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Search job not found"
        )

    # Update fields
    if job_data.name is not None:
        job.name = job_data.name

    if job_data.status is not None:
        # Validate status transition
        valid_statuses = ["pending", "running", "paused", "completed", "failed"]
        if job_data.status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {valid_statuses}"
            )
        job.status = job_data.status

    db.commit()
    db.refresh(job)

    return job


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_search_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a search job.

    Args:
        job_id: Job UUID
        current_user: Current authenticated user
        db: Database session
    """
    job = db.query(SearchJobModel).filter(
        SearchJobModel.id == job_id,
        SearchJobModel.user_id == current_user.id
    ).first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Search job not found"
        )

    # Delete CSV file if exists
    if job.csv_file_path and os.path.exists(job.csv_file_path):
        os.remove(job.csv_file_path)

    db.delete(job)
    db.commit()


@router.post("/{job_id}/resume", response_model=SearchJob)
async def resume_search_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Resume a failed search job.

    Args:
        job_id: Job UUID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Resumed search job
    """
    job = db.query(SearchJobModel).filter(
        SearchJobModel.id == job_id,
        SearchJobModel.user_id == current_user.id
    ).first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Search job not found"
        )

    if job.status != "failed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only failed jobs can be resumed"
        )

    # Start the resume task
    resume_failed_job.delay(str(job.id))

    db.refresh(job)
    return job


@router.get("/{job_id}/papers", response_model=PaperList)
async def get_job_papers(
    job_id: str,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get papers extracted for a specific search job.

    Args:
        job_id: Job UUID
        skip: Number of records to skip
        limit: Maximum number of records to return
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of papers
    """
    # Verify job belongs to current user
    job = db.query(SearchJobModel).filter(
        SearchJobModel.id == job_id,
        SearchJobModel.user_id == current_user.id
    ).first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Search job not found"
        )

    # Get papers for this job
    query = db.query(PaperModel).filter(PaperModel.search_job_id == job_id)
    total = query.count()
    papers = query.order_by(PaperModel.created_at.desc()).offset(skip).limit(limit).all()

    return PaperList(papers=papers, total=total)


@router.get("/{job_id}/download")
async def download_results(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download CSV results for a completed search job.

    Args:
        job_id: Job UUID
        current_user: Current authenticated user
        db: Database session

    Returns:
        CSV file download
    """
    job = db.query(SearchJobModel).filter(
        SearchJobModel.id == job_id,
        SearchJobModel.user_id == current_user.id
    ).first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Search job not found"
        )

    if job.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job is not completed yet"
        )

    if not job.csv_file_path or not os.path.exists(job.csv_file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Results file not found"
        )

    filename = f"{job.name.replace(' ', '_')}_{job.id}.csv"

    return FileResponse(
        path=job.csv_file_path,
        media_type="text/csv",
        filename=filename
    )
