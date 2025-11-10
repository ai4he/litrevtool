# LitRevTool - Complete LLM Implementation Specification

## Project Overview & Problem Statement

Build a comprehensive literature review tool called **LitRevTool** that solves Google Scholar's 1000-paper limit by implementing intelligent year-based search splitting and parallel processing.

### Core Problem
- Google Scholar limits results to ~1000 papers per search
- Researchers need to collect more papers for comprehensive literature reviews
- Manual search splitting is time-consuming and error-prone

### Solution Approach
- **Automatically split searches by year** (e.g., 2020-2023 → 4 separate searches)
- **Extract up to 1000 papers per year** through intelligent pagination
- **Run searches in parallel** for efficiency
- **Deduplicate results** across year-split searches
- **Generate publication-ready outputs** (CSV, PRISMA diagrams, LaTeX, BibTeX)

### Key Differentiator
Can extract **4000+ papers** for a 4-year range vs. competitors like "Publish or Perish" which are limited to 1000 total papers.

---

## Architecture & Technology Stack

### Multi-Platform Architecture
Build **ONE React application** that deploys to **FOUR platforms**:

1. **Web Application** (browser-based)
2. **Desktop Application** (Electron wrapper - Windows, macOS, Linux)
3. **Mobile Application** (Capacitor wrapper - iOS, Android)
4. **CLI Tool** (Node.js command-line interface)

**Critical Pattern**: Write the React frontend once, wrap it three different ways (browser, Electron, Capacitor), plus separate CLI.

### Technology Stack

**Backend (Node.js + TypeScript)**
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: SQLite with Sequelize ORM
- **Task Queue**: BullMQ (Redis-based)
- **Process Manager**: PM2 (manages backend, worker, frontend)
- **Scraping**: Playwright (browser automation)
- **API Documentation**: Auto-generated Swagger/OpenAPI

**Frontend (React)**
- **Framework**: React 18.2+
- **UI Library**: Material-UI (MUI) v5
- **State Management**: React Context API
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Authentication**: Google OAuth 2.0 (@react-oauth/google)

**Mobile (Capacitor)**
- **Framework**: Capacitor 5.6+
- **Platforms**: iOS, Android
- **Native Plugins**: App, SplashScreen, StatusBar, Google Auth

**Desktop (Electron)**
- **Framework**: Electron 28+
- **Builder**: electron-builder
- **Platforms**: Windows, macOS, Linux (installers and portable apps)

**CLI (Node.js)**
- **Framework**: Commander.js
- **UI**: Chalk (colors), Ora (spinners), Inquirer (prompts), CLI-Table3 (tables)
- **Configuration**: Conf (persistent config storage)

**Infrastructure**
- **Task Queue**: Redis + BullMQ
- **Process Management**: PM2 with ecosystem config
- **Reverse Proxy**: Nginx (production)
- **SSL**: Let's Encrypt
- **Email**: Nodemailer (SMTP)
- **AI Integration**: Google Gemini API (semantic filtering)

---

## Core Features & Functionality

### 1. Authentication System
**Implementation**: Google OAuth 2.0

**Features**:
- Social login with Google
- JWT token-based session management
- User profile storage (email, name, picture, google_id)
- OAuth callback handling
- Token refresh mechanism

**Redirect URIs**:
- Development: `http://localhost:8000/api/v1/auth/google/callback`
- Production: `https://yourdomain.com/api/v1/auth/google/callback`

### 2. Search Job Management

**User Workflow**:
1. User creates search job via web UI or CLI
2. Specify search parameters:
   - Job name
   - Include keywords (required, array)
   - Exclude keywords (optional, array)
   - Year range (e.g., 2020-2023)
   - Max results per year (default: 1000)
   - Semantic filtering criteria (optional)
   - LaTeX generation flag

3. Job is queued with status "pending"
4. Background worker processes job
5. Real-time progress updates (polling every 5 seconds)
6. Email notification on completion
7. Download results in multiple formats

**Job Lifecycle States**:
- `pending` → `running` → `completed` | `failed` | `paused`

### 3. Multi-Strategy Scraping System

**Critical Feature**: Implement a resilient multi-strategy scraper with automatic fallback.

**Strategy Hierarchy** (try in order):

1. **PRIMARY: Playwright Browser Automation**
   - Most reliable for Google Scholar
   - Handles JavaScript-rendered content
   - Takes screenshots for debugging
   - CAPTCHA detection and pausing
   - Random delays (2-5 seconds) for rate limiting
   - User agent rotation

2. **FALLBACK 1: Direct HTTP Requests**
   - Lightweight, faster than browser
   - User agent rotation
   - Rate limiting with delays
   - Cheerio for HTML parsing

