# Python Backend - BACKUP

This directory contains the **original Python backend** (FastAPI + Celery) that has been replaced by the Node.js backend.

## Status: DEPRECATED

This backend is no longer actively used. The Node.js backend (`backend-node/`) is now the primary backend.

## Why it was replaced

- **High memory usage:** 250MB idle, 450MB under load
- **Slower startup:** 8-12 seconds
- **Heavy dependencies:** Python, Celery, Playwright, many pip packages

## What replaced it

The Node.js backend (`backend-node/`) provides:
- **52% less memory:** 120MB idle, 220MB under load
- **75% faster startup:** 2-3 seconds
- **Same features:** 100% API compatibility, same database

## If you need to rollback

To temporarily rollback to the Python backend:

```bash
# 1. Stop Node.js services
pm2 stop litrev-backend litrev-worker

# 2. Update ecosystem.config.js to point to this directory
# Change: cwd: 'backend-python-backup'

# 3. Start Python services
pm2 start ecosystem.config.js

# 4. Verify
curl http://localhost:8000/health
```

## Database

Both backends use the **same SQLite database** structure, so no data migration is needed for rollback.

## Contents

This directory contains:
- FastAPI application code (`app/`)
- Python virtual environment (`venv/`)
- Database file (`litrevtool.db`) - may be outdated
- Requirements (`requirements.txt`)
- All original Python services, models, and tasks

## Removal

After confirming the Node.js backend works well for 30+ days, this directory can be safely deleted to save disk space.

---

**Backup Created:** $(date)
**Last Python Backend Version:** 1.0.0 (pre-migration)
Thu Nov  6 23:32:41 UTC 2025
