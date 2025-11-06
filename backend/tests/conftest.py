"""
Pytest configuration and shared fixtures for testing.
"""
import os
import sys
from typing import Generator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.db.base_class import Base
from app.db.session import get_db
from app.models.user import User
from app.models.search_job import SearchJob
from app.models.paper import Paper
from app.core.config import settings


# Test Database Setup
@pytest.fixture(scope="function")
def db_engine():
    """Create a test database engine."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(db_engine) -> Generator[Session, None, None]:
    """Create a test database session."""
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db_session) -> Generator[TestClient, None, None]:
    """Create a test client with database override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# Test Data Fixtures
@pytest.fixture
def test_user(db_session: Session) -> User:
    """Create a test user."""
    user = User(
        email="test@example.com",
        name="Test User",
        google_id="test_google_id_123",
        picture="https://example.com/picture.jpg"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_search_job(db_session: Session, test_user: User) -> SearchJob:
    """Create a test search job."""
    job = SearchJob(
        user_id=test_user.id,
        name="Test Job",
        keywords_include=["machine learning", "AI"],
        keywords_exclude=["biology"],
        start_year=2020,
        end_year=2023,
        status="pending"
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)
    return job


@pytest.fixture
def test_paper(db_session: Session, test_search_job: SearchJob) -> Paper:
    """Create a test paper."""
    paper = Paper(
        search_job_id=test_search_job.id,
        title="Test Paper on Machine Learning",
        authors=["John Doe", "Jane Smith"],
        year=2022,
        source="Conference on AI",
        publisher="IEEE",
        citations=42,
        abstract="This is a test abstract about machine learning.",
        url="https://example.com/paper",
        semantic_score=1
    )
    db_session.add(paper)
    db_session.commit()
    db_session.refresh(paper)
    return paper


@pytest.fixture
def auth_headers(test_user: User) -> dict:
    """Create authentication headers for API tests."""
    # In real tests, you'd generate a proper JWT token
    # For now, we'll mock this
    from jose import jwt
    from datetime import datetime, timedelta

    token_data = {
        "sub": test_user.email,
        "exp": datetime.utcnow() + timedelta(minutes=30)
    }
    token = jwt.encode(token_data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    return {"Authorization": f"Bearer {token}"}


# Mock Fixtures
@pytest.fixture
def mock_celery_task(mocker):
    """Mock Celery task execution."""
    return mocker.patch("app.tasks.scraping_tasks.run_search_job.delay")


@pytest.fixture
def mock_gemini_api(mocker):
    """Mock Google Gemini API calls."""
    mock_response = mocker.MagicMock()
    mock_response.text = "Test generated content"
    return mocker.patch("google.generativeai.GenerativeModel.generate_content", return_value=mock_response)


@pytest.fixture
def mock_scholar_scraper(mocker):
    """Mock Scholar scraper."""
    return mocker.patch("app.services.scholar_scraper.ScholarScraper.search")


# Environment Fixtures
@pytest.fixture(autouse=True)
def setup_test_env(monkeypatch):
    """Set up test environment variables."""
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/15")  # Use separate test database
    monkeypatch.setenv("CELERY_BROKER_URL", "redis://localhost:6379/15")
    monkeypatch.setenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/15")


# Helper Functions
@pytest.fixture
def create_multiple_papers(db_session: Session, test_search_job: SearchJob):
    """Helper to create multiple test papers."""
    def _create(count: int = 5):
        papers = []
        for i in range(count):
            paper = Paper(
                search_job_id=test_search_job.id,
                title=f"Test Paper {i+1}",
                authors=[f"Author {i+1}"],
                year=2020 + i % 4,
                source=f"Conference {i+1}",
                citations=i * 10,
                semantic_score=1 if i % 2 == 0 else 0
            )
            db_session.add(paper)
            papers.append(paper)
        db_session.commit()
        return papers
    return _create