3. **FALLBACK 2: Scholarly Library** (if Python backend)
   - Specialized for Google Scholar
   - Built-in Tor support
   - Handles pagination automatically

**Year-Based Search Splitting**:
```javascript
// Example: Search "machine learning" from 2020-2023
// System automatically creates 4 separate searches:
// 1. "machine learning" year:2020
// 2. "machine learning" year:2021
// 3. "machine learning" year:2022
// 4. "machine learning" year:2023
// Each search can yield ~1000 papers = 4000 total
```

**Pagination Strategy**:
- Start at page 0
- Increment by 10 (Google Scholar default)
- Continue until: no more results, reached max_results, or CAPTCHA detected
- Save checkpoint after each page
- Support job resumption from last checkpoint

**CAPTCHA Handling**:
- Detect CAPTCHA presence on page
- Take screenshot and save to `uploads/screenshots/`
- Pause job with status message
- Email user about CAPTCHA
- User can resume job manually

**Rate Limiting & Politeness**:
- Random delays between requests: 2-5 seconds
- Respect robots.txt
- User agent rotation
- Screenshot monitoring for debugging

### 4. Semantic Filtering (AI-Powered)

**Integration**: Google Gemini API

**Features**:
- **Inclusion criteria**: Papers must match these criteria
- **Exclusion criteria**: Papers matching these are filtered out
- **Two modes**:
  - **Batch Mode**: Process all papers at once (faster, cheaper)
  - **Individual Mode**: Process one-by-one (more accurate)
- Scoring: 1-10 relevance score per paper
- Rationale: AI explains why paper was included/excluded

**Implementation**:
- Run AFTER scraping completes (avoid API rate limits during scraping)
- Store semantic_score and semantic_rationale in database
- Include in CSV export

**Prompt Engineering**:
```
Analyze this paper based on:
Inclusion Criteria: {user_criteria}
Exclusion Criteria: {user_exclusions}

Paper:
Title: {title}
Authors: {authors}
Abstract: {abstract}

Return JSON:
{
  "score": 1-10,
  "include": true/false,
  "rationale": "explanation"
}
```

### 5. PRISMA Methodology Tracking

**Requirement**: Automatically track systematic review metrics following PRISMA 2020 standards.

**Metrics Structure**:
```json
{
  "identification": {
    "records_identified": 4253
  },
  "screening": {
    "records_excluded_duplicates": 127,
    "records_after_duplicates_removed": 4126
  },
  "eligibility": {
    "full_text_assessed": 4126,
    "full_text_excluded_semantic": 1834
  },
  "included": {
    "studies_included": 2292
  }
}
```

**PRISMA Diagram Generation**:
- Generate SVG flow diagram
- Follow PRISMA 2020 visual standards
- Save to `uploads/prisma_diagrams/`
- Include in download package

### 6. Multi-Format Output Generation

**Automatic Outputs** (generated for each completed job):

1. **CSV File** (`{job_name}_results.csv`)
   - Columns: Title, Authors, Year, Source, Citations, Abstract, URL, DOI, Publisher, Semantic_Score, Exclusion_Reason
   - UTF-8 encoding
   - Comma-separated
   - Quote escaping

2. **PRISMA Flow Diagram** (`{job_name}_prisma.svg`)
   - SVG format
   - PRISMA 2020 compliant
   - Shows all review stages

3. **LaTeX Document** (`{job_name}_review.tex`)
   - Complete literature review structure
   - AI-generated content (if generateLatex=true)
   - Sections: Introduction, Methodology, Results, Discussion
   - Bibliography included
   - Compile-ready

4. **BibTeX File** (`{job_name}_references.bib`)
   - All paper citations
   - Proper BibTeX formatting
   - Compatible with LaTeX
   - Import-ready for reference managers

**Download API**:
```
GET /api/v1/jobs/{job_id}/download/csv
GET /api/v1/jobs/{job_id}/download/prisma
GET /api/v1/jobs/{job_id}/download/latex
GET /api/v1/jobs/{job_id}/download/bibtex
GET /api/v1/jobs/{job_id}/download/all  # ZIP archive
```

---

