# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> ⚠️ **IMPORTANT NOTICE ABOUT ARCHIVED CODE**
>
> The `_archive/` directory contains **UNSUPPORTED** legacy code including:
> - Python backend (FastAPI + Celery)
> - Next.js frontend attempt
> - Old deployment scripts and configs
>
> **DO NOT USE OR REFERENCE archived code.** It is for historical reference only and contains schema incompatibilities and deprecated patterns. See [_archive/README.md](_archive/README.md) for details.
>
> **Use only the current Node.js stack documented below.**

## Project Overview

LitRevTool is a literature review tool that overcomes Google Scholar's 1000-paper limit by automatically splitting searches by year and running them in parallel. It consists of:
- **Web App**: React frontend with Node.js backend
- **Desktop App**: Electron-based native application (Windows, macOS, Linux)
- **Mobile App**: Capacitor-based hybrid app (iOS, Android) - **NEW!**
- **CLI Tool**: Command-line interface for automation and scripting
- **Backend**: Node.js Express server with BullMQ task queue for background scraping

**Key Differentiator**: Can extract 1000 papers per year (e.g., 4000 papers for 2020-2023 vs. Publish or Perish's 1000 paper limit) by splitting searches by year and using intelligent pagination.

## Architecture

### Stack
- **Frontend**: React + Material-UI (port 3001)
- **Backend**: Node.js + Express + TypeScript (port 8000)
- **CLI**: Node.js command-line interface (uses API endpoints)
- **Desktop App**: Electron-based desktop application (wraps React frontend)
- **Mobile App**: Capacitor-based hybrid app (iOS + Android, wraps React frontend)
- **Database**: SQLite (backend-node/litrevtool.db)
- **Task Queue**: BullMQ + Redis
- **Process Manager**: PM2 manages all services
- **Scraper**: Multi-strategy scraper (scholarly library, HTTP, Playwright)

### Service Layout
Three PM2-managed services defined in `ecosystem.config.node.js`:
1. `litrev-backend` - Node.js Express server with TypeScript
2. `litrev-worker` - BullMQ worker processing scraping tasks
3. `litrev-frontend` - React dev server

Note: Old configs (`ecosystem.config.js`, `ecosystem.config.python.js`, `ecosystem.config.nextjs.js`) have been archived.

## Critical Commands

### Development Workflow
```bash
# Deploy/redeploy entire application
npm run deploy              # or ./deploy-node.sh

# Service management
npm start                   # Start all services
npm stop                    # Stop all services
npm restart                 # Restart all services
npm run status              # Check PM2 service status

# Logs and monitoring
npm run logs                # All service logs
npm run logs:backend        # Backend only
npm run logs:worker         # Worker only
npm run logs:frontend       # Frontend only
npm run monit               # PM2 monitoring dashboard

# Database
npm run setup:db            # Initialize/reset database

# System recovery
npm run reset               # Full system reset: stops processes, clears Redis,
                           # resets stuck jobs, cleans screenshots, restarts services

# Testing endpoints
curl http://localhost:8000/docs     # API documentation
curl http://localhost:8000/health   # Health check
```

### Backend Development
```bash
cd backend
source venv/bin/activate    # Always activate venv first
python3 -m pytest           # Run tests (if configured)
deactivate                  # Exit venv when done
```

### Frontend Development
```bash
cd frontend
npm start                   # Run dev server (or use PM2)
npm run build              # Production build
npm test                   # Run tests
```

### CLI Tool (Node.js)
```bash
# Install CLI globally
npm run cli:install         # Makes 'litrev' command available globally

# Use CLI commands
litrev --help               # Show all available commands
litrev quickstart           # Quick start guide
litrev create --interactive # Create search job interactively
litrev watch <job-id>       # Watch job progress in real-time
litrev download <job-id>    # Download results (CSV, LaTeX, BibTeX, PRISMA)

# Uninstall CLI
npm run cli:uninstall       # Remove global 'litrev' command
```

See [cli/README.md](cli/README.md) for complete CLI documentation.

### Electron Desktop App
```bash
# Install Electron dependencies
npm run electron:install

# Run in development mode (requires backend + frontend dev server)
npm run electron:dev

# Build for production
npm run electron:build        # Build for current platform
npm run electron:build:mac    # Build for macOS
npm run electron:build:win    # Build for Windows
npm run electron:build:linux  # Build for Linux

# Run production build (requires backend + frontend build)
npm run electron:start
```

The Electron app provides a native desktop experience:
- **Cross-platform**: Runs on Windows, macOS, and Linux
- **Uses existing frontend**: Wraps the React web app
- **API Mode Switching**: Three modes available via Settings menu (no rebuild required)
  - **Local**: Pure local development (localhost:8000)
  - **Cloud**: Pure cloud operation (litrev.haielab.org)
  - **Hybrid**: Local processing + cloud sync (best of both worlds)
- **Hybrid Mode Features**:
  - Runs jobs on local backend for full control and performance
  - Automatically syncs results to cloud for backup
  - Enables access from multiple devices
  - Sync failures don't affect local operations
- **Connects to backend API**: Same API as web and CLI versions
- **Build output**: Installers and portable apps in `electron/dist/`

See [electron/README.md](electron/README.md) for complete Electron app documentation.

### Mobile App (iOS + Android)
```bash
# Install mobile dependencies
npm run mobile:install

# Setup mobile app (first time)
cd mobile && ./setup.sh

# Add platforms
npm run mobile:add:ios       # macOS only
npm run mobile:add:android   # All platforms

# Build and sync mobile apps
npm run mobile:sync          # Build React + sync to mobile

# Open in native IDE
npm run mobile:open:ios      # Open in Xcode
npm run mobile:open:android  # Open in Android Studio

# Build for specific platform
npm run mobile:build:ios     # Build + open in Xcode
npm run mobile:build:android # Build + open in Android Studio

# Build ALL platforms at once (web + mobile + desktop)
npm run build:all
```

The Mobile app provides native iOS and Android experience:
- **Cross-platform**: iOS and Android from single React codebase
- **Uses existing frontend**: Wraps the same React web app (via Capacitor)
- **Single Source Updates**: Change React code once, deploy to web + mobile + desktop
- **Native Features**: Splash screen, status bar, back button, app lifecycle management
- **API Modes**: Can connect to local development server or production API
- **App Store Ready**: Can be published to Apple App Store and Google Play
- **Build output**:
  - iOS: `frontend/ios/` (Xcode project)
  - Android: `frontend/android/` (Android Studio project)

**Architecture**: Same React app → 3 wrappers (Web browser, Electron, Capacitor)

See [mobile/README.md](mobile/README.md) for complete mobile app documentation.

## Key Application Components

### Backend Structure (`backend/app/`)
- `main.py` - FastAPI app initialization, CORS, router registration
- `api/` - API endpoints
  - `auth.py` - Google OAuth authentication endpoints
  - `search_jobs.py` - Search job CRUD, download CSV, resume jobs
- `models/` - SQLAlchemy models
  - `user.py` - User with Google OAuth fields
  - `search_job.py` - SearchJob with status tracking
  - `paper.py` - Paper results with citations, abstracts
- `services/` - Business logic
  - `scholar_scraper.py` - **Core scraper**: Playwright-based, handles pagination, CAPTCHA detection, rate limiting, year-based splitting
  - `semantic_filter.py` - Google Gemini AI for semantic paper filtering
  - `email_service.py` - HTML email notifications
- `tasks/` - Celery tasks
  - `scraping_tasks.py` - `run_search_job()` task orchestrates: scraping → filtering → saving to DB → CSV export → email
- `core/config.py` - Settings loaded from `.env`, includes Google OAuth, Gemini API key, SMTP config

### Frontend Structure (`frontend/src/`)
- `App.js` - Main app with routing
- `components/`
  - `Login.js` - Google OAuth login button
  - `Dashboard.js` - Main dashboard showing all search jobs with real-time progress
  - `CreateJobDialog.js` - Form for creating new search jobs with semantic filtering options
- `contexts/` - React contexts for auth state
- `services/` - API client for backend communication

### How Scraping Works
1. User creates search via `CreateJobDialog.js`
2. API creates `SearchJob` in database with status "pending"
3. Celery task `run_search_job()` is triggered
4. **Multi-Strategy Scraper** tries three approaches automatically:
   - **PRIMARY**: `scholarly` library with Tor support (fast, designed for Scholar)
   - **FALLBACK 1**: Direct HTTP requests with user agent rotation (lightweight)
   - **FALLBACK 2**: Playwright browser automation (most reliable but slower)
5. **Year splitting**: If year range specified (e.g., 2020-2023), creates 4 separate searches
6. For each year: paginate through all results (up to ~1000 per year)
7. **PRISMA Tracking**: Automatically tracks systematic review metrics (identification, screening, eligibility, inclusion)
8. Optional: `SemanticFilter` uses Gemini AI to filter papers based on inclusion/exclusion criteria (batch or individual mode)
9. Papers saved to database with deduplication
10. Export to CSV in `backend/uploads/` with Semantic_Score column
11. Generate PRISMA flow diagram (SVG) showing the systematic review process
12. `EmailService` sends completion notification
13. Job status updated to "completed" or "failed" with PRISMA metrics and diagram saved

**NEW**: The system now uses a robust multi-strategy approach that automatically fails over between different scraping methods. See [docs/MULTI_STRATEGY_SCRAPER.md](docs/MULTI_STRATEGY_SCRAPER.md) for details.

### Key Files to Know
- `ecosystem.config.js` - PM2 configuration (service definitions, env vars, log paths)
- `.env` - Environment variables (Google OAuth credentials, SMTP, Gemini API key)
- `backend/litrevtool.db` - SQLite database (auto-created)
- `backend/uploads/` - CSV exports and screenshots
- `deploy.sh` - Automated deployment script with prerequisite checks
- `backend/app/services/multi_strategy_scraper.py` - **NEW**: Multi-strategy scraping orchestrator
- `backend/app/services/scholar_scraper.py` - Playwright browser automation (now used as fallback)

## Configuration

### Environment Variables (`.env`)
Required:
- `GOOGLE_CLIENT_ID` - OAuth client ID from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - OAuth client secret
- `SECRET_KEY` - JWT signing key (change in production!)

Optional:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` - Email notifications
- `GEMINI_API_KEY` - For semantic filtering (default key already configured)
- `FRONTEND_URL` - For production deployment (default: http://localhost:3000)

### Google OAuth Setup
Authorized redirect URIs must include:
- Development: `http://localhost:8000/api/v1/auth/google/callback`
- Production: `https://yourdomain.com/api/v1/auth/google/callback`

Configure at: https://console.cloud.google.com/apis/credentials

## Database Schema

### Models
- **User**: id, email, name, picture, google_id, created_at
- **SearchJob**: id, user_id, name, search_query, year_from, year_to, include_keywords, exclude_keywords, semantic_criteria, semantic_batch_mode, prisma_metrics, prisma_diagram_path, latex_file_path, bibtex_file_path, status (pending/running/completed/failed), papers_collected, status_message, celery_task_id, csv_file_path, created_at, started_at, completed_at
- **Paper**: id, job_id, title, authors, year, source, publisher, citations, abstract, url, semantic_score, created_at

### Output Files Generated
LitRevTool automatically generates multiple publication-ready outputs for each completed search:
- **CSV File** (`csv_file_path`): Structured data with all papers, includes Semantic_Score column
- **PRISMA Diagram** (`prisma_diagram_path`): SVG flow diagram following PRISMA 2020 standards
- **LaTeX Document** (`latex_file_path`): Complete systematic literature review in LaTeX format with AI-generated content
- **BibTeX File** (`bibtex_file_path`): All paper citations in BibTeX format for easy reference management

These files are saved to `backend/uploads/` and available for download through both web UI and CLI.

### PRISMA Methodology Tracking
LitRevTool automatically tracks systematic review metrics following the PRISMA (Preferred Reporting Items for Systematic Reviews and Meta-Analyses) methodology. The `prisma_metrics` field stores:
- **Identification**: Total records identified from database searching
- **Screening**: Records after duplicate removal, records screened
- **Eligibility**: Papers assessed by semantic filter, papers excluded by semantic criteria
- **Included**: Final papers included in results

These metrics are displayed in both the web UI (Dashboard) and CLI output, providing transparency and reproducibility for systematic literature reviews.

### Important: Stuck Job Recovery
The `npm run reset` command includes a Python script that resets all stuck jobs (status=running/pending) to failed. This is critical after crashes.

## Common Development Tasks

### Adding a New API Endpoint
1. Create route function in `backend/app/api/search_jobs.py` or `auth.py`
2. Add Pydantic schema in `backend/app/schemas/`
3. Restart backend: `pm2 restart litrev-backend`

### Modifying the Scraper
1. Edit `backend/app/services/scholar_scraper.py`
2. Key methods: `search()`, `_paginate_results()`, `_extract_papers()`
3. Restart Celery worker: `pm2 restart litrev-celery`
4. Test with a small search first (single year, few results)

### Adding Frontend Features
1. Create component in `frontend/src/components/`
2. PM2 will auto-reload if frontend is running in development mode
3. For production: `cd frontend && npm run build`

### Database Migrations
SQLAlchemy auto-creates tables on startup. For schema changes:
1. Modify model in `backend/app/models/`
2. For SQLite, easiest is to backup data and recreate:
   ```bash
   cp backend/litrevtool.db backend/litrevtool.db.backup
   rm backend/litrevtool.db
   npm run setup:db
   ```
3. For production, use Alembic (already in requirements.txt but not configured)

## Troubleshooting

### Services Won't Start
1. Check logs: `npm run logs`
2. Verify Redis is running: `redis-cli ping` (should return PONG)
3. Check port conflicts: `lsof -i :8000` and `lsof -i :3001`
4. Full reset: `npm run reset`

### Scraper Issues
- **CAPTCHA detected**: Scraper pauses and captures screenshot in `backend/uploads/screenshots/`
- **Browser won't start**: Ensure Playwright browsers installed: `cd backend && source venv/bin/activate && python3 -m playwright install chromium`
- **Tor connection fails**: Scraper falls back to normal mode (use_tor=False)

### Database Locked
SQLite can lock with concurrent writes. Celery is configured with `--concurrency=1` to prevent this. Don't increase concurrency without migrating to PostgreSQL.

### Email Not Sending
1. Verify SMTP credentials in `.env`
2. Gmail requires App Password (not account password)
3. Check logs for SMTP errors: `npm run logs:worker`

## Production Deployment

Deployed at https://litrev.haielab.org (production setup):

1. **Nginx**: Reverse proxy for frontend (port 3001) and backend API (port 8000)
2. **SSL**: Let's Encrypt certificates
3. **PM2 Startup**: Configured with `pm2 startup` and `pm2 save` for auto-restart on reboot
4. **Environment**: Production `.env` with domain-specific FRONTEND_URL and Google OAuth redirect URIs

For full production checklist, see [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md).

For detailed setup instructions, see [docs/SETUP.md](docs/SETUP.md).

For Nginx and SSL configuration, see [docs/NGINX_SSL_SETUP.md](docs/NGINX_SSL_SETUP.md).

## Testing

### Manual Testing Workflow
1. Start services: `npm start`
2. Open http://localhost:3001
3. Login with Google
4. Create test search:
   - Name: "Test Search"
   - Keywords: "machine learning"
   - Year range: 2023-2023 (single year for speed)
5. Monitor progress in dashboard (auto-refreshes every 5 seconds)
6. Check logs: `npm run logs:worker`
7. Download CSV when complete

### API Testing
Use Swagger UI at http://localhost:8000/docs for interactive API testing.

## Important Notes

- **Rate Limiting**: Scraper has random delays (2-5 seconds) between requests to respect Google Scholar
- **Checkpointing**: Jobs save progress periodically; can be resumed with "Resume" button if failed
- **Deduplication**: Papers are deduplicated by title+year across year-split searches
- **Memory Management**: Celery configured with `--max-memory-per-child=200000` to prevent memory leaks
- **Screenshot Monitoring**: Real-time browser screenshots captured during scraping for debugging CAPTCHA/errors
- **Semantic Filtering**: Optional Gemini AI filtering applies AFTER scraping to avoid rate limits

## Helpful File Locations

- Backend logs: `backend/logs/`
- Frontend logs: `frontend/logs/`
- CSV exports: `backend/uploads/`
- Screenshots: `backend/uploads/screenshots/`
- Database: `backend/litrevtool.db`
- Python venv: `backend/venv/`

## Debugging Commands

Use these npm commands for troubleshooting:

### Comprehensive Debugging
```bash
npm run debug              # Complete system overview: services, DB stats, errors, screenshots
npm run debug:health       # Quick health check: services, API, Redis, disk, memory
```

### Job-Specific Debugging
```bash
npm run debug:jobs         # List all stuck/running jobs with details
npm run debug:last-job     # Show detailed info about the most recent job
npm run debug:reset-jobs   # Reset all stuck jobs to failed state
```

### Error Investigation
```bash
npm run debug:errors       # View recent Celery errors
npm run debug:screenshots  # List recent browser screenshots
npm run logs:worker        # Live worker logs
npm run logs:backend       # Live backend API logs
```

### System Recovery
```bash
npm run reset              # Full system reset (clears Redis, resets jobs, restarts services)
npm restart                # Quick restart of all services
```

## When Things Go Wrong

1. **Search not progressing?** → `npm run debug:jobs` to see job status, then `npm run debug:errors` for errors
2. **Workers not responding?** → `npm run debug:health` then `npm restart`
3. **Stuck jobs?** → `npm run debug:reset-jobs` to reset them to failed
4. **Need full picture?** → `npm run debug` shows everything at once
5. **Redis issues?** → `redis-cli FLUSHDB` clears stuck tasks, then `npm restart`
6. **Port conflicts?** → `npm run kill:port` kills processes on 3001/8000
7. **Complete failure?** → `npm run reset` (preserves database and .env)

## Testing and CI/CD

LitRevTool includes comprehensive testing infrastructure and CI/CD pipeline:

### Testing Framework
- **Backend**: pytest with coverage, async support, and mocking
- **Frontend**: Jest + React Testing Library
- **Code Quality**: black, isort, flake8, ESLint, prettier
- **Pre-commit Hooks**: Automated quality checks before commits

### Quick Start

```bash
# Backend tests
cd backend && pytest

# Frontend tests
cd frontend && npm test

# Run with coverage
pytest --cov=app --cov-report=html
npm run test:coverage

# Install pre-commit hooks
pip install pre-commit && pre-commit install
```

### CI/CD Pipeline (GitHub Actions)

Automated workflow runs on every push/PR:
- ✅ Unit, integration, and API tests
- ✅ Code quality checks (linting, formatting)
- ✅ Security scanning
- ✅ Coverage reporting
- ✅ Multi-version testing (Python 3.11, 3.12 / Node 18, 20)

### Documentation
- **[TESTING_QUICK_START.md](TESTING_QUICK_START.md)** - Quick reference for running tests
- **[docs/TESTING.md](docs/TESTING.md)** - Comprehensive testing guide
- **[docs/CICD_SETUP.md](docs/CICD_SETUP.md)** - CI/CD pipeline setup and configuration

## Additional Documentation

For more detailed information, see the following documentation in the `docs/` folder:

- **[docs/SETUP.md](docs/SETUP.md)** - Detailed installation and setup instructions
- **[docs/TESTING.md](docs/TESTING.md)** - **NEW**: Comprehensive testing guide with pytest and Jest
- **[docs/CICD_SETUP.md](docs/CICD_SETUP.md)** - **NEW**: CI/CD pipeline setup with GitHub Actions
- **[docs/MULTI_STRATEGY_SCRAPER.md](docs/MULTI_STRATEGY_SCRAPER.md)** - Multi-strategy scraping system (recommended reading)
- **[docs/DEPLOYMENT_SUMMARY.md](docs/DEPLOYMENT_SUMMARY.md)** - Architecture overview and deployment summary
- **[docs/PM2_COMMANDS.md](docs/PM2_COMMANDS.md)** - Complete PM2 service management commands
- **[docs/RESET.md](docs/RESET.md)** - System reset procedures and recovery
- **[docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md)** - Production deployment checklist and configuration
- **[docs/NGINX_SSL_SETUP.md](docs/NGINX_SSL_SETUP.md)** - Nginx reverse proxy and SSL/TLS setup
- **[docs/NPM_COMMANDS.md](docs/NPM_COMMANDS.md)** - All available npm commands reference
