# PM2 Service Management Commands

This document describes how to manage all LitRevTool services using npm scripts.

## Quick Start Commands

### Start all services
```bash
npm start
```
Starts all three services (backend, celery, frontend) using PM2.

### Stop all services
```bash
npm stop
```
Stops all running services without deleting them from PM2.

### Restart all services
```bash
npm restart
```
Restarts all services. Use this after configuration changes.

### Reload all services (zero-downtime)
```bash
npm run reload
```
Reloads services with zero downtime (useful for production updates).

### Delete all services from PM2
```bash
npm run delete
```
Removes all services from PM2 process list.

## Status & Monitoring Commands

### Check service status
```bash
npm run status
```
Shows the status of all PM2 processes.

### View all logs
```bash
npm run logs
```
Displays live logs from all services.

### View specific service logs
```bash
npm run logs:frontend    # Frontend logs only
npm run logs:backend     # Backend logs only
npm run logs:celery      # Celery worker logs only
```

### Monitor resource usage
```bash
npm run monit
```
Opens PM2 monitoring dashboard showing CPU and memory usage.

### Save PM2 process list
```bash
npm run save
```
Saves current PM2 process list (auto-resurrects on reboot).

## Troubleshooting Commands

### Kill port 3001 and restart
```bash
npm run clean:restart
```
Kills any process holding port 3001 and restarts all services.

### Manual port cleanup
```bash
npm run kill:port
```
Kills any process using port 3001.

## Direct PM2 Commands

You can also use PM2 commands directly:

```bash
pm2 status                    # Check status
pm2 restart litrev-frontend   # Restart specific service
pm2 logs litrev-backend       # View backend logs
pm2 stop all                  # Stop all services
pm2 delete all                # Delete all services
```

## Log Files

Service logs are stored in:
- Frontend: `/home/ubuntu/litrevtool/frontend/logs/`
- Backend: `/home/ubuntu/litrevtool/backend/logs/`
- Celery: `/home/ubuntu/litrevtool/backend/logs/`

## Service URLs

- Frontend: https://litrev.haielab.org
- Backend API: https://litrev.haielab.org/api
- Health Check: https://litrev.haielab.org/health
