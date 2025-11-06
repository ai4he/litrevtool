# LitRevTool Setup Guide

This guide will walk you through setting up LitRevTool from scratch on a fresh system.

## Prerequisites

Before you begin, ensure you have:
- A computer with Windows, macOS, or Linux
- Internet connection
- A Google account
- Administrator/sudo access for installing software

## Step 1: Install Required Software

### Python 3.8+

#### Windows
1. Download [Python 3.8+](https://www.python.org/downloads/)
2. Run the installer
3. **Important**: Check "Add Python to PATH"
4. Complete the installation
5. Verify: Open Command Prompt and run `python --version`

#### macOS
```bash
# Using Homebrew
brew install python3

# Verify
python3 --version
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv
python3 --version
```

### Node.js 16+

#### Windows
1. Download [Node.js LTS](https://nodejs.org/)
2. Run the installer
3. Accept all defaults
4. Verify: Open Command Prompt and run `node --version` and `npm --version`

#### macOS
```bash
# Using Homebrew
brew install node

# Verify
node --version
npm --version
```

#### Linux (Ubuntu/Debian)
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version
npm --version
```

### Redis Server

#### Windows
1. Download [Redis for Windows](https://github.com/microsoftarchive/redis/releases)
2. Extract and run `redis-server.exe`
3. Or use Windows Subsystem for Linux (WSL) and follow Linux instructions

#### macOS
```bash
# Using Homebrew
brew install redis

# Start Redis
brew services start redis

# Verify
redis-cli ping
# Should return: PONG
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify
redis-cli ping
# Should return: PONG
```

### Google Chrome

The scraper requires Chrome/Chromium. Install it from [google.com/chrome](https://www.google.com/chrome/) or:

#### Linux (Ubuntu/Debian)
```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt-get install -f
```

## Step 2: Download LitRevTool

### Option A: Using Git (Recommended)
```bash
git clone <repository-url>
cd litrevtool
```

### Option B: Download ZIP
1. Download the project as a ZIP file from GitHub
2. Extract it to a folder
3. Open terminal/command prompt in that folder

## Step 3: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click "Select a project" → "New Project"
4. Enter project name (e.g., "LitRevTool") → Click "Create"
5. Wait for project creation, then select it

### Enable Google+ API
1. In the left sidebar, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it and click "Enable"

### Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: External
   - App name: LitRevTool
   - User support email: Your email
   - Developer contact: Your email
   - Click "Save and Continue" through all steps
4. Back on Create OAuth client ID:
   - Application type: Web application
   - Name: LitRevTool Web Client
   - Authorized redirect URIs: Add these:
     - `http://localhost:8000/api/v1/auth/google/callback`
     - `http://localhost:3001`
   - Click "Create"
5. **Copy the Client ID and Client Secret** (you'll need these next)

## Step 4: Configure Environment Variables

1. In the litrevtool folder, create a `.env` file:

   **Windows (Command Prompt):**
   ```cmd
   copy .env.example .env
   ```

   **macOS/Linux:**
   ```bash
   cp .env.example .env
   ```

   **If .env.example doesn't exist, create .env manually:**
   ```bash
   # Windows: Use Notepad
   notepad .env

   # macOS/Linux: Use any editor
   nano .env
   ```

2. Add the following content to `.env`:

   ```bash
   # Google OAuth (REQUIRED)
   GOOGLE_CLIENT_ID=paste_your_client_id_here
   GOOGLE_CLIENT_SECRET=paste_your_client_secret_here

   # Security (REQUIRED - use a random string)
   SECRET_KEY=change_this_to_a_random_string_at_least_32_characters

   # Email Notifications (OPTIONAL)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASSWORD=your_gmail_app_password

   # Gemini API (already configured)
   GEMINI_API_KEY=AIzaSyDxAW82IQqw4TBb8Od0UvnXafGCYrkwyOU
   ```

3. Replace the placeholder values:
   - `GOOGLE_CLIENT_ID`: Paste your Client ID from Step 3
   - `GOOGLE_CLIENT_SECRET`: Paste your Client Secret from Step 3
   - `SECRET_KEY`: Generate a random string (e.g., use a password generator)

4. (Optional) For email notifications:
   - Gmail users need an [App Password](https://support.google.com/accounts/answer/185833)
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Create an app password and use it in `SMTP_PASSWORD`

5. Save and close the file

## Step 5: Deploy the Application

Run the automated deployment script:

```bash
# Make script executable (Unix/macOS/Linux only)
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

**On Windows (if bash is not available):**
Run the commands manually:
```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -c "from app.db.session import engine; from app.models import Base; Base.metadata.create_all(bind=engine)"
deactivate

cd ..\frontend
npm install

cd ..
npm install -g pm2
npm start
```

The deployment script will:
1. ✓ Check prerequisites (Python, Node.js, Redis, PM2)
2. ✓ Create Python virtual environment
3. ✓ Install Python dependencies (FastAPI, Celery, Selenium, etc.)
4. ✓ Install Node.js dependencies (React, etc.)
5. ✓ Initialize SQLite database
6. ✓ Configure PM2 process manager
7. ✓ Start all services (backend, celery worker, frontend)
8. ✓ Perform health checks

Expected output:
```
==========================================
   LitRevTool Deployment Script
==========================================

Step 1: Checking prerequisites...
✓ Python 3 found: Python 3.10.0
✓ Node.js found: v18.16.0
✓ npm found: 9.5.1
✓ Redis found
✓ Redis is running
✓ PM2 found: 5.3.0

Step 2: Setting up Python backend...
✓ Virtual environment created
✓ Python dependencies installed
✓ Directories created
✓ Database initialized

Step 3: Setting up React frontend...
✓ npm dependencies installed

Step 4: Checking environment configuration...
✓ .env file exists

Step 5: Starting services with PM2...
[PM2 process list...]

Step 6: Health check...
✓ Backend API is running on http://localhost:8000
✓ Frontend is running on http://localhost:3001
✓ Redis is running

==========================================
   Deployment Complete!
==========================================

Services:
  • Frontend:  http://localhost:3001
  • Backend:   http://localhost:8000
  • API Docs:  http://localhost:8000/docs
```

## Step 6: Access the Application

1. Open your web browser
2. Go to: **http://localhost:3001**
3. You should see the LitRevTool login page
4. Click "Sign in with Google"
5. Authorize the application
6. You're in! Create your first search

## Step 7: Verify Installation

### Check Services
```bash
npm run status
```

Should show three running services:
- `litrev-backend` - FastAPI backend
- `litrev-celery` - Celery worker for background jobs
- `litrev-frontend` - React frontend

### Check Logs
```bash
# All logs
npm run logs

# Specific service
npm run logs:backend
npm run logs:celery
npm run logs:frontend
```

### Test the Backend API
Open http://localhost:8000/docs to see the interactive API documentation.

## Service Management

After deployment, use these npm commands to manage services:

```bash
# Start all services
npm start

# Stop all services
npm stop

# Restart all services
npm restart

# Check status
npm run status

# View logs
npm run logs

# Monitor resource usage
npm run monit

# Full system reset (if something goes wrong)
npm run reset
```

For more commands, see [PM2_COMMANDS.md](PM2_COMMANDS.md).

## Creating Your First Search

1. Click "New Search" in the dashboard
2. Fill in the form:
   - **Name**: "Test Search"
   - **Include Keywords**: Add "machine learning"
   - **Years**: 2023 to 2023
3. Click "Start Search"
4. Watch the progress in real-time!
5. When complete, click "Download CSV"

## Troubleshooting

### Port Already in Use

If you see "port is already allocated":

```bash
# Check what's using the port
# Linux/macOS:
lsof -i :3001
lsof -i :8000

# Windows:
netstat -ano | findstr :3001
netstat -ano | findstr :8000

# Kill the process or use the clean restart:
npm run clean:restart
```

### Redis Connection Error

```bash
# Check if Redis is running
redis-cli ping

# Should return: PONG

# If not running:
# macOS:
brew services start redis

# Linux:
sudo systemctl start redis-server

# Windows:
redis-server.exe
```

### Python Dependencies Error

```bash
cd backend
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate  # Windows

pip install --upgrade pip
pip install -r requirements.txt
```

### Chrome/ChromeDriver Issues

```bash
# Check Chrome installation
google-chrome --version  # Linux
# or
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --version  # macOS

# Update webdriver
cd backend
source venv/bin/activate
pip install --upgrade selenium webdriver-manager
```

### Google Sign In Not Working

1. Double-check `GOOGLE_CLIENT_ID` in `.env`
2. Verify redirect URIs in Google Console include:
   - `http://localhost:8000/api/v1/auth/google/callback`
   - `http://localhost:3001`
3. Clear browser cache and cookies
4. Try incognito/private mode

### Services Won't Start

```bash
# Check logs for errors
npm run logs

# Try a full system reset
npm run reset

# Or manually:
pm2 stop all
pm2 delete all
npm start
```

### Database Issues

```bash
# Backup existing database
cp backend/litrevtool.db backend/litrevtool.db.backup

# Recreate database
rm backend/litrevtool.db
cd backend
source venv/bin/activate
python3 -c "from app.db.session import engine; from app.models import Base; Base.metadata.create_all(bind=engine)"
```

## Production Deployment

For production deployment on a server:

### 1. Update Environment Variables

Edit `.env`:
```bash
# Use production domain
FRONTEND_URL=https://yourdomain.com
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/v1/auth/google/callback

# Strong secret key
SECRET_KEY=generate_a_very_long_random_string_here

# Production SMTP
SMTP_HOST=smtp.yourmailprovider.com
SMTP_USER=your_production_email
SMTP_PASSWORD=your_production_password
```

### 2. Update Google OAuth

Add production redirect URIs in Google Console:
- `https://yourdomain.com/api/v1/auth/google/callback`
- `https://yourdomain.com`

### 3. Set Up Nginx Reverse Proxy

Install Nginx:
```bash
sudo apt install nginx
```

Create `/etc/nginx/sites-available/litrevtool`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/litrevtool /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Set Up SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 5. Configure PM2 Auto-Start

```bash
# Set up PM2 to start on system boot
sudo pm2 startup

# Save current process list
pm2 save
```

### 6. Set Up Database Backups

Create backup script `/home/ubuntu/backup-litrevtool.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /home/ubuntu/litrevtool/backend/litrevtool.db \
   /home/ubuntu/backups/litrevtool_$DATE.db
# Keep only last 30 days
find /home/ubuntu/backups -name "litrevtool_*.db" -mtime +30 -delete
```

Add to crontab:
```bash
crontab -e
# Add: Daily backup at 2 AM
0 2 * * * /home/ubuntu/backup-litrevtool.sh
```

## Advanced Configuration

### Scaling Workers

Edit `ecosystem.config.js` to adjust Celery workers:
```javascript
{
  name: 'litrev-celery',
  args: '-A app.tasks.celery_app worker --loglevel=info --concurrency=4',
  // Change concurrency based on your CPU cores
}
```

### Customizing Ports

Edit `ecosystem.config.js`:
- Frontend port: Change `PORT: '3001'` in env
- Backend port: Change args `--port 8000`

Don't forget to update:
- `.env` file
- Google OAuth redirect URIs
- Nginx configuration (if using)

### Memory Limits

In `ecosystem.config.js`, adjust:
```javascript
max_memory_restart: '1G',  // Restart if exceeds 1GB
```

## Getting Help

If you encounter issues:

1. Check the [troubleshooting section](#troubleshooting)
2. Review logs: `npm run logs`
3. Try system reset: `npm run reset`
4. Check [RESET.md](RESET.md) for reset documentation
5. Check [PM2_COMMANDS.md](PM2_COMMANDS.md) for management commands
6. Open an issue on GitHub with:
   - Error message
   - Relevant logs
   - Steps to reproduce

## Next Steps

- Explore the dashboard and create searches
- Try semantic filtering with different criteria
- Set up email notifications
- Configure automated backups
- Share feedback and suggestions!

Enjoy using LitRevTool! 🎉
