# LitRevTool Setup Guide

This guide will walk you through setting up LitRevTool from scratch.

## Prerequisites

Before you begin, ensure you have:
- A computer with Windows, macOS, or Linux
- Internet connection
- A Google account

## Step 1: Install Docker

### Windows
1. Download [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
2. Run the installer
3. Follow the installation wizard
4. Restart your computer
5. Open Docker Desktop and wait for it to start

### macOS
1. Download [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop)
2. Open the `.dmg` file
3. Drag Docker to Applications
4. Open Docker from Applications
5. Wait for Docker to start

### Linux (Ubuntu/Debian)
```bash
# Install Docker
sudo apt-get update
sudo apt-get install docker.io docker-compose

# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and log back in for changes to take effect
```

## Step 2: Download LitRevTool

### Option A: Using Git (Recommended)
```bash
git clone <repository-url>
cd litrevtool
```

### Option B: Download ZIP
1. Download the project as a ZIP file
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
   - Authorized redirect URIs: Add these two:
     - `http://localhost:8000/api/v1/auth/google/callback`
     - `http://localhost:3000`
   - Click "Create"
5. Copy the **Client ID** and **Client Secret** (you'll need these next)

## Step 4: Configure Environment Variables

1. In the litrevtool folder, copy `.env.example` to `.env`:

   **Windows (Command Prompt):**
   ```cmd
   copy .env.example .env
   ```

   **macOS/Linux:**
   ```bash
   cp .env.example .env
   ```

2. Open `.env` with a text editor (Notepad, TextEdit, nano, etc.)

3. Replace the placeholder values:
   ```
   GOOGLE_CLIENT_ID=paste_your_client_id_here
   GOOGLE_CLIENT_SECRET=paste_your_client_secret_here
   SECRET_KEY=any_random_string_at_least_32_characters_long
   ```

4. (Optional) Configure email notifications:
   - For Gmail, you need an [App Password](https://support.google.com/accounts/answer/185833)
   - Update SMTP settings in `.env`:
     ```
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_USER=your_email@gmail.com
     SMTP_PASSWORD=your_app_password
     ```

5. Save and close the file

## Step 5: Start the Application

1. Open terminal/command prompt in the litrevtool folder

2. Start all services:
   ```bash
   docker-compose up --build
   ```

3. Wait for all services to start (this may take 5-10 minutes the first time)

4. You should see logs from various services. Look for:
   ```
   backend_1  | Uvicorn running on http://0.0.0.0:8000
   frontend_1 | webpack compiled successfully
   ```

## Step 6: Access the Application

1. Open your web browser
2. Go to: http://localhost:3000
3. You should see the LitRevTool login page
4. Click "Sign in with Google"
5. Authorize the application
6. You're in! Create your first search

## Step 7: Create Your First Search

1. Click "New Search"
2. Fill in the form:
   - **Name**: "Machine Learning Papers"
   - **Include Keywords**: Add "machine learning", "deep learning"
   - **Exclude Keywords**: (optional) Add "medical"
   - **Years**: 2022 to 2023
3. Click "Start Search"
4. Watch the progress in real-time!

## Monitoring and Management

### View Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs worker

# Follow logs in real-time
docker-compose logs -f worker
```

### Stop the Application
```bash
# Press Ctrl+C in the terminal where it's running

# Or, in a new terminal:
docker-compose down
```

### Restart the Application
```bash
docker-compose down
docker-compose up
```

### Monitor Background Tasks
- Open http://localhost:5555 to see Celery Flower
- View active tasks, completed tasks, and worker status

### API Documentation
- Open http://localhost:8000/docs for interactive API docs

## Troubleshooting

### Port Already in Use
If you see "port is already allocated":

**Option 1: Stop the conflicting service**
- Windows: Check Task Manager
- macOS/Linux: `lsof -i :3000` or `lsof -i :8000`

**Option 2: Change ports**
Edit `docker-compose.yml` to use different ports.

### Docker Not Starting
- Ensure Docker Desktop is running
- Restart Docker Desktop
- Check system requirements

### Can't Connect to Database
```bash
# Reset everything
docker-compose down -v
docker-compose up --build
```

### Google Sign In Not Working
- Double-check Client ID in `.env`
- Verify redirect URIs in Google Console
- Clear browser cache and try again

### Search Not Starting
- Check worker logs: `docker-compose logs worker`
- Verify Gemini API key (should be pre-configured)
- Check Redis: `docker-compose logs redis`

## Testing the Scraper

To test the scraper independently:

```bash
# Enter the worker container
docker-compose exec worker bash

# Run the test
cd /app
python -m app.services.scholar_scraper

# Exit
exit
```

## Data and Files

### Where Are My CSV Files?
- Inside the container: `/app/uploads`
- On your host: `backend/uploads/` (created automatically)
- Download via the web interface for easiest access

### Database
- PostgreSQL data is stored in a Docker volume
- To backup: `docker-compose exec db pg_dump -U litrevtool litrevtool > backup.sql`
- To restore: `cat backup.sql | docker-compose exec -T db psql -U litrevtool litrevtool`

## Production Deployment

For production use:

1. **Use a proper domain** with HTTPS (Let's Encrypt)
2. **Change SECRET_KEY** to a strong random value
3. **Use production database** (not local Docker)
4. **Configure email** properly
5. **Set up monitoring** (logs, alerts)
6. **Scale workers**: `docker-compose up -d --scale worker=4`
7. **Regular backups** of database

## Getting Help

If you encounter issues:

1. Check this guide thoroughly
2. Review the main README.md
3. Check logs: `docker-compose logs`
4. Search for error messages online
5. Open an issue on GitHub with:
   - Error message
   - Relevant logs
   - Steps to reproduce

## Tips for Best Results

1. **Use specific year ranges** to get more papers (1000 per year)
2. **Be patient** - large searches can take 30-60 minutes
3. **Use semantic filtering** for better quality results
4. **Monitor Flower** to see task progress
5. **Don't run too many searches** simultaneously to avoid CAPTCHAs
6. **Resume failed jobs** if they encounter issues

## Next Steps

- Explore the dashboard
- Try semantic filtering with different criteria
- Set up email notifications
- Export and analyze your results
- Share feedback and suggestions!

Enjoy using LitRevTool!
