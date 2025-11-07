# Testing Quick Start Guide

Quick reference for running tests in LitRevTool.

## Backend Tests

```bash
cd backend

# Install dependencies (first time only)
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Run all tests
pytest

# Run specific test types
pytest -m unit            # Fast unit tests only
pytest -m integration     # Integration tests
pytest -m api             # API tests

# Run with coverage
pytest --cov=app --cov-report=html

# View coverage report
open htmlcov/index.html

# Run in parallel (faster)
pytest -n auto

# Run specific file
pytest tests/unit/test_models.py

# Run specific test
pytest tests/unit/test_models.py::TestUserModel::test_create_user

# Watch mode (runs tests on file changes)
pytest-watch
```

## Frontend Tests

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Run tests in watch mode
npm test

# Run all tests once
npm test -- --watchAll=false

# Run with coverage
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html

# Run CI tests
npm run test:ci
```

## Code Quality

### Backend (Python)

```bash
cd backend

# Format code
black app tests

# Sort imports
isort app tests

# Lint
flake8 app

# Type check
mypy app

# Run all quality checks
black app tests && isort app tests && flake8 app && mypy app
```

### Frontend (JavaScript)

```bash
cd frontend

# Lint
npm run lint

# Fix lint issues
npm run lint:fix

# Format code
npm run format
```

## Pre-commit Hooks

```bash
# Install (one time)
pip install pre-commit
pre-commit install

# Run manually
pre-commit run --all-files

# Update hooks
pre-commit autoupdate
```

## CI/CD

### View Workflow Runs

1. Go to GitHub repository
2. Click **Actions** tab
3. Select a workflow run

### Local CI Testing

```bash
# Install act
brew install act  # macOS

# Run workflow locally
act push

# Run specific job
act -j backend-tests
```

## Common Test Commands

| Task | Command |
|------|---------|
| Run all backend tests | `cd backend && pytest` |
| Run all frontend tests | `cd frontend && npm test` |
| Check code coverage | `pytest --cov` or `npm run test:coverage` |
| Run quality checks | `pre-commit run --all-files` |
| Format all code | `black . && isort . && npm run format` |
| Run CI locally | `act push` |

## Test Markers (Backend)

Use markers to run specific test subsets:

```bash
pytest -m unit          # Only unit tests
pytest -m integration   # Only integration tests
pytest -m api           # Only API tests
pytest -m slow          # Only slow tests
pytest -m "not slow"    # Exclude slow tests
```

## Debugging Tests

### Backend

```bash
# Run with verbose output
pytest -vv

# Show print statements
pytest -s

# Drop into debugger on failure
pytest --pdb

# Show locals in traceback
pytest -l
```

### Frontend

```bash
# Run specific test file
npm test -- Dashboard.test.js

# Update snapshots
npm test -- -u

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Quick Fixes

### Tests Failing?

1. **Check dependencies**: `pip install -r requirements-dev.txt` or `npm install`
2. **Clear cache**: `pytest --cache-clear` or `npm test -- --clearCache`
3. **Check environment**: Ensure Redis is running for integration tests
4. **Review logs**: Read error messages carefully

### Coverage Too Low?

1. **Generate report**: `pytest --cov=app --cov-report=html`
2. **Open in browser**: `open htmlcov/index.html`
3. **Find uncovered lines**: Look for red highlights
4. **Add tests**: Write tests for uncovered code

### Pre-commit Hooks Failing?

1. **Run manually**: `pre-commit run --all-files`
2. **Fix issues**: Follow suggestions in output
3. **Auto-fix**: `black . && isort . && npm run lint:fix`
4. **Commit again**: Hooks will run automatically

## Documentation

- **Full Testing Guide**: [docs/TESTING.md](docs/TESTING.md)
- **CI/CD Setup**: [docs/CICD_SETUP.md](docs/CICD_SETUP.md)
- **Project Overview**: [CLAUDE.md](CLAUDE.md)

## Help

- Check existing tests for examples
- Review [pytest documentation](https://docs.pytest.org/)
- Review [Jest documentation](https://jestjs.io/)
- Create GitHub issue for help
