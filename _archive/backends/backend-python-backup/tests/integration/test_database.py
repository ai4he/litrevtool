"""
Integration tests for database operations.
"""
import pytest
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.search_job import SearchJob
from app.models.paper import Paper


@pytest.mark.integration
class TestDatabaseIntegration:
    """Test database integration."""

    def test_create_complete_workflow(self, db_session: Session):
        """Test complete workflow: user -> job -> papers."""
        # Create user
        user = User(
            email="workflow@example.com",
            name="Workflow User",
            google_id="workflow_123"
        )
        db_session.add(user)
        db_session.commit()

        # Create search job
        job = SearchJob(
            user_id=user.id,
            name="Integration Test Job",
            keywords_include=["AI"],
            status="running"
        )
        db_session.add(job)
        db_session.commit()

        # Create papers
        papers = []
        for i in range(10):
            paper = Paper(
                search_job_id=job.id,
                title=f"Paper {i}",
                year=2020 + i % 4,
                semantic_score=1 if i % 2 == 0 else 0
            )
            papers.append(paper)
            db_session.add(paper)
        db_session.commit()

        # Verify relationships
        db_session.refresh(user)
        db_session.refresh(job)

        assert len(user.search_jobs) == 1
        assert len(job.papers) == 10
        assert sum(1 for p in papers if p.semantic_score == 1) == 5

    def test_query_papers_by_semantic_score(self, db_session: Session, create_multiple_papers):
        """Test querying papers by semantic score."""
        papers = create_multiple_papers(10)

        # Query papers that passed semantic filter
        passed = db_session.query(Paper).filter(Paper.semantic_score == 1).all()
        failed = db_session.query(Paper).filter(Paper.semantic_score == 0).all()

        assert len(passed) + len(failed) == 10
        assert len(passed) == 5  # Half pass, half fail based on fixture

    def test_update_job_status(self, db_session: Session, test_search_job: SearchJob):
        """Test updating job status."""
        # Update to running
        test_search_job.status = "running"
        test_search_job.progress = 50.0
        test_search_job.total_papers_found = 100
        db_session.commit()

        # Refresh and verify
        db_session.refresh(test_search_job)
        assert test_search_job.status == "running"
        assert test_search_job.progress == 50.0
        assert test_search_job.total_papers_found == 100

        # Update to completed
        test_search_job.status = "completed"
        test_search_job.progress = 100.0
        test_search_job.csv_file_path = "/path/to/results.csv"
        db_session.commit()

        db_session.refresh(test_search_job)
        assert test_search_job.status == "completed"
        assert test_search_job.progress == 100.0
        assert test_search_job.csv_file_path is not None

    def test_bulk_insert_papers(self, db_session: Session, test_search_job: SearchJob):
        """Test bulk inserting papers."""
        papers = [
            Paper(
                search_job_id=test_search_job.id,
                title=f"Bulk Paper {i}",
                year=2023
            )
            for i in range(100)
        ]

        db_session.bulk_save_objects(papers)
        db_session.commit()

        # Verify count
        count = db_session.query(Paper).filter(
            Paper.search_job_id == test_search_job.id
        ).count()

        assert count >= 100


@pytest.mark.integration
class TestPrismaMetrics:
    """Test PRISMA metrics tracking."""

    def test_calculate_prisma_metrics(self, db_session: Session, test_search_job: SearchJob):
        """Test calculating PRISMA metrics."""
        # Create papers with different semantic scores
        for i in range(50):
            paper = Paper(
                search_job_id=test_search_job.id,
                title=f"PRISMA Test Paper {i}",
                semantic_score=1 if i < 30 else 0  # 30 pass, 20 fail
            )
            db_session.add(paper)
        db_session.commit()

        # Simulate PRISMA calculation
        total_papers = db_session.query(Paper).filter(
            Paper.search_job_id == test_search_job.id
        ).count()

        passed_filter = db_session.query(Paper).filter(
            Paper.search_job_id == test_search_job.id,
            Paper.semantic_score == 1
        ).count()

        excluded = total_papers - passed_filter

        prisma_metrics = {
            "identification": {
                "records_identified": total_papers,
                "records_from_database": total_papers
            },
            "screening": {
                "records_after_duplicates_removed": total_papers,
                "records_screened": total_papers
            },
            "eligibility": {
                "full_text_assessed": total_papers,
                "full_text_excluded_semantic": excluded
            },
            "included": {
                "studies_included": passed_filter
            }
        }

        # Store metrics
        test_search_job.prisma_metrics = prisma_metrics
        db_session.commit()

        # Verify
        db_session.refresh(test_search_job)
        assert test_search_job.prisma_metrics["included"]["studies_included"] == 30
        assert test_search_job.prisma_metrics["eligibility"]["full_text_excluded_semantic"] == 20
