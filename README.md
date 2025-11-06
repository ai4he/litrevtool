# LitRevTool - Advanced Google Scholar Literature Review Tool

LitRevTool is a comprehensive web application for extracting and analyzing research papers from Google Scholar. It overcomes the 1000-paper limitation of tools like Publish or Perish by intelligently splitting searches and supports advanced semantic filtering using Google Gemini AI.

## Features

- **Unlimited Paper Extraction**: Overcome Google Scholar's 1000-paper limit by automatically splitting searches by year
- **Google OAuth Authentication**: Secure login with your Google account
- **Background Processing**: Searches run asynchronously with real-time progress tracking
- **Parallel Searches**: Run multiple searches simultaneously
- **Semantic Filtering**: Optional AI-powered filtering using Google Gemini API to understand paper content beyond keywords
- **Email Notifications**: Get notified when your searches complete
- **CSV Export**: Download results with title, authors, abstract, citations, and more
- **Fault Tolerance**: Automatically resume failed searches from checkpoints
- **Dashboard**: Monitor all your searches in a clean, intuitive interface

## Architecture

The application consists of the following components:

- **Frontend**: React + Material-UI dashboard
- **Backend API**: FastAPI (Python)
- **Database**: SQLite for storing users, jobs, and papers
- **Task Queue**: Celery + Redis for background scraping
- **Process Manager**: PM2 for service orchestration
- **Scraper**: Selenium-based Google Scholar scraper
- **AI Filter**: Google Gemini API for semantic filtering

## Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- Redis server
- PM2 (installed automatically by deployment script)
- Google OAuth 2.0 credentials (Client ID and Secret)
- (Optional) SMTP credentials for email notifications
- Google Gemini API key (already included: `AIzaSyDxAW82IQqw4TBb8Od0UvnXafGCYrkwyOU`)

## Quick Start

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" and create OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   - `http://localhost:8000/api/v1/auth/google/callback`
   - `http://localhost:3000`
6. Copy the Client ID and Client Secret

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Security
SECRET_KEY=your_secret_key_here_change_in_production

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### 3. Deploy the Application

**Option A: One-command deployment with npm**

```bash
npm run deploy
```

**Option B: Manual deployment steps**

```bash
# Install all dependencies
npm run install:all

# Initialize database
npm run setup:db

# Start all services
npm start
```

**Option C: Using deployment script directly**

```bash
# Make script executable (first time only)
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

The deployment process will:
- ✅ Check and validate all prerequisites (Python, Node.js, Redis, PM2)
- ✅ Set up Python virtual environment and install dependencies
- ✅ Install Node.js dependencies for the frontend
- ✅ Initialize the SQLite database
- ✅ Configure PM2 process manager
- ✅ Start all services (backend, celery, frontend)
- ✅ Perform health checks

After deployment, services will be running at:
- Frontend: http://localhost:3001
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Redis: localhost:6379

### 4. Access the Application

1. Open http://localhost:3001 in your browser
2. Click "Sign in with Google"
3. Create your first search!

## Service Management

All services are managed via npm scripts (powered by PM2):

```bash
# Start all services
npm start

# Stop all services
npm stop

# Restart all services
npm restart

# Check service status
npm run status

# View logs from all services
npm run logs

# View logs from specific service
npm run logs:frontend
npm run logs:backend
npm run logs:celery

# Monitor resource usage
npm run monit

# Full system reset (clear queues, kill stuck processes)
npm run reset
```

For detailed PM2 commands, see [docs/PM2_COMMANDS.md](docs/PM2_COMMANDS.md).

## Usage

### Creating a Search

1. Click "New Search" in the dashboard
2. Enter a search name (e.g., "Machine Learning 2020-2023")
3. Add inclusion keywords (e.g., "machine learning", "deep learning")
4. (Optional) Add exclusion keywords (e.g., "medical")
5. (Optional) Set year range (e.g., 2020-2023)
6. (Optional) Enable semantic filtering:
   - Inclusion criteria: "papers with practical applications"
   - Exclusion criteria: "purely theoretical papers"
7. Click "Start Search"

### Monitoring Progress

- The dashboard shows real-time progress for all your searches
- Status indicators: pending, running, completed, failed
- Progress bar shows percentage complete and papers collected
- Auto-refreshes every 5 seconds

### Downloading Results

- When a search completes, click "Download CSV"
- CSV contains: Title, Authors, Year, Source, Publisher, Citations, Abstract, URL
- Files are saved with the search name and ID

### Resuming Failed Searches

- If a search fails (network issues, CAPTCHA, etc.), click the play button to resume
- The search will continue from where it left off using checkpoints

## How It Overcomes the 1000-Paper Limit

Google Scholar typically returns a maximum of ~1000 results per query. LitRevTool overcomes this by:

1. **Year-based splitting**: If you search 2020-2023, it runs 4 separate searches (one per year)
2. **Pagination**: Extracts all available pages for each year (up to 1000 per year)
3. **Deduplication**: Automatically removes duplicate papers across years
4. **Result**: Can extract 4000+ papers for a 4-year range (1000 per year)

Example: Searching "machine learning" from 2020-2023 could yield:
- 2020: 1000 papers
- 2021: 1000 papers
- 2022: 1000 papers
- 2023: 1000 papers
- **Total: 4000 papers** (vs. 1000 with Publish or Perish)

## Semantic Filtering

The optional semantic filtering uses Google Gemini AI to understand paper content:

**Example Use Cases:**

1. **Focus on Applications**
   - Inclusion: "papers presenting practical applications or case studies"
   - Result: Filters out purely theoretical papers

2. **Exclude Specific Topics**
   - Exclusion: "medical or healthcare applications"
   - Result: Removes medical papers even if they match keywords

3. **Target Novel Research**
   - Inclusion: "papers introducing new methods or novel approaches"
   - Result: Focuses on innovative research

## Email Notifications

When configured, the application sends professional HTML emails when searches complete:
- Summary of results
- Direct download link
- Job statistics

To enable, add SMTP credentials to your `.env` file.

## API Documentation

Interactive API documentation is available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Key Endpoints

- `POST /api/v1/auth/google` - Authenticate with Google
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/jobs/` - Create search job
- `GET /api/v1/jobs/` - List all jobs
- `GET /api/v1/jobs/{job_id}` - Get job details
- `GET /api/v1/jobs/{job_id}/download` - Download CSV results
- `POST /api/v1/jobs/{job_id}/resume` - Resume failed job