## Database Schema (SQLite + Sequelize)

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  google_id VARCHAR UNIQUE NOT NULL,
  name VARCHAR,
  picture VARCHAR,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW,
  updated_at TIMESTAMP DEFAULT NOW
);
```

### Search Jobs Table
```sql
CREATE TABLE search_jobs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR NOT NULL,
  keywords_include JSON NOT NULL,          -- Array of strings
  keywords_exclude JSON DEFAULT '[]',      -- Array of strings
  semantic_criteria JSON,                  -- {include: [], exclude: []}
  semantic_batch_mode BOOLEAN DEFAULT true,
  generate_latex BOOLEAN DEFAULT false,
  start_year INTEGER,
  end_year INTEGER,
  max_results INTEGER,
  status VARCHAR NOT NULL DEFAULT 'pending', -- pending|running|paused|completed|failed
  status_message TEXT,
  progress FLOAT DEFAULT 0.0,              -- 0-100
  total_papers_found INTEGER DEFAULT 0,
  papers_processed INTEGER DEFAULT 0,
  last_checkpoint JSON,                    -- {year: 2021, page: 30}
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  celery_task_id VARCHAR,                  -- BullMQ job ID
  csv_file_path VARCHAR,
  prisma_diagram_path VARCHAR,
  latex_file_path VARCHAR,
  bibtex_file_path VARCHAR,
  prisma_metrics JSON,                     -- PRISMA tracking data
  created_at TIMESTAMP DEFAULT NOW,
  updated_at TIMESTAMP DEFAULT NOW,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

### Papers Table
```sql
CREATE TABLE papers (
  id UUID PRIMARY KEY,
  search_job_id UUID NOT NULL REFERENCES search_jobs(id),
  title TEXT NOT NULL,
  authors TEXT,
  year INTEGER,
  abstract TEXT,
  source VARCHAR,
  citations INTEGER DEFAULT 0,
  url TEXT,
  doi VARCHAR,
  keywords JSON,
  publisher VARCHAR,
  semantic_score INTEGER,                  -- 1-10 from AI
  is_excluded BOOLEAN DEFAULT false,
  exclusion_reason TEXT,
  semantic_rationale TEXT,                 -- AI explanation
  created_at TIMESTAMP DEFAULT NOW,

  -- Deduplication constraint
  UNIQUE(search_job_id, title, year)
);
```

---

## API Design (RESTful)

### Authentication Endpoints

```
POST   /api/v1/auth/google/login
GET    /api/v1/auth/google/callback
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me
POST   /api/v1/auth/logout
```

### Search Job Endpoints

```
GET    /api/v1/jobs              # List all jobs for user
POST   /api/v1/jobs              # Create new job
GET    /api/v1/jobs/:id          # Get job details
PATCH  /api/v1/jobs/:id          # Update job
DELETE /api/v1/jobs/:id          # Delete job
POST   /api/v1/jobs/:id/resume   # Resume paused/failed job
POST   /api/v1/jobs/:id/pause    # Pause running job
POST   /api/v1/jobs/:id/cancel   # Cancel job
```

### Download Endpoints

```
GET    /api/v1/jobs/:id/download/csv
GET    /api/v1/jobs/:id/download/prisma
GET    /api/v1/jobs/:id/download/latex
GET    /api/v1/jobs/:id/download/bibtex
GET    /api/v1/jobs/:id/download/all
```

### Paper Endpoints

```
GET    /api/v1/jobs/:id/papers   # Get all papers for job
GET    /api/v1/papers/:id        # Get single paper
```

### System Endpoints

```
GET    /health                   # Health check
GET    /docs                     # Swagger UI
GET    /api/v1/stats             # System statistics
```

### API Response Format

**Success**:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": { ... }
  }
}
```

---

## Task Queue & Background Processing (BullMQ)

### Queue Architecture

**PM2 Services**:
1. `litrev-backend` - Express API server (port 8000)
2. `litrev-worker` - BullMQ worker (processes jobs)
3. `litrev-frontend` - React dev server (port 3001)

**Queue Configuration**:
- Queue name: `scholar-scraping`
- Redis connection: `localhost:6379`
- Concurrency: 1 (to prevent SQLite locks)
- Job timeout: 3600000ms (1 hour)
- Max retry attempts: 3

### Job Processing Flow

```javascript
// 1. User creates job via API
POST /api/v1/jobs
{
  "name": "AI Research 2020-2023",
  "keywords_include": ["artificial intelligence", "machine learning"],
  "keywords_exclude": ["neural networks"],
  "start_year": 2020,
  "end_year": 2023,
  "semantic_criteria": {
    "include": ["healthcare applications"],
    "exclude": ["theoretical proofs only"]
  }
}

// 2. API creates SearchJob in DB with status "pending"

// 3. API enqueues BullMQ job
await scrapingQueue.add('process-search', {
  job_id: searchJob.id
});

