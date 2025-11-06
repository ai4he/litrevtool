from sqlalchemy import Column, String, DateTime, Integer, Boolean, Text, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.db.base_class import Base
from app.models.user import GUID  # Import the database-agnostic GUID type


class SearchJob(Base):
    __tablename__ = "search_jobs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)

    # Search parameters
    name = Column(String, nullable=False)
    keywords_include = Column(JSON, nullable=False)  # List of keywords to include
    keywords_exclude = Column(JSON, default=list)  # List of keywords to exclude
    semantic_criteria = Column(JSON, nullable=True)  # Optional semantic filtering
    semantic_batch_mode = Column(Boolean, default=True)  # True = batch mode (default), False = individual analysis
    start_year = Column(Integer, nullable=True)
    end_year = Column(Integer, nullable=True)
    max_results = Column(Integer, nullable=True)  # Maximum number of results to collect (null = unlimited)

    # Job status
    status = Column(
        String,
        nullable=False,
        default="pending"
    )  # pending, running, paused, completed, failed
    status_message = Column(Text, nullable=True)  # Real-time status updates for transparency
    progress = Column(Float, default=0.0)  # 0.0 to 100.0
    total_papers_found = Column(Integer, default=0)
    papers_processed = Column(Integer, default=0)

    # Error handling and resumption
    last_checkpoint = Column(JSON, nullable=True)  # Stores state for resumption
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)

    # Celery task
    celery_task_id = Column(String, nullable=True)

    # Results
    csv_file_path = Column(String, nullable=True)
    prisma_diagram_path = Column(String, nullable=True)  # Path to PRISMA flow diagram SVG
    latex_file_path = Column(String, nullable=True)  # Path to LaTeX systematic review document
    bibtex_file_path = Column(String, nullable=True)  # Path to BibTeX references file

    # PRISMA methodology metrics
    prisma_metrics = Column(JSON, nullable=True)  # Tracks systematic review stages

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="search_jobs")
    papers = relationship("Paper", back_populates="search_job", cascade="all, delete-orphan")
