# Deployment Guide - New Features

This document outlines the steps needed to deploy the new features added to LitRevTool.

## Summary of New Features

This branch includes several major enhancements:

1. **Semantic Score Column** - CSV exports now include a `Semantic_Score` column (1 = passed semantic filter, 0 = did not pass)
2. **Semantic Analysis Modes** - Choose between batch mode (10 papers per API call) or individual mode (1 paper per call)
3. **PRISMA Methodology Metrics** - Automatic tracking of systematic review stages (identification, screening, eligibility, inclusion)
4. **PRISMA Flow Diagrams** - Automatically generated SVG diagrams following PRISMA 2020 standards
5. **LaTeX Systematic Reviews** - AI-generated systematic review documents using Google Gemini
6. **BibTeX Citations** - Automatic generation of BibTeX reference files
7. **Pause/Resume Functionality** - Pause running jobs and resume them later from where they left off

## Prerequisites

Before deploying, ensure you have:

- Python 3.8+ with all dependencies installed
- Node.js 14+ and npm
- Redis server running
- PM2 process manager installed
- Google Gemini API key (already configured if you had semantic filtering)
- All services stopped before updating

## Deployment Steps

### 1. Stop All Services

```bash
npm stop
```

### 2. Pull the Latest Changes

```bash
git pull origin claude/add-semantic-analysis-column-011CUs9qGSrE3j9j3WbT4r3p
```

### 3. Update Backend Dependencies

The new features require no new Python dependencies (google-generativeai was already included).

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt  # Just to be safe
deactivate
cd ..
```

### 4. Update Frontend Dependencies

No new npm packages required, but rebuild to include new components:

```bash
cd frontend
npm install  # Just to be safe
npm run build  # For production
cd ..
```

### 5. Database Migration

**IMPORTANT**: The new features add several columns to the `search_jobs` table:

- `semantic_batch_mode` (Boolean, default True)
- `prisma_metrics` (JSON)
- `prisma_diagram_path` (String)
- `latex_file_path` (String)
- `bibtex_file_path` (String)

SQLAlchemy will attempt to auto-create these columns on startup. However, for safety:

#### Option A: Let SQLAlchemy Handle It (Recommended for Dev)
Simply restart the services and the columns will be added automatically.

#### Option B: Manual Migration (Recommended for Production)
Run this SQL to add the new columns if they don't exist:

```bash
cd backend
source venv/bin/activate
python3 << EOF
from app.db.session import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Add new columns if they don't exist
    try:
        conn.execute(text("ALTER TABLE search_jobs ADD COLUMN semantic_batch_mode BOOLEAN DEFAULT TRUE"))
        print("✓ Added semantic_batch_mode column")
    except Exception as e:
        print(f"semantic_batch_mode column already exists or error: {e}")

    try:
        conn.execute(text("ALTER TABLE search_jobs ADD COLUMN prisma_metrics JSON"))
        print("✓ Added prisma_metrics column")
    except Exception as e:
        print(f"prisma_metrics column already exists or error: {e}")

    try:
        conn.execute(text("ALTER TABLE search_jobs ADD COLUMN prisma_diagram_path VARCHAR"))
        print("✓ Added prisma_diagram_path column")
    except Exception as e:
        print(f"prisma_diagram_path column already exists or error: {e}")

    try:
        conn.execute(text("ALTER TABLE search_jobs ADD COLUMN latex_file_path VARCHAR"))
        print("✓ Added latex_file_path column")
    except Exception as e:
        print(f"latex_file_path column already exists or error: {e}")

    try:
        conn.execute(text("ALTER TABLE search_jobs ADD COLUMN bibtex_file_path VARCHAR"))
        print("✓ Added bibtex_file_path column")
    except Exception as e:
        print(f"bibtex_file_path column already exists or error: {e}")

    conn.commit()
    print("\n✓ Database migration completed!")

EOF
deactivate
cd ..
```

### 6. Verify Configuration

Ensure your `.env` file has the required configuration:

```bash
# Required for semantic filtering and LaTeX generation
GEMINI_API_KEY=your_gemini_api_key_here

# Other existing configurations
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SECRET_KEY=...
```

### 7. Create Upload Directories

Ensure the upload directories exist:

```bash
mkdir -p backend/uploads
mkdir -p backend/uploads/screenshots
```

### 8. Clear Redis Cache

Clear any cached tasks to avoid issues with old job formats:

```bash
redis-cli FLUSHDB
```

### 9. Restart All Services

```bash
npm start
```

### 10. Verify Services Are Running

```bash
npm run status
```

You should see:
- `litrev-backend` - online
- `litrev-celery` - online
- `litrev-frontend` - online

### 11. Check Logs

Monitor the logs to ensure no errors:

```bash
npm run logs
```

Or check individual services:

```bash
npm run logs:backend
npm run logs:celery
npm run logs:frontend
```

## Testing the New Features

### 1. Test Semantic Score Column

1. Create a new search job with semantic filtering enabled
2. Wait for completion
3. Download the CSV file
4. Verify the `Semantic_Score` column exists and contains 1s and 0s

### 2. Test Semantic Batch Mode

**Web UI:**
1. Create a new job
2. Enable semantic filtering
3. Toggle the "Batch Mode" switch (ON = batch, OFF = individual)
4. Check that the job completes successfully

**CLI:**
```bash
cd backend
source venv/bin/activate

