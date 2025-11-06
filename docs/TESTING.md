# Testing Guide

This document provides comprehensive guidance on testing practices for LitRevTool.

## Table of Contents

- [Overview](#overview)
- [Backend Testing](#backend-testing)
- [Frontend Testing](#frontend-testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Code Quality Tools](#code-quality-tools)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)

## Overview

LitRevTool uses industry-standard testing frameworks and tools to ensure code quality:

- **Backend**: pytest + pytest-cov + pytest-asyncio
- **Frontend**: Jest + React Testing Library
- **CI/CD**: GitHub Actions
- **Code Quality**: black, isort, flake8, ESLint
- **Pre-commit Hooks**: Automated code quality checks

## Backend Testing

### Framework

We use **pytest** as our testing framework with the following plugins:
- `pytest-cov` - Code coverage reporting
- `pytest-asyncio` - Async test support
- `pytest-mock` - Mocking capabilities
- `pytest-xdist` - Parallel test execution

### Test Structure

```
backend/tests/
├── __init__.py
├── conftest.py           # Shared fixtures
├── unit/                 # Unit tests (fast, isolated)
│   ├── __init__.py
│   └── test_models.py
├── integration/          # Integration tests (database, external services)
│   ├── __init__.py
│   └── test_database.py
└── api/                  # API endpoint tests
    ├── __init__.py
    └── test_search_jobs.py
```

### Test Markers

Tests are organized using pytest markers:

- `@pytest.mark.unit` - Unit tests (fast, no external dependencies)
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.api` - API endpoint tests
- `@pytest.mark.slow` - Slow-running tests
- `@pytest.mark.scraper` - Scraper-related tests
- `@pytest.mark.celery` - Celery task tests

### Running Backend Tests

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Run all tests
pytest

# Run specific test types
pytest -m unit           # Only unit tests
pytest -m integration    # Only integration tests
pytest -m api            # Only API tests

# Run with coverage
pytest --cov=app --cov-report=html

# Run in parallel
pytest -n auto           # Auto-detect CPU count

# Run specific test file
pytest tests/unit/test_models.py

# Run specific test
pytest tests/unit/test_models.py::TestUserModel::test_create_user
```

### Writing Backend Tests

#### Example Unit Test

```python
import pytest
from app.models.user import User

@pytest.mark.unit
class TestUserModel:
    def test_create_user(self, db_session):
        """Test creating a user."""
        user = User(
            email="test@example.com",
            name="Test User",
            google_id="google_123"
        )
        db_session.add(user)
        db_session.commit()

        assert user.id is not None
        assert user.email == "test@example.com"
```

#### Example API Test

```python
import pytest
from fastapi.testclient import TestClient

@pytest.mark.api
def test_create_search_job(client: TestClient, auth_headers: dict):
    """Test creating a search job via API."""
    payload = {
        "name": "Test Job",
        "keywords_include": ["AI"],
        "start_year": 2020,
        "end_year": 2023
    }

    response = client.post("/api/v1/jobs/", json=payload, headers=auth_headers)

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Job"
```

#### Example Integration Test

```python
import pytest
from app.models.search_job import SearchJob
from app.models.paper import Paper

@pytest.mark.integration
def test_complete_workflow(db_session, test_user):
    """Test complete workflow from user to papers."""
    # Create job
    job = SearchJob(
        user_id=test_user.id,
        name="Integration Test",
        keywords_include=["AI"]
    )
    db_session.add(job)
    db_session.commit()

    # Create papers
    for i in range(10):
        paper = Paper(
            search_job_id=job.id,
            title=f"Paper {i}"
        )
        db_session.add(paper)
    db_session.commit()

    # Verify
    assert len(job.papers) == 10
```

### Fixtures

Common fixtures are defined in `tests/conftest.py`:

- `db_engine` - Test database engine
- `db_session` - Test database session
- `client` - FastAPI test client
- `test_user` - Pre-created test user
- `test_search_job` - Pre-created test search job
- `test_paper` - Pre-created test paper
- `auth_headers` - Authentication headers for API tests
- `mock_celery_task` - Mocked Celery task
- `mock_gemini_api` - Mocked Gemini API

## Frontend Testing

### Framework

We use **Jest** and **React Testing Library**:

- Jest comes pre-configured with Create React App
- React Testing Library for component testing
- Coverage reporting included

### Test Structure

```
frontend/src/
├── __tests__/            # Test files
│   ├── App.test.js
│   └── Dashboard.test.js
└── components/
    └── __tests__/        # Component-specific tests
        └── Login.test.js
```

### Running Frontend Tests

```bash
# Navigate to frontend directory
cd frontend

# Run tests in watch mode
npm test

# Run all tests once
npm test -- --watchAll=false

# Run with coverage
npm run test:coverage

# Run CI tests
npm run test:ci
```

### Writing Frontend Tests

#### Example Component Test

```javascript
import { render, screen } from '@testing-library/react';
import Dashboard from '../components/Dashboard';

describe('Dashboard Component', () => {
  test('renders dashboard heading', () => {
    render(<Dashboard />);
    const heading = screen.getByRole('heading');
    expect(heading).toBeInTheDocument();
  });
});
```

## CI/CD Pipeline

### GitHub Actions Workflow

Our CI/CD pipeline runs on every push and pull request to `main` and `develop` branches.

**Workflow File**: `.github/workflows/ci.yml`

### Pipeline Stages

1. **Backend Tests**
   - Runs on Python 3.11 and 3.12
   - Sets up Redis service
   - Lints with flake8
   - Formats with black
   - Sorts imports with isort
   - Type checks with mypy
   - Runs unit, integration, and API tests
   - Uploads coverage to Codecov

2. **Frontend Tests**
   - Runs on Node.js 18 and 20
   - Lints with ESLint
   - Runs Jest tests
   - Builds production bundle
   - Uploads coverage to Codecov

3. **Security Scan**
   - Scans for vulnerabilities with Trivy
   - Checks Python dependencies with Safety
   - Uploads results to GitHub Security

4. **Build Docker Images** (on main branch)
   - Builds backend and frontend Docker images
   - Caches layers for faster builds

5. **Deploy** (on main branch)
   - Placeholder for deployment steps

### Environment Variables for CI

Add these secrets to your GitHub repository:

- `GEMINI_API_KEY` - Google Gemini API key (optional for tests)
- `CODECOV_TOKEN` - Codecov upload token (optional)

## Code Quality Tools

### Python (Backend)

#### Black - Code Formatter

```bash
# Check formatting
black --check app tests

# Format code
black app tests
```

Configuration: `backend/pyproject.toml`

#### isort - Import Sorter

```bash
# Check imports
isort --check-only app tests

# Sort imports
isort app tests
```

#### flake8 - Linter

```bash
# Lint code
flake8 app --max-line-length=100
```

#### mypy - Type Checker

```bash
# Type check
mypy app
```

### JavaScript/TypeScript (Frontend)

#### ESLint

```bash
# Lint code
npm run lint

# Fix issues
npm run lint:fix
```

#### Prettier

```bash
# Format code
npm run format
```

## Pre-commit Hooks

Pre-commit hooks run automatically before each commit to ensure code quality.

### Installation

```bash
# Install dependencies
pip install pre-commit

# Install git hooks
pre-commit install
```

### Running Manually

```bash
# Run on all files
pre-commit run --all-files

# Run specific hook
pre-commit run black --all-files
```

### Configured Hooks

- Trailing whitespace removal
- End-of-file fixer
- YAML/JSON validation
- Large file check
- Private key detection
- Black (Python formatter)
- isort (import sorter)
- flake8 (Python linter)
- Prettier (JS/TS formatter)
- Markdownlint
- Bandit (security scanner)
- mypy (type checker)

## Test Coverage

### Goals

- **Backend**: Aim for 80%+ code coverage
- **Frontend**: Aim for 70%+ code coverage
- Critical paths should have 100% coverage

### Generating Coverage Reports

#### Backend

```bash
cd backend

# Generate HTML report
pytest --cov=app --cov-report=html

# View report
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
```

#### Frontend

```bash
cd frontend

# Generate coverage report
npm run test:coverage

# View report
open coverage/lcov-report/index.html
```

### Coverage Configuration

Backend coverage settings are in `backend/pytest.ini`:

```ini
[coverage:run]
source = app
omit =
    */tests/*
    */venv/*
    */__pycache__/*
    */migrations/*
```

## Best Practices

### General

1. **Write tests first** (Test-Driven Development when possible)
2. **Keep tests isolated** - No dependencies between tests
3. **Use descriptive names** - Test names should explain what they test
4. **Test edge cases** - Don't just test happy paths
5. **Mock external services** - Tests should be fast and reliable
6. **Maintain test data** - Use fixtures for reusable test data

### Backend

1. Use `@pytest.mark` to categorize tests
2. Use fixtures for common setup
3. Test both success and failure cases
4. Use parametrize for similar test cases
5. Mock Celery tasks in unit tests
6. Test database constraints

### Frontend

1. Test user interactions, not implementation
2. Use `screen.getByRole` over `getByTestId`
3. Mock API calls in component tests
4. Test accessibility
5. Avoid testing third-party libraries

## Continuous Improvement

### Adding New Tests

1. Create test file in appropriate directory
2. Write test following existing patterns
3. Run test locally to ensure it passes
4. Add appropriate markers
5. Ensure coverage doesn't decrease
6. Commit and push - CI will validate

### Updating Tests

When modifying code:
1. Update corresponding tests
2. Run affected tests locally
3. Ensure coverage is maintained
4. Check CI passes before merging

## Troubleshooting

### Common Issues

#### Tests Fail Locally but Pass in CI
- Check Python/Node version matches CI
- Ensure all dependencies installed
- Check environment variables

#### Coverage Decreases
- Add tests for new code
- Remove dead code
- Check coverage report for gaps

#### Pre-commit Hooks Fail
- Run hooks manually: `pre-commit run --all-files`
- Fix issues reported
- Commit again

#### Slow Tests
- Use pytest markers to skip slow tests: `pytest -m "not slow"`
- Run tests in parallel: `pytest -n auto`
- Mock external services

## Resources

- [pytest Documentation](https://docs.pytest.org/)
- [React Testing Library](https://testing-library.com/react)
- [Jest Documentation](https://jestjs.io/)
- [GitHub Actions](https://docs.github.com/actions)
- [Pre-commit](https://pre-commit.com/)

## Support

For testing-related questions or issues, please:
1. Check this documentation
2. Review existing tests for examples
3. Check CI logs for detailed error messages
4. Create an issue on GitHub
