from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PaperBase(BaseModel):
    title: str
    authors: Optional[str] = None
    year: Optional[int] = None
    abstract: Optional[str] = None
    source: Optional[str] = None
    citations: Optional[int] = 0
    url: Optional[str] = None
    doi: Optional[str] = None
    publisher: Optional[str] = None
    semantic_score: Optional[int] = None


class Paper(PaperBase):
    id: str
    search_job_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class PaperList(BaseModel):
    papers: List[Paper]
    total: int
