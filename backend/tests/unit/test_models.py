"""
Unit tests for database models.
"""
import pytest
from sqlalchemy.orm import Session
import uuid

from app.models.user import User
from app.models.search_job import SearchJob
from app.models.paper import Paper


@pytest.mark.unit
class TestUserModel:
    """Test User model."""

    def test_create_user(self, db_session: Session):
        """Test creating a user."""
        user = User(
            email="newuser@example.com",
            name="New User",
            google_id="google_123",
            picture="https://example.com/pic.jpg"
        )
        db_session.add(user)
        db_session.commit()

        assert user.id is not None
        assert isinstance(user.id, uuid.UUID)
        assert user.email == "newuser@example.com"
        assert user.created_at is not None

    def test_user_relationships(self, db_session: Session, test_user: User, test_search_job: SearchJob):
        """Test user-searchjob relationship."""
        assert len(test_user.search_jobs) >= 1
        assert test_search_job in test_user.search_jobs


@pytest.mark.unit
class TestSearchJobModel:
    """Test SearchJob model."""

    def test_create_search_job(self, db_session: Session, test_user: User):
        """Test creating a search job."""
        job = SearchJob(
            user_id=test_user.id,
            name="Model Test Job",
            keywords_include=["AI", "ML"],
            keywords_exclude=["medical"],
            semantic_criteria={
                "inclusion": "deep learning",
                "exclusion": "biology"
            },
            semantic_batch_mode=True,
            start_year=2020,
            end_year=2023,
            status="pending"
        )
        db_session.add(job)
        db_session.commit()

        assert job.id is not None
        assert job.name == "Model Test Job"
        assert job.keywords_include == ["AI", "ML"]
        assert job.semantic_batch_mode is True
        assert job.status == "pending"
        assert job.progress == 0.0

    def test_search_job_defaults(self, db_session: Session, test_user: User):
        """Test default values for search job."""
        job = SearchJob(
            user_id=test_user.id,
            name="Default Test",
            keywords_include=["test"]
        )
        db_session.add(job)
        db_session.commit()

        assert job.status == "pending"
        assert job.progress == 0.0
        assert job.total_papers_found == 0
        assert job.papers_processed == 0
        assert job.retry_count == 0
        assert job.keywords_exclude == []
        assert job.semantic_batch_mode is True

    def test_search_job_prisma_metrics(self, db_session: Session, test_user: User):
        """Test PRISMA metrics storage."""
        prisma_data = {
            "identification": {"records_identified": 100},
            "screening": {"records_screened": 95},
            "eligibility": {"full_text_assessed": 80},
            "included": {"studies_included": 75}
        }

        job = SearchJob(
            user_id=test_user.id,
            name="PRISMA Test",
            keywords_include=["test"],
            prisma_metrics=prisma_data
        )
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        assert job.prisma_metrics == prisma_data
        assert job.prisma_metrics["identification"]["records_identified"] == 100

    def test_search_job_relationships(
        self,
        db_session: Session,
        test_search_job: SearchJob,
        test_paper: Paper
    ):
        """Test search job relationships."""
        assert len(test_search_job.papers) >= 1
        assert test_paper in test_search_job.papers
        assert test_search_job.user is not None


@pytest.mark.unit
class TestPaperModel:
    """Test Paper model."""

    def test_create_paper(self, db_session: Session, test_search_job: SearchJob):
        """Test creating a paper."""
        paper = Paper(
            search_job_id=test_search_job.id,
            title="Neural Networks for NLP",
            authors=["Alice Johnson", "Bob Williams"],
            year=2023,
            source="ACL Conference",
            publisher="ACL",
            citations=150,
            abstract="This paper discusses neural networks for NLP tasks.",
            url="https://example.com/paper/123",
            semantic_score=1
        )
        db_session.add(paper)
        db_session.commit()

        assert paper.id is not None
        assert paper.title == "Neural Networks for NLP"
        assert len(paper.authors) == 2
        assert paper.year == 2023
        assert paper.semantic_score == 1

    def test_paper_optional_fields(self, db_session: Session, test_search_job: SearchJob):
        """Test paper with minimal required fields."""
        paper = Paper(
            search_job_id=test_search_job.id,
            title="Minimal Paper"
        )
        db_session.add(paper)
        db_session.commit()

        assert paper.id is not None
        assert paper.title == "Minimal Paper"
        assert paper.authors is None or paper.authors == []
        assert paper.year is None
        assert paper.citations is None
        assert paper.semantic_score is None

    def test_paper_relationships(self, db_session: Session, test_paper: Paper, test_search_job: SearchJob):
        """Test paper relationships."""
        assert test_paper.search_job == test_search_job
        assert test_paper.search_job.id == test_search_job.id


@pytest.mark.unit
class TestCascadeDeletion:
    """Test cascade deletion behavior."""

    def test_delete_user_cascades_to_jobs(self, db_session: Session, test_user: User, test_search_job: SearchJob):
        """Test deleting user deletes associated jobs."""
        user_id = test_user.id
        job_id = test_search_job.id

        db_session.delete(test_user)
        db_session.commit()

        # Job should be deleted due to cascade
        deleted_job = db_session.query(SearchJob).filter(SearchJob.id == job_id).first()
        assert deleted_job is None

    def test_delete_job_cascades_to_papers(
        self,
        db_session: Session,
        test_search_job: SearchJob,
        test_paper: Paper
    ):
        """Test deleting job deletes associated papers."""
        job_id = test_search_job.id
        paper_id = test_paper.id

        db_session.delete(test_search_job)
        db_session.commit()

        # Paper should be deleted due to cascade
        deleted_paper = db_session.query(Paper).filter(Paper.id == paper_id).first()
        assert deleted_paper is None
