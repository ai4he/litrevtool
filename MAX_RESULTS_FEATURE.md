# Maximum Results Feature

**Date**: November 6, 2025
**Status**: ✅ Implemented and Deployed

## Overview

Added a "Maximum Results" field to the web application that allows users to control when the scraper stops collecting papers.

## Behavior

- **With value**: Scraper stops when it reaches the specified number of papers
- **Empty/null**: Scraper continues until all available results are collected (up to Google Scholar's limits)

## Changes Made

### 1. Database Schema (`backend/app/models/search_job.py`)
- Added `max_results` column to `search_jobs` table
- Type: `Integer`, nullable (null = unlimited)

### 2. API Schema (`backend/app/schemas/search_job.py`)
- Added `max_results` field to `SearchJobCreate` (for job creation)
- Added `max_results` field to `SearchJob` (for responses)

### 3. API Endpoint (`backend/app/api/search_jobs.py`)
- Updated job creation to accept and store `max_results` parameter

### 4. Scraping Task (`backend/app/tasks/scraping_tasks.py`)
- Updated `run_search_job` to pass `max_results` to scraper
- The scraper logic already supported this parameter

### 5. Frontend (`frontend/src/components/CreateJobDialog.js`)
- Added "Maximum Results" text field
- Positioned after year fields, before semantic filtering
- Includes helper text explaining behavior
- Form validation: optional integer field

## Technical Implementation

The multi-strategy scraper (`backend/app/services/multi_strategy_scraper.py`) already had `max_results` logic implemented in all strategies:

- **ScholarlyStrategy**: Checks max_results at page and result level
- **RequestsStrategy**: Checks max_results at year, page, and paper level (lines 468, 478, 516)
- **PlaywrightStrategy**: Checks max_results during pagination

### How It Works

```python
# In RequestsStrategy
for year in years:
    if max_results and len(all_papers) >= max_results:
        break  # Stop collecting more years

    while True:  # Paginate
        if max_results and len(all_papers) >= max_results:
            break  # Stop pagination

        # Collect papers from page
        for paper in papers:
            all_papers.append(paper)
            if max_results and len(all_papers) >= max_results:
                break  # Stop collecting this page
```

## Testing

### Database Verification
```bash
cd backend
source venv/bin/activate
python3 << 'EOF'
from app.db.session import SessionLocal
from sqlalchemy import text
db = SessionLocal()
result = db.execute(text("PRAGMA table_info(search_jobs)")).fetchall()
columns = [row[1] for row in result]
print('max_results' in columns)  # Should print True
db.close()
EOF
```

### API Testing
Create a job via web UI with max_results set to test the feature.

## Usage Examples

### Web Interface

1. Click "Create New Search"
2. Fill in search parameters
3. **Optional**: Enter a number in "Maximum Results" field
   - Example: `50` - Stops after collecting 50 papers
   - Leave empty - Collects all available papers
4. Click "Start Search"

### CLI Tool

The CLI tool already supported this feature via `--max-results` flag:

```bash
npm run cli -- --include "AI" --start-year 2023 --max-results 50
```

## Benefits

1. **Faster Testing**: Limit results during development/testing
2. **Cost Control**: Stop scraping early if API costs are a concern
3. **Preview Mode**: Collect a sample before running full search
4. **Resource Management**: Limit database growth for large searches

## Notes

- The scraper respects this limit across all strategies (Scholarly, Requests, Playwright)
- Deduplication happens before checking max_results
- Progress percentage is calculated based on max_results if provided
- If max_results is reached, the job completes successfully with that number of papers

## Migration

The database migration was handled automatically:
- Added `max_results INTEGER` column to existing `search_jobs` table
- Existing jobs have `NULL` for max_results (unlimited behavior)
- No data loss or downtime required

## Deployment

✅ Backend: Restarted
✅ Celery: Restarted
✅ Frontend: Auto-reloads in development
✅ Database: Schema updated
✅ Git: Committed and pushed

## Related Files

- `backend/app/models/search_job.py`
- `backend/app/schemas/search_job.py`
- `backend/app/api/search_jobs.py`
- `backend/app/tasks/scraping_tasks.py`
- `backend/app/services/multi_strategy_scraper.py` (already implemented)
- `frontend/src/components/CreateJobDialog.js`
