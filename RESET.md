# System Reset Guide

## Overview
The `npm run reset` command performs a complete system reset to ensure a clean state for new job executions. This is useful when:
- Jobs get stuck in "pending" or "running" state
- Celery tasks are blocked or corrupted
- System resources (browser processes, screenshots) need cleanup
- You want to start fresh after encountering errors

## What the Reset Does

### 1. Stop All PM2 Processes
Gracefully stops all running PM2 services (backend, celery, frontend)

### 2. Kill Stuck Processes
Force-kills any processes still holding ports 3001 (frontend) and 8000 (backend)

### 3. Clear Celery Queue
Flushes the Redis database to remove all pending/active Celery tasks
- Removes task queue
- Clears task results
- Resets worker state

### 4. Clean Browser Processes
Kills any orphaned Playwright/Chromium processes that may be consuming resources

### 5. Clear Screenshots
Deletes old screenshots from `backend/uploads/screenshots/`
- **Note**: Paper data and database remain intact

### 6. Clear PM2 Logs
Flushes all PM2 logs for clean log files

### 7. Reset Stuck Jobs
Updates any jobs with status "pending" or "running" to "failed" in the database
- Sets status_message to "Reset by system cleanup"
- Clears celery_task_id references
- Allows jobs to be manually resubmitted if needed

### 8. Restart Services
Starts all services fresh with clean state

### 9. Health Check
Verifies that all services are responding:
- Backend API (port 8000)
- Frontend (port 3001)
- Redis (port 6379)

## Usage

```bash
npm run reset
```

## Expected Output

```
🔄 Starting full system reset...

1️⃣  Stopping all PM2 processes...
[PM2 output...]

2️⃣  Killing any stuck processes on ports 3001, 8000...

3️⃣  Clearing Celery task queue and results in Redis...
OK

4️⃣  Cleaning up any orphaned Playwright/Chromium processes...

5️⃣  Clearing old screenshots (keeping DB data)...

6️⃣  Clearing PM2 logs...

7️⃣  Resetting any stuck search jobs to failed state...
Reset 2 stuck jobs

8️⃣  Starting all services fresh...
[PM2 output...]

9️⃣  Verifying services...
[PM2 status table...]

✅ Reset complete! System ready for new executions.

📊 Quick health check:
  ✓ Backend API responding
  ✓ Frontend responding
  ✓ Redis responding
```

## When to Use Reset

### Recommended Scenarios:
- **Before starting a new job** after previous failures
- **Job stuck in pending** for more than 5 minutes
- **Job stuck in running** but no progress is being made
- **High memory usage** from orphaned browser processes
- **Celery worker errors** in logs
- **After system crash** or unexpected shutdown

### What is NOT Affected:
- ✅ Database data (users, papers, job history)
- ✅ CSV export files
- ✅ Configuration files
- ✅ Python virtual environment
- ✅ Node modules

### What IS Cleared:
- ❌ Pending Celery tasks in queue
- ❌ Running browser processes
- ❌ Screenshot files
- ❌ PM2 logs
- ❌ Jobs with "pending" or "running" status (changed to "failed")

## Troubleshooting

### Reset Script Fails
If the reset script encounters errors:

```bash
# Manual reset steps:
pm2 stop all
redis-cli FLUSHDB
pkill -f chromium
pm2 start ecosystem.config.js
```

### Jobs Still Stuck After Reset
If jobs remain stuck after reset:

```bash
# Check celery logs
pm2 logs litrev-celery --lines 50

# Manually mark job as failed in database
cd backend
source venv/bin/activate
python3 -c "from app.db.session import SessionLocal; from app.models import SearchJob; db = SessionLocal(); job = db.query(SearchJob).filter(SearchJob.id == 'JOB_ID_HERE').first(); job.status = 'failed'; db.commit(); db.close()"
```

### Services Not Starting
If services don't start after reset:

```bash
# Check individual service logs
pm2 logs litrev-backend --lines 20
pm2 logs litrev-celery --lines 20
pm2 logs litrev-frontend --lines 20

# Restart specific service
pm2 restart litrev-backend
pm2 restart litrev-celery
```

## Related Commands

- `npm run monitor` - View system status and resource usage
- `npm run status` - Check PM2 process status
- `npm run logs` - View all logs
- `npm run logs:celery` - View celery worker logs only
- `npm run restart` - Restart services (without cleanup)

## Safety

The reset script is designed to be safe and idempotent:
- Can be run multiple times without harm
- Does not delete user data or paper database
- Preserves CSV export files
- Always performs health checks after reset

## Performance

The reset typically takes 10-15 seconds to complete.
