# Deployment Summary

## Current Architecture

LitRevTool has been refactored to use the following stack:

### Backend
- **Language**: Python 3.8+
- **Framework**: FastAPI
- **Database**: SQLite (litrevtool.db)
- **Task Queue**: Celery + Redis
- **Process Manager**: PM2

### Frontend
- **Framework**: React + Material-UI
- **Build Tool**: Create React App
- **Process Manager**: PM2

### Removed Technologies
- ❌ Docker / Docker Compose
- ❌ PostgreSQL
- ❌ Node.js backend

## Quick Start

### Prerequisites Installation
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3 python3-pip python3-venv nodejs npm redis-server

# macOS
brew install python node redis

# Start Redis
sudo systemctl start redis-server  # Linux
brew services start redis           # macOS
```

### Deployment

**Option A: One-command deployment with npm**
```bash
npm run deploy
```

**Option B: Step-by-step deployment**
```bash
npm run install:all    # Install all dependencies
npm run setup:db       # Initialize database
npm start              # Start services
```

**Option C: Direct script execution**
```bash
./deploy.sh
```

The deployment process automatically:
1. ✅ Validates prerequisites (Python, Node.js, Redis, PM2)
2. ✅ Creates Python virtual environment
3. ✅ Installs all dependencies
4. ✅ Initializes SQLite database
5. ✅ Starts all services with PM2
6. ✅ Performs health checks

### Service Management
```bash
npm run deploy         # Full deployment
npm run install:all    # Install dependencies only
npm run setup:db       # Initialize/reset database
npm start              # Start all services
npm stop               # Stop all services
npm restart            # Restart all services
npm run status         # Check status
npm run logs           # View logs
npm run reset          # Full system reset
```

## Documentation Structure

All documentation has been reorganized into the `docs/` directory:

```
litrevtool/
├── README.md                 # Main documentation
├── deploy.sh                 # Automated deployment script
├── .env.example             # Environment configuration template
└── docs/
    ├── SETUP.md             # Detailed setup guide
    ├── PM2_COMMANDS.md      # Service management commands
    └── RESET.md             # System reset guide
```

## Key Files

### Configuration
- `.env` - Environment variables (Google OAuth, SMTP, etc.)
- `ecosystem.config.js` - PM2 process configuration
- `backend/app/core/config.py` - Application settings

### Deployment
- `deploy.sh` - Automated deployment script
- `package.json` - npm scripts for service management
- `backend/requirements.txt` - Python dependencies
- `frontend/package.json` - React dependencies

## Environment Configuration

Required environment variables in `.env`:

```bash
# Required
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
SECRET_KEY=random_32_char_string

# Optional
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

See `.env.example` for complete configuration options.

## Services

After deployment, the following services run under PM2:

1. **litrev-backend** - FastAPI backend (port 8000)
2. **litrev-celery** - Celery worker for background tasks
3. **litrev-frontend** - React development server (port 3001)

Access points:
- Frontend: http://localhost:3001
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Database

The application uses SQLite with automatic schema management:
- Database file: `backend/litrevtool.db`
- Automatic creation on first run
- Database-agnostic code (can support PostgreSQL if needed)

### Backup Database
```bash
cp backend/litrevtool.db backend/litrevtool.db.backup
```

## Production Deployment

For production:

1. **Environment**: Update `.env` with production values
2. **PM2 Startup**: Configure auto-start on boot
   ```bash
   sudo pm2 startup
   pm2 save
   ```
3. **Nginx**: Set up reverse proxy for HTTPS
4. **Monitoring**: Use `pm2 monit` or `pm2 plus`
5. **Backups**: Set up automated database backups

See `docs/SETUP.md` for detailed production setup instructions.

## Troubleshooting

### Common Issues

**Services won't start:**
```bash
npm run reset
```

**Port conflicts:**
```bash
npm run kill:port
npm restart
```

**Check logs:**
```bash
npm run logs
npm run logs:backend
npm run logs:celery
```

**Database issues:**
```bash
# Backup and recreate
cp backend/litrevtool.db backend/litrevtool.db.backup
rm backend/litrevtool.db
./deploy.sh
```

## Migration from Docker

If you're migrating from the Docker version:

1. **Stop Docker containers:**
   ```bash
   docker-compose down
   ```

2. **Backup data:**
   ```bash
   # Backup PostgreSQL (if applicable)
   docker-compose exec db pg_dump -U litrevtool litrevtool > backup.sql
   ```

3. **Deploy new version:**
   ```bash
   ./deploy.sh
   ```

4. **Migrate data (if needed):**
   - SQLite is used instead of PostgreSQL
   - User data: Re-authenticate via Google OAuth
   - Paper data: Export from old system, reimport searches

## Support

- **Documentation**: See `docs/` directory
- **Logs**: `npm run logs`
- **Status**: `npm run status`
- **Reset**: `npm run reset`

## Version History

- **v1.0** - Initial Docker-based deployment (PostgreSQL + Node backend)
- **v2.0** - Current: PM2-based deployment (SQLite + Python backend)

---

For detailed setup instructions, see [docs/SETUP.md](docs/SETUP.md)
