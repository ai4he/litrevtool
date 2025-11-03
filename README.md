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
- **Database**: PostgreSQL for storing users, jobs, and papers
- **Task Queue**: Celery + Redis for background scraping
- **Scraper**: Selenium-based Google Scholar scraper
- **AI Filter**: Google Gemini API for semantic filtering

## Prerequisites

- Docker and Docker Compose
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

### 3. Start the Application

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d
```

This will start:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Celery Flower (task monitoring): http://localhost:5555
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### 4. Access the Application

1. Open http://localhost:3000 in your browser
2. Click "Sign in with Google"
3. Create your first search!

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

## Development

### Project Structure

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
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contexts/         # React contexts
│   │   ├── services/         # API client
│   │   └── App.js
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

### Running Tests

The scraper can be tested independently:

```bash
# Enter the backend container
docker-compose exec backend bash

# Run scraper test
python -m app.services.scholar_scraper
```

### Monitoring Celery Tasks

Access Flower at http://localhost:5555 to monitor:
- Active tasks
- Task history
- Worker status
- Task details and logs

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
docker-compose exec worker google-chrome --version

# Rebuild worker container
docker-compose up -d --build worker
```

### Database Connection Issues

```bash
# Check database status
docker-compose exec db pg_isready

# Reset database
docker-compose down -v
docker-compose up -d
```

## Production Deployment

For production:

1. **Change SECRET_KEY** in `.env` to a secure random string
2. **Use production SMTP** credentials
3. **Enable HTTPS** (use nginx reverse proxy)
4. **Scale workers**: `docker-compose up -d --scale worker=4`
5. **Set up backups** for PostgreSQL
6. **Configure rate limiting** on the API
7. **Use cloud storage** for CSV files (S3, GCS)

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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is for educational and research purposes. Please respect Google Scholar's terms of service and use responsibly.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review logs: `docker-compose logs backend` or `docker-compose logs worker`
3. Open an issue on GitHub

## Acknowledgments

- Built with FastAPI, React, and Selenium
- Powered by Google Gemini AI
- Inspired by Publish or Perish by Anne-Wil Harzing