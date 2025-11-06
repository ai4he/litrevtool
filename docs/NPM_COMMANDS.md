# NPM Deployment Commands

This document lists all available npm commands for deploying and managing LitRevTool.

## Quick Start

```bash
# One-command deployment
npm run deploy
```

This runs the full deployment script which:
- Checks prerequisites
- Installs all dependencies
- Initializes database
- Starts all services
- Performs health checks

## Deployment Options

### Option A: One-Command Deployment (Recommended)
```bash
npm run deploy
```
Runs the complete `deploy.sh` script with all checks and setup.

### Option B: Step-by-Step Deployment
```bash
# 1. Install all dependencies
npm run install:all

# 2. Initialize database
npm run setup:db

# 3. Start services
npm start
```

### Option C: Direct Script
```bash
./deploy.sh
```

## All Available Commands

### Deployment & Setup
| Command | Description |
|---------|-------------|
| `npm run deploy` | Full automated deployment |
| `npm run install:all` | Install Python and Node.js dependencies |
| `npm run setup:db` | Initialize/reset SQLite database |

### Service Management
| Command | Description |
|---------|-------------|
| `npm start` | Start all services with PM2 |
| `npm stop` | Stop all services |
| `npm restart` | Restart all services |
| `npm run reload` | Zero-downtime reload |
| `npm run delete` | Remove all services from PM2 |
| `npm run status` | Check status of all services |

### Monitoring & Logs
| Command | Description |
|---------|-------------|
| `npm run logs` | View logs from all services |
| `npm run logs:backend` | View backend API logs only |
| `npm run logs:celery` | View Celery worker logs only |
| `npm run logs:frontend` | View frontend logs only |
| `npm run monit` | Open PM2 monitoring dashboard |
| `npm run monitor` | Detailed system status (CPU, memory, ports) |

### Maintenance
| Command | Description |
|---------|-------------|
| `npm run reset` | Full system reset (clear queues, kill processes, restart) |
| `npm run clean:restart` | Kill port conflicts and restart |
| `npm run kill:port` | Kill process on port 3001 |
| `npm run save` | Save PM2 process list for auto-restart |

## Common Workflows

### Initial Deployment
```bash
# Configure environment
cp .env.example .env
# Edit .env with your Google OAuth credentials

# Deploy
npm run deploy
```

### Daily Operations
```bash
# Check status
npm run status

# View logs
npm run logs

# Restart if needed
npm restart
```

### Troubleshooting
```bash
# If services are stuck
npm run reset

# If port conflicts
npm run clean:restart

# View specific logs
npm run logs:backend
npm run logs:celery
```

### Production Setup
```bash
# Deploy
npm run deploy

# Save configuration for auto-start
npm run save
sudo pm2 startup
```

## Differences Between Commands

### `npm run deploy` vs `npm run install:all`
- **`npm run deploy`**: Full deployment including checks, installation, database setup, and service start
- **`npm run install:all`**: Only installs dependencies, doesn't start services

### `npm restart` vs `npm run reset`
- **`npm restart`**: Simple restart of PM2 services
- **`npm run reset`**: Complete system cleanup including Redis flush, process cleanup, and database job reset

### `npm run logs` vs `npm run monit`
- **`npm run logs`**: Text-based log output
- **`npm run monit`**: Interactive PM2 dashboard with CPU/memory graphs

## Environment Requirements

Before running deployment commands, ensure:
- ✅ Python 3.8+ installed
- ✅ Node.js 16+ installed
- ✅ Redis server installed and running
- ✅ `.env` file configured with Google OAuth credentials

## Port Usage

Default ports used by services:
- **Frontend**: 3001
- **Backend**: 8000
- **Redis**: 6379

If ports are in use, modify:
- `ecosystem.config.js` for backend/frontend ports
- Redis configuration for Redis port

## Auto-Start on System Boot

To make services start automatically on system boot:

```bash
# Deploy first
npm run deploy

# Save PM2 configuration
npm run save

# Configure system startup
sudo pm2 startup

# Follow the displayed command
```

## Help

For more information:
- Main documentation: [README.md](README.md)
- Setup guide: [docs/SETUP.md](docs/SETUP.md)
- PM2 details: [docs/PM2_COMMANDS.md](docs/PM2_COMMANDS.md)
- System reset: [docs/RESET.md](docs/RESET.md)