# Test batch mode (default)
python cli_search.py "test search" -ki "machine learning" --semantic-include "deep learning" --years 2023 2023

# Test individual mode
python cli_search.py "test search individual" -ki "AI" --semantic-include "neural networks" --semantic-individual --years 2023 2023

deactivate
cd ..
```

### 3. Test PRISMA Metrics and Diagram

1. Create a search job
2. Wait for completion
3. Check that the Dashboard shows PRISMA metrics (green box)
4. Click "PRISMA Diagram" to download the SVG
5. Open the SVG in a browser to verify it's formatted correctly

### 4. Test LaTeX and BibTeX Generation

1. Create a search job that finds at least 5 papers
2. Wait for completion
3. Click "LaTeX" to download the .tex file
4. Click "BibTeX" to download the .bib file
5. Verify both files contain the expected content
6. (Optional) Compile the LaTeX with: `pdflatex review.tex && bibtex review && pdflatex review.tex`

### 5. Test Pause/Resume Functionality

**Web UI:**
1. Create a search job with a large year range (e.g., 2020-2023)
2. While it's running, click the "Pause" button (yellow/warning color)
3. Verify the job status changes to "paused" with a warning alert
4. Click the "Resume" button (blue/primary color)
5. Verify the job continues from where it left off

**API Testing:**
```bash
# Get a running job ID
JOB_ID="your-job-id-here"

# Pause the job
curl -X POST "http://localhost:8000/api/v1/jobs/${JOB_ID}/pause" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Resume the job
curl -X POST "http://localhost:8000/api/v1/jobs/${JOB_ID}/resume" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Issue: "Column already exists" errors
**Solution:** The database already has the new columns. This is fine, just continue.

### Issue: New columns not appearing
**Solution:**
1. Stop all services: `npm stop`
2. Restart backend: `npm run restart:backend`
3. Check logs: `npm run logs:backend`

### Issue: PRISMA diagram or LaTeX files not generating
**Solution:**
1. Check that `GEMINI_API_KEY` is set in `.env`
2. Check Celery logs: `npm run logs:celery`
3. Verify the upload directory is writable: `ls -la backend/uploads/`

### Issue: Pause button doesn't appear
**Solution:**
1. Clear browser cache
2. Restart frontend: `npm run restart:frontend`
3. Check browser console for JavaScript errors

### Issue: Resume doesn't work after pause
**Solution:**
1. Check Redis is running: `redis-cli ping`
2. Check Celery worker is running: `npm run status`
3. Check Celery logs for errors: `npm run logs:celery`

## Rollback Procedure

If you need to rollback to the previous version:

```bash
# Stop services
npm stop

# Rollback code
git checkout main  # or previous branch
git pull

# Clear Redis
redis-cli FLUSHDB

# Restart services
npm start
```

## API Changes Summary

### New API Endpoints

**Pause Job:**
- `POST /api/v1/jobs/{job_id}/pause`
- Requires: Job must be in "running" status
- Returns: Updated job with status="paused"

**Resume Job (Updated):**
- `POST /api/v1/jobs/{job_id}/resume`
- Now accepts: Jobs with status="failed" OR status="paused"
- Returns: Updated job with status="pending"

**Download PRISMA Diagram:**
- `GET /api/v1/jobs/{job_id}/prisma-diagram`
- Returns: SVG file

**Download LaTeX:**
- `GET /api/v1/jobs/{job_id}/latex`
- Returns: .tex file

**Download BibTeX:**
- `GET /api/v1/jobs/{job_id}/bibtex`
- Returns: .bib file

### Updated Response Schema

The `SearchJob` response now includes:

```json
{
  "semantic_batch_mode": true,
  "prisma_metrics": {
    "identification": {
      "records_identified": 100,
      "records_from_database": 100
    },
    "screening": {
      "records_after_duplicates_removed": 95,
      "records_screened": 95,
      "records_excluded_duplicates": 5
    },
    "eligibility": {
      "full_text_assessed": 95,
      "full_text_excluded_semantic": 15
    },
    "included": {
      "studies_included": 80
    }
  },
  "prisma_diagram_path": "/path/to/diagram.svg",
  "latex_file_path": "/path/to/review.tex",
  "bibtex_file_path": "/path/to/references.bib"
}
```

## Performance Considerations

### Batch Mode vs Individual Mode

- **Batch Mode (Default, Recommended):**
  - 10 papers per API call
  - ~10x faster
  - ~10x fewer API costs
  - Suitable for most use cases

- **Individual Mode:**
  - 1 paper per API call
  - Slower but more thorough
  - Higher API costs
  - Use when: precision is critical or papers are very diverse

### PRISMA Diagram Generation

- SVG generation is very fast (~100ms)
- No API calls required
- Minimal impact on job completion time

### LaTeX Generation

- Uses Gemini AI (1 API call per job)
- Adds ~2-5 seconds to job completion
- Automatically handles batches of any size

## Support and Questions

For issues or questions:

1. Check the logs: `npm run logs`
2. Run the debug commands: `npm run debug`
3. Check the GitHub issues or contact the maintainer

## Summary

After pulling these changes, you need to:

1. ✅ Stop services
2. ✅ Pull the branch
3. ✅ Clear Redis cache
4. ✅ Restart services
5. ✅ Test new features

The database will auto-migrate on startup, so no manual SQL is required unless you prefer explicit control.

All new features are backward compatible - existing jobs will continue to work, they just won't have the new fields populated.