// 4. Worker picks up job and processes:
async function processSearchJob(job) {
  // Update status to "running"
  await updateJobStatus(jobId, 'running');

  // Year-based splitting
  const years = range(startYear, endYear); // [2020, 2021, 2022, 2023]

  for (const year of years) {
    // Scrape papers for this year
    const papers = await scrapeYear({
      keywords: keywordsInclude,
      year,
      maxResults: maxResults || 1000
    });

    // Save to database (with deduplication)
    await savePapers(jobId, papers);

    // Update progress
    const progress = ((years.indexOf(year) + 1) / years.length) * 100;
    await updateJobProgress(jobId, progress);
  }

  // Apply semantic filtering (if enabled)
  if (semanticCriteria) {
    await applySemanticFilter(jobId, semanticCriteria);
  }

  // Generate outputs
  await generateCSV(jobId);
  await generatePRISMADiagram(jobId);
  if (generateLatex) {
    await generateLatexDocument(jobId);
  }
  await generateBibTeX(jobId);

  // Send email notification
  await sendCompletionEmail(jobId);

  // Update status to "completed"
  await updateJobStatus(jobId, 'completed');
}
```

### Checkpointing & Resume

**Save checkpoint after each page**:
```json
{
  "year": 2021,
  "page": 30,
  "papers_collected": 300
}
```

**Resume logic**:
```javascript
if (job.lastCheckpoint) {
  // Resume from checkpoint
  startYear = job.lastCheckpoint.year;
  startPage = job.lastCheckpoint.page;
} else {
  // Start fresh
  startYear = job.startYear;
  startPage = 0;
}
```

---

## Frontend Implementation (React + Material-UI)

### Component Structure

```
src/
├── App.js                      # Main app with routing
├── components/
│   ├── Login.js               # Google OAuth login
│   ├── Dashboard.js           # Job list with real-time updates
│   ├── CreateJobDialog.js     # Job creation form
│   ├── JobDetails.js          # Individual job view
│   ├── DownloadMenu.js        # Multi-format downloads
│   └── SettingsDialog.js      # API mode switching (Electron)
├── contexts/
│   └── AuthContext.js         # Authentication state
├── services/
│   └── api.js                 # Axios API client
└── utils/
    └── formatters.js          # Data formatting utilities
```

### Key Features

**Dashboard (Real-time Updates)**:
- Poll API every 5 seconds for job status
- Display: Job name, status, progress bar, papers collected
- Action buttons: View, Resume, Pause, Delete, Download
- Color-coded status indicators
- PRISMA metrics display

**Create Job Dialog**:
- Multi-step form:
  1. Basic info (name, keywords)
  2. Year range and limits
  3. Semantic filtering (optional)
  4. Output options (LaTeX generation)
- Validation: Required fields, year range logic
- Interactive mode (CLI-like prompts)

**Authentication**:
- Google OAuth button
- JWT storage in localStorage
- Auto-refresh tokens
- Protected routes (redirect to login)

**Progress Tracking**:
```jsx
<LinearProgress
  variant="determinate"
  value={job.progress}
