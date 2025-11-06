# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LitRevTool is a literature review tool that overcomes Google Scholar's 1000-paper limit by automatically splitting searches by year and running them in parallel. It consists of a React frontend, FastAPI backend, and Celery task queue for background scraping.

**Key Differentiator**: Can extract 1000 papers per year (e.g., 4000 papers for 2020-2023 vs. Publish or Perish's 1000 paper limit) by splitting searches by year and using intelligent pagination.

## Architecture

### Stack
- **Frontend**: React + Material-UI (port 3001)
- **Backend**: FastAPI + SQLAlchemy (port 8000)
- **Database**: SQLite (backend/litrevtool.db)
- **Task Queue**: Celery + Redis
- **Process Manager**: PM2 manages all services
- **Scraper**: Playwright-based Google Scholar scraper with Tor support

### Service Layout
Three PM2-managed services defined in `ecosystem.config.js`:
1. `litrev-backend` - Uvicorn running FastAPI app
2. `litrev-celery` - Celery worker processing scraping tasks
3. `litrev-frontend` - React dev server

## Critical Commands

### Development Workflow
```bash
# Deploy/redeploy entire application
npm run deploy              # or ./deploy.sh

# Service management
npm start                   # Start all services
npm stop                    # Stop all services
npm restart                 # Restart all services
npm run status              # Check PM2 service status

# Logs and monitoring
npm run logs                # All service logs
npm run logs:backend        # Backend only
npm run logs:celery         # Celery only
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
4. `GoogleScholarScraper` initializes Playwright browser with optional Tor
5. **Year splitting**: If year range specified (e.g., 2020-2023), creates 4 separate searches
6. For each year: paginate through all results (up to ~1000 per year)
7. Optional: `SemanticFilter` uses Gemini AI to filter papers based on inclusion/exclusion criteria
8. Papers saved to database with deduplication
9. Export to CSV in `backend/uploads/`
10. `EmailService` sends completion notification
11. Job status updated to "completed" or "failed"

### Key Files to Know
- `ecosystem.config.js` - PM2 configuration (service definitions, env vars, log paths)
- `.env` - Environment variables (Google OAuth credentials, SMTP, Gemini API key)
- `backend/litrevtool.db` - SQLite database (auto-created)
- `backend/uploads/` - CSV exports and screenshots
- `deploy.sh` - Automated deployment script with prerequisite checks

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
- **SearchJob**: id, user_id, name, search_query, year_from, year_to, include_keywords, exclude_keywords, semantic_include, semantic_exclude, status (pending/running/completed/failed), papers_collected, status_message, celery_task_id, csv_file_path, created_at, started_at, completed_at
- **Paper**: id, job_id, title, authors, year, source, publisher, citations, abstract, url, created_at

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
3. Check logs for SMTP errors: `npm run logs:celery`

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
6. Check logs: `npm run logs:celery`
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
npm run logs:celery        # Live Celery worker logs
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

## Additional Documentation

For more detailed information, see the following documentation in the `docs/` folder:

- **[docs/SETUP.md](docs/SETUP.md)** - Detailed installation and setup instructions
- **[docs/DEPLOYMENT_SUMMARY.md](docs/DEPLOYMENT_SUMMARY.md)** - Architecture overview and deployment summary
- **[docs/PM2_COMMANDS.md](docs/PM2_COMMANDS.md)** - Complete PM2 service management commands
- **[docs/RESET.md](docs/RESET.md)** - System reset procedures and recovery
- **[docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md)** - Production deployment checklist and configuration
- **[docs/NGINX_SSL_SETUP.md](docs/NGINX_SSL_SETUP.md)** - Nginx reverse proxy and SSL/TLS setup
- **[docs/NPM_COMMANDS.md](docs/NPM_COMMANDS.md)** - All available npm commands reference
