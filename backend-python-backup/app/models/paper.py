from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.db.base_class import Base
from app.models.user import GUID  # Import the database-agnostic GUID type


class Paper(Base):
    __tablename__ = "papers"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    search_job_id = Column(GUID(), ForeignKey("search_jobs.id"), nullable=False)

    # Paper metadata
    title = Column(Text, nullable=False)
    authors = Column(Text, nullable=True)
    year = Column(Integer, nullable=True)
    abstract = Column(Text, nullable=True)
    source = Column(String, nullable=True)  # Journal/Conference name
    citations = Column(Integer, default=0)
    url = Column(Text, nullable=True)
    doi = Column(String, nullable=True)

    # Additional metadata
    keywords = Column(JSON, nullable=True)
    publisher = Column(String, nullable=True)

    # Semantic filtering
    semantic_score = Column(Integer, nullable=True)  # If semantic filtering was applied

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    search_job = relationship("SearchJob", back_populates="papers")
