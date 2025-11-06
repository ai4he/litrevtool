from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict
from uuid import UUID


class SemanticCriteria(BaseModel):
    inclusion: Optional[str] = None
    exclusion: Optional[str] = None


class SearchJobCreate(BaseModel):
    name: str
    keywords_include: List[str]
    keywords_exclude: Optional[List[str]] = []
    semantic_criteria: Optional[SemanticCriteria] = None
    semantic_batch_mode: Optional[bool] = True
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    max_results: Optional[int] = None


class SearchJobUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None


class SearchJob(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    keywords_include: List[str]
    keywords_exclude: List[str]
    semantic_criteria: Optional[Dict] = None
    semantic_batch_mode: Optional[bool] = True
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    max_results: Optional[int] = None
    status: str
    progress: float
    total_papers_found: int
    papers_processed: int
    last_checkpoint: Optional[Dict] = None
    error_message: Optional[str] = None
    retry_count: int
    celery_task_id: Optional[str] = None
    csv_file_path: Optional[str] = None
    prisma_diagram_path: Optional[str] = None
    latex_file_path: Optional[str] = None
    bibtex_file_path: Optional[str] = None
    prisma_metrics: Optional[Dict] = None
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SearchJobList(BaseModel):
    jobs: List[SearchJob]
    total: int