## Project Structure

```
litrevtool/
├── backend/
│   ├── app/
│   │   ├── api/              # API endpoints
│   │   ├── core/             # Config and security
│   │   ├── db/               # Database session
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   │   ├── scholar_scraper.py    # Google Scholar scraper
│   │   │   ├── semantic_filter.py    # Gemini AI filtering
│   │   │   └── email_service.py      # Email notifications
│   │   ├── tasks/            # Celery tasks
│   │   └── main.py           # FastAPI app
│   ├── requirements.txt      # Python dependencies
│   ├── venv/                 # Python virtual environment
│   └── litrevtool.db         # SQLite database
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contexts/         # React contexts
│   │   ├── services/         # API client
│   │   └── App.js
│   └── package.json          # Node dependencies
├── docs/                     # Documentation
│   ├── SETUP.md             # Detailed setup guide
│   ├── PM2_COMMANDS.md      # PM2 management commands
│   └── RESET.md             # System reset guide
├── deploy.sh                 # Automated deployment script
├── ecosystem.config.js       # PM2 configuration
├── package.json             # npm scripts
└── README.md                # This file
```

## Troubleshooting

### CAPTCHA Issues

Google Scholar may show CAPTCHAs if scraping too aggressively. The scraper handles this by:
- Random delays between requests
- User-agent rotation
- Automatic retry with longer waits
- Checkpoint system to resume later

### Chrome/ChromeDriver Issues

If the scraper fails to start Chrome:

```bash
# Check Chrome installation
google-chrome --version

# Update webdriver
cd backend
source venv/bin/activate
pip install --upgrade selenium webdriver-manager
```

### Service Issues

```bash
# Check service status
npm run status

# View logs
npm run logs

# Full system reset
npm run reset
```

### Database Issues

```bash
# Backup database
cp backend/litrevtool.db backend/litrevtool.db.backup

# Reset database (WARNING: deletes all data)
rm backend/litrevtool.db
cd backend
source venv/bin/activate
python3 -c "from app.db.session import engine; from app.models import Base; Base.metadata.create_all(bind=engine)"
```

## Production Deployment

For production:

1. **Use a production domain** with HTTPS
2. **Change SECRET_KEY** in `.env` to a secure random string
3. **Use production SMTP** credentials
4. **Configure PM2 startup**:
   ```bash
   sudo pm2 startup
   pm2 save
   ```
5. **Set up nginx** as reverse proxy
6. **Scale workers** if needed (modify ecosystem.config.js)
7. **Set up automated backups** for SQLite database
8. **Configure rate limiting** on the API
9. **Monitor logs** regularly

For complete production deployment instructions, see [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md) and [docs/NGINX_SSL_SETUP.md](docs/NGINX_SSL_SETUP.md).

## Limitations

- Google Scholar may rate limit or CAPTCHA heavy usage
- Scraping speed limited to ~100-200 papers per minute (to be respectful)
- Semantic filtering requires Gemini API (quota limits may apply)
- Email notifications require SMTP configuration

## Comparison with Publish or Perish

| Feature | Publish or Perish | LitRevTool |
|---------|------------------|------------|
| Max Papers | 1000 | Unlimited (1000 per year) |
| Background Processing | No | Yes |
| Multiple Searches | No | Yes (parallel) |
| Semantic Filtering | No | Yes (AI-powered) |
| Email Notifications | No | Yes |
| Resume Failed Jobs | No | Yes |
| Web Interface | Desktop only | Web-based |

## Documentation

For detailed information, see the following documentation in the `docs/` folder:

- **[Setup Guide](docs/SETUP.md)** - Detailed installation and setup instructions
- **[Deployment Summary](docs/DEPLOYMENT_SUMMARY.md)** - Architecture overview and deployment summary
- **[PM2 Commands](docs/PM2_COMMANDS.md)** - Complete service management commands
- **[System Reset](docs/RESET.md)** - How to perform a full system reset
- **[Production Checklist](docs/PRODUCTION_CHECKLIST.md)** - Production deployment checklist and configuration
- **[Nginx SSL Setup](docs/NGINX_SSL_SETUP.md)** - Nginx reverse proxy and SSL/TLS configuration
- **[NPM Commands](docs/NPM_COMMANDS.md)** - All available npm commands reference

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is for educational and research purposes. Please respect Google Scholar's terms of service and use responsibly.

## Support

For issues or questions:
1. Check the [troubleshooting section](#troubleshooting)
2. Review the [setup guide](docs/SETUP.md)
3. Check logs: `npm run logs`
4. Open an issue on GitHub

## Acknowledgments

- Built with FastAPI, React, and Selenium
- Powered by Google Gemini AI
- Process management by PM2
- Inspired by Publish or Perish by Anne-Wil Harzing