/>
<Typography>{job.status_message}</Typography>
<Typography>{job.total_papers_found} papers collected</Typography>
```

---

## Multi-Platform Deployment

### 1. Web Application

**Development**:
```bash
cd frontend
npm start  # Port 3001
```

**Production Build**:
```bash
cd frontend
npm run build
# Deploy build/ to nginx or static hosting
```

**Nginx Configuration**:
```nginx
server {
    listen 80;
    server_name litrev.example.com;

    # Frontend
    location / {
        root /var/www/litrev;
        try_files $uri /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

### 2. Desktop Application (Electron)

**Project Structure**:
```
electron/
├── main.js              # Electron main process
├── preload.js           # Secure IPC bridge
├── package.json
└── build/              # Icon assets
```

**Main Features**:
- Wraps React app in native window
- API mode switching (local/cloud/hybrid)
- System tray integration
- Auto-updates (electron-updater)
- Native menus and shortcuts

**Build Commands**:
```bash
npm run electron:build        # Current platform
npm run electron:build:mac    # macOS (DMG + zip)
npm run electron:build:win    # Windows (NSIS installer + portable)
npm run electron:build:linux  # Linux (AppImage + deb)
```

**API Modes** (switchable without rebuild):
- **Local**: `http://localhost:8000`
- **Cloud**: `https://litrev.haielab.org`
- **Hybrid**: Local jobs + cloud sync

### 3. Mobile Application (Capacitor)

**Setup**:
```bash
cd frontend
npx cap init
npx cap add ios      # macOS only
npx cap add android
```

**Build Process**:
```bash
# 1. Build React app
npm run build

# 2. Sync to mobile platforms
npx cap sync

# 3. Open in native IDE
npx cap open ios        # Xcode
npx cap open android    # Android Studio

# 4. Build and run from IDE or:
npx cap run ios
npx cap run android
```

**Native Features**:
- Splash screen
- Status bar styling
- Back button handling
- App lifecycle management
- Native Google Auth

**Capacitor Config** (`capacitor.config.json`):
```json
{
  "appId": "org.litrev.app",
  "appName": "LitRevTool",
  "webDir": "build",
  "bundledWebRuntime": false,
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 2000
    }
  }
}
```

### 4. CLI Tool (Node.js)

**Commands**:
```bash
litrev --help                    # Show all commands
litrev login                     # Authenticate with API
litrev quickstart                # Interactive tutorial
litrev create --interactive      # Create job with prompts
litrev list                      # List all jobs
litrev watch <job-id>            # Watch progress real-time
litrev status <job-id>           # Check job status
litrev download <job-id>         # Download all outputs
litrev download <job-id> --csv   # Download specific format
```

**Implementation**:
```javascript
#!/usr/bin/env node
const { Command } = require('commander');
const inquirer = require('inquirer');
const ora = require('ora');
const chalk = require('chalk');

const program = new Command();

program
  .name('litrev')
  .description('LitRevTool CLI - Literature Review Tool')
  .version('1.0.0');

program
  .command('create')
  .option('-i, --interactive', 'Interactive mode')
  .action(async (options) => {
    if (options.interactive) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Job name:',
        },
        {
          type: 'input',
          name: 'keywords',
          message: 'Keywords (comma-separated):',
        },
        // ... more prompts
      ]);

      const spinner = ora('Creating job...').start();
      const job = await api.createJob(answers);
      spinner.succeed(`Job created: ${job.id}`);
    }
  });

program.parse();
```

---

## Process Management (PM2)

### Ecosystem Configuration (`ecosystem.config.node.js`)

```javascript
module.exports = {
  apps: [
    {
      name: 'litrev-backend',
      cwd: './backend-node',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: '8000',
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
    },
    {
      name: 'litrev-worker',
      cwd: './backend-node',
      script: 'dist/tasks/worker.js',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
    },
    {
      name: 'litrev-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      instances: 1,
      env: {
        PORT: '3001',
        REACT_APP_API_URL: 'http://localhost:8000',
      },
    },
  ],
};
```

### NPM Scripts

```json
{
  "scripts": {
    "start": "pm2 start ecosystem.config.node.js",
    "stop": "pm2 stop ecosystem.config.node.js",
    "restart": "pm2 restart ecosystem.config.node.js",
    "logs": "pm2 logs",
    "status": "pm2 status",
    "monit": "pm2 monit",

    "deploy": "bash deploy-node.sh",
    "reset": "...",  // Full system reset (see below)

    "cli:install": "cd cli && npm link",
    "electron:build": "cd electron && npm run build",
    "mobile:sync": "cd frontend && npm run build && npx cap sync"
  }
}
```

### Reset Script (Critical for Recovery)

```bash
# npm run reset
# Stops all services
# Clears Redis queue
# Resets stuck jobs in DB
# Cleans screenshots
# Restarts services
```

---

## Critical Implementation Details

### 1. Deduplication Logic

**Problem**: Year-split searches may return same paper multiple times.

**Solution**:
```sql
-- Database constraint
UNIQUE(search_job_id, title, year)

-- Before inserting paper:
const existing = await Paper.findOne({
  where: {
    searchJobId: jobId,
    title: paper.title,
    year: paper.year
  }
});

if (!existing) {
  await Paper.create(paper);
}
```

### 2. Memory Management

**SQLite Concurrency**:
- Worker concurrency: 1 (prevent DB locks)
- Use transactions for bulk inserts
- Close connections after operations

**PM2 Memory Limits**:
- Backend: 512MB max
- Worker: 512MB max
- Frontend: 1GB max
- Auto-restart on exceed

### 3. Error Handling & Retry

**Retry Strategy**:
```javascript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  }
}
```

**Error Categories**:
- `CAPTCHA_DETECTED` → Pause job, notify user
- `NETWORK_ERROR` → Retry with backoff
- `RATE_LIMIT` → Increase delays, retry
- `PARSING_ERROR` → Log and skip paper
- `DB_ERROR` → Retry transaction

### 4. Screenshot Debugging

**Take screenshots**:
- On CAPTCHA detection
- On parsing errors
- Every 10 pages (configurable)

**Storage**:
- Path: `backend/uploads/screenshots/`
- Naming: `{job_id}_{year}_{page}_{timestamp}.png`
- Auto-cleanup: Delete after 7 days

### 5. Email Notifications

**Events**:
- Job completed (success)
- Job failed (with error details)
- CAPTCHA detected (requires user action)

**Template**:
```html
<h2>Job "{job_name}" Completed</h2>
<p>Papers collected: {total_papers}</p>
<p>PRISMA metrics: {prisma_summary}</p>
<p><a href="{download_link}">Download Results</a></p>
```

### 6. Real-time Progress Updates

**Frontend Polling**:
```javascript
useEffect(() => {
  const interval = setInterval(async () => {
    const jobs = await api.getJobs();
    setJobs(jobs);
  }, 5000); // Poll every 5 seconds

  return () => clearInterval(interval);
}, []);
```

**Alternative**: WebSocket for true real-time (optional enhancement)

### 7. API Mode Switching (Electron/Mobile)

**Configuration Storage**:
```javascript
// Electron: electron-store
// Mobile: Capacitor Storage

const modes = {
  local: 'http://localhost:8000',
  cloud: 'https://litrev.haielab.org',
  hybrid: {
    backend: 'http://localhost:8000',
    syncUrl: 'https://litrev.haielab.org'
  }
};
```

**Hybrid Mode Sync**:
```javascript
// After local job completes, sync to cloud
await syncJobToCloud(jobId);
```

---

## Deployment & Production Setup

### Prerequisites
- Node.js 18+
- Redis server
- PM2 globally installed
- Nginx (production)
- SSL certificate (Let's Encrypt)

### Deployment Script (`deploy-node.sh`)

```bash
#!/bin/bash

echo "🚀 Deploying LitRevTool..."

# 1. Install dependencies
cd backend-node && npm install
cd ../frontend && npm install
cd ../cli && npm install
cd ../electron && npm install

# 2. Build backend
cd backend-node && npm run build

# 3. Build frontend (production)
cd ../frontend && npm run build:prod

# 4. Initialize database
cd ../backend-node
node -e "require('./dist/db').sync()"

# 5. Start services with PM2
cd ..
pm2 start ecosystem.config.node.js
pm2 save

echo "✅ Deployment complete!"
```

### Environment Variables (`.env`)

```bash
# Backend
NODE_ENV=production
PORT=8000
DATABASE_URL=sqlite:./litrevtool.db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
FRONTEND_URL=https://litrev.example.com

# JWT
SECRET_KEY=your_secret_key_change_in_production

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# AI (optional)
GEMINI_API_KEY=your_gemini_key

# Scraping
MAX_RESULTS_PER_YEAR=1000
SCRAPER_DELAY_MIN=2000
SCRAPER_DELAY_MAX=5000
```

### Production Checklist

- [ ] Change `SECRET_KEY` from default
- [ ] Configure Google OAuth redirect URIs
- [ ] Set up SMTP for emails
- [ ] Configure Nginx reverse proxy
- [ ] Install SSL certificate
- [ ] Set up PM2 startup script: `pm2 startup`
- [ ] Configure firewall (ports 80, 443, 8000, 6379)
- [ ] Set up log rotation
- [ ] Configure Redis persistence
- [ ] Set up automated backups (SQLite database)
- [ ] Monitor disk space (screenshots can grow)
- [ ] Set up error monitoring (Sentry, etc.)

---

## Testing Strategy

### Backend Tests (Jest)
```javascript
describe('ScholarScraper', () => {
  it('should scrape papers for a year', async () => {
    const papers = await scraper.scrapeYear({
      keywords: ['test'],
      year: 2023,
      maxResults: 10
    });
    expect(papers.length).toBeGreaterThan(0);
  });

  it('should handle CAPTCHA gracefully', async () => {
    // Mock CAPTCHA detection
    // Verify job pauses and screenshot is saved
  });
});
```

### Frontend Tests (Jest + React Testing Library)
```javascript
describe('CreateJobDialog', () => {
  it('should validate required fields', () => {
    render(<CreateJobDialog />);
    fireEvent.click(screen.getByText('Create'));
    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });
});
```

### Integration Tests
- API endpoint tests
- Database operations
- Queue processing
- File generation

### CI/CD Pipeline (GitHub Actions)
```yaml
name: Test and Build

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: cd backend-node && npm test
      - run: cd frontend && npm test
```

---

## Documentation Structure

Create comprehensive documentation:

```
docs/
├── SETUP.md                          # Installation guide
├── DEPLOYMENT_GUIDE.md               # Production deployment
├── MULTI_STRATEGY_SCRAPER.md         # Scraper architecture
├── TESTING.md                        # Testing guide
├── CICD_SETUP.md                     # CI/CD configuration
├── CLI_TOOL.md                       # CLI usage
├── PRODUCTION_CHECKLIST.md           # Pre-launch checklist
├── NGINX_SSL_SETUP.md                # Reverse proxy setup
└── TROUBLESHOOTING.md                # Common issues
```

---

## Performance Optimization

### Database
- Create indexes on: `search_job_id`, `title`, `year`
- Use transactions for bulk inserts
- Implement connection pooling
- Consider PostgreSQL for production (> 1M papers)

### Scraping
- Parallel year processing (separate jobs)
- Browser pooling (reuse Playwright instances)
- Screenshot compression
- Incremental progress saves

### Frontend
- React.memo for expensive components
- Virtual scrolling for large lists
- Code splitting by route
- Lazy loading for dialogs

### API
- Response pagination (limit, offset)
- Caching with Redis (job status, etc.)
- Gzip compression
- Rate limiting (express-rate-limit)

---

## Security Considerations

### Authentication
- HTTPS only in production
- Secure cookie flags (httpOnly, secure, sameSite)
- JWT expiration (1 hour, refresh tokens)
- CORS configuration (whitelist origins)

### API
- Input validation (Joi, express-validator)
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitize inputs)
- Rate limiting (100 requests/15min per IP)

### File Operations
- Sanitize filenames
- Validate file types
- Size limits (10MB per download)
- Path traversal prevention

### Secrets Management
- Never commit `.env` file
- Use environment variables
- Rotate API keys regularly
- Use OAuth refresh tokens

---

## Monitoring & Observability

### Logging
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

logger.info('Job started', { jobId, userId });
logger.error('Scraping failed', { error, jobId });
```

### Metrics to Track
- Jobs created per day
- Success/failure rate
- Average papers per job
- Average job duration
- CAPTCHA encounter rate
- API response times
- Memory usage per service
- Disk space usage

### Alerting
- Email on job failure
- Slack webhook for system errors
- Disk space warnings (> 80%)
- Memory warnings (> 90%)
- Redis connection failures

---

## Extensibility & Future Enhancements

### Potential Features
1. **Additional Data Sources**
   - PubMed integration
   - arXiv support
   - IEEE Xplore connector

2. **Advanced Filtering**
   - Citation count thresholds
   - Author-based filtering
   - Journal ranking integration
   - Impact factor filtering

3. **Collaboration**
   - Team workspaces
   - Shared job libraries
   - Comment on papers
   - Tag and categorize papers

4. **Analytics**
   - Citation network graphs
   - Topic modeling
   - Author collaboration networks
   - Temporal trends

5. **Export Formats**
   - EndNote XML
   - RIS format
   - Mendeley integration
   - Zotero connector

---

## Implementation Priorities

### Phase 1: MVP (Core Features)
1. ✅ Backend API with Express + TypeScript
2. ✅ Google OAuth authentication
3. ✅ Basic scraping (Playwright)
4. ✅ Year-based splitting
5. ✅ SQLite database
6. ✅ BullMQ task queue
7. ✅ CSV export
8. ✅ React frontend with MUI
9. ✅ PM2 process management

### Phase 2: Enhanced Features
1. ✅ Multi-strategy scraping with fallback
2. ✅ PRISMA tracking and diagrams
3. ✅ Semantic filtering (Gemini AI)
4. ✅ LaTeX document generation
5. ✅ BibTeX export
6. ✅ Email notifications
7. ✅ Job resumption/checkpointing

### Phase 3: Multi-Platform
1. ✅ CLI tool with Commander.js
2. ✅ Electron desktop app
3. ✅ Capacitor mobile app (iOS/Android)
4. ✅ API mode switching (local/cloud/hybrid)

### Phase 4: Production Ready
1. ✅ Comprehensive testing (Jest)
2. ✅ CI/CD pipeline (GitHub Actions)
3. ✅ Production deployment (Nginx + SSL)
4. ✅ Monitoring and logging
5. ✅ Documentation
6. ✅ Error handling and recovery

---

## Key Success Metrics

### Technical
- Scraping success rate: > 95%
- Average job completion time: < 10 min (per 1000 papers)
- System uptime: > 99%
- CAPTCHA encounter rate: < 5%

### User Experience
- Job creation time: < 2 minutes
- Download speed: < 5 seconds (CSV)
- Dashboard load time: < 1 second
- Mobile app responsiveness: 60 FPS

### Business
- Papers collected per job: 1000-4000
- User retention: > 60% monthly
- Job completion rate: > 90%
- Multi-platform usage: Web 40%, Desktop 30%, Mobile 20%, CLI 10%

---

## Final Implementation Notes

### Critical Design Patterns
1. **Single Source, Multiple Wrappers**: One React app → Web, Electron, Capacitor
2. **Year-Based Splitting**: Bypass Google Scholar's 1000-paper limit
3. **Multi-Strategy Fallback**: Resilient scraping with automatic strategy switching
4. **Checkpointing**: Resume jobs from last successful point
5. **Deduplication**: Prevent duplicate papers across year splits
6. **PRISMA Compliance**: Automatic systematic review tracking

### Common Pitfalls to Avoid
1. ❌ Don't scrape too fast → Implement random delays (2-5s)
2. ❌ Don't ignore CAPTCHA → Detect, screenshot, pause job
3. ❌ Don't use high worker concurrency → SQLite locks (use 1)
4. ❌ Don't forget deduplication → Papers appear in multiple years
5. ❌ Don't hardcode API URLs → Use environment variables
6. ❌ Don't skip error handling → Scraping is inherently unreliable
7. ❌ Don't forget screenshots → Essential for debugging scraper issues
8. ❌ Don't neglect memory limits → PM2 auto-restart prevents leaks

### Must-Have npm Scripts
```json
{
  "start": "Start all services",
  "stop": "Stop all services",
  "restart": "Restart all services",
  "logs": "View all logs",
  "reset": "Full system reset",
  "deploy": "Deploy entire stack",
  "status": "Check service status",
  "debug": "Comprehensive debug info"
}
```

---

## Recommended Development Order

1. **Backend Foundation** (Week 1-2)
   - Express server + TypeScript setup
   - Database models (User, SearchJob, Paper)
   - Authentication (Google OAuth + JWT)
   - Basic CRUD API endpoints

2. **Scraping Core** (Week 2-3)
   - Playwright integration
   - Basic Scholar scraping
   - Year-based splitting logic
   - Pagination handling

3. **Task Queue** (Week 3-4)
   - BullMQ setup with Redis
   - Worker implementation
   - Job processing pipeline
   - Checkpointing

4. **Frontend Basic** (Week 4-5)
   - React setup with MUI
   - Authentication flow
   - Dashboard with job list
   - Create job dialog

5. **Output Generation** (Week 5-6)
   - CSV export
   - PRISMA diagram
   - BibTeX generation
   - Download endpoints

6. **Enhanced Features** (Week 6-7)
   - Multi-strategy scraping
   - Semantic filtering (Gemini)
   - LaTeX generation
   - Email notifications

7. **Multi-Platform** (Week 7-8)
   - CLI tool
   - Electron wrapper
   - Capacitor mobile apps

8. **Production** (Week 8-9)
   - Testing (Jest)
   - CI/CD (GitHub Actions)
   - Nginx + SSL setup
   - Deployment automation

9. **Polish** (Week 9-10)
   - Documentation
   - Error handling
   - Performance optimization
   - User feedback integration

---

## Essential External Resources

### Documentation
- **Google Scholar**: Understand structure, limitations
- **Playwright**: https://playwright.dev
- **BullMQ**: https://docs.bullmq.io
- **Sequelize**: https://sequelize.org
- **Material-UI**: https://mui.com
- **Electron**: https://electronjs.org
- **Capacitor**: https://capacitorjs.com
- **PRISMA**: http://prisma-statement.org

### APIs
- **Google OAuth**: https://console.cloud.google.com
- **Google Gemini**: https://ai.google.dev

### Tools
- **PM2**: https://pm2.keymetrics.io
- **Redis**: https://redis.io
- **Nginx**: https://nginx.org

---

## Conclusion

This specification provides a complete blueprint for building a sophisticated, multi-platform literature review tool that:

1. **Solves a real problem**: Overcomes Google Scholar's 1000-paper limit
2. **Provides exceptional UX**: Web, desktop, mobile, CLI - all from one codebase
3. **Generates publication-ready outputs**: CSV, PRISMA, LaTeX, BibTeX
4. **Follows best practices**: TypeScript, testing, CI/CD, monitoring
5. **Is production-ready**: PM2, Nginx, SSL, error handling, recovery

**Key Innovation**: Year-based search splitting enables 4-10x more papers than competitors while maintaining PRISMA compliance and generating academic-quality outputs.

**Architecture Highlight**: Single React codebase deployed to four platforms (web, desktop, mobile, CLI) minimizes maintenance while maximizing reach.

Use this specification to implement a similar solution, adapting the technology stack and features to your specific requirements while preserving the core architectural patterns and innovative features that make LitRevTool unique.
