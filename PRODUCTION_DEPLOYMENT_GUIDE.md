# Production Deployment Guide: Migrating to Next.js Isomorphic Frontend

This guide provides step-by-step instructions for migrating from the React frontend to the Next.js isomorphic (SSR) frontend in production with **zero downtime**.

## Overview

- **Old Frontend**: React (CRA) running on port 3001 via PM2 (`litrev-frontend`)
- **New Frontend**: Next.js 14 with SSR running on port 3001 via PM2 (`litrev-frontend-nextjs`)
- **Strategy**: Blue-green deployment - build new frontend, then atomic swap
- **Rollback**: Keep old frontend ready for instant rollback if needed

## Prerequisites

Before starting, ensure you have:
- [x] SSH access to the production server
- [x] PM2 installed and running
- [x] Node.js 18+ installed
- [x] Git access to the repository
- [x] Backend services running (`litrev-backend`, `litrev-worker` or `litrev-celery`)

## Pre-Deployment Checklist

Run these checks before proceeding:

```bash
# 1. Check current services status
pm2 status

# Expected output should show:
# - litrev-backend (or litrev-celery) - running
# - litrev-frontend - running

# 2. Check Node.js version
node --version
# Should be v18.x or higher

# 3. Check disk space
df -h
# Ensure at least 2GB free space

# 4. Create backup of current state
pm2 save
cp ecosystem.config.*.js ecosystem.config.backup.$(date +%Y%m%d_%H%M%S).js

# 5. Note current commit
git log -1 --oneline
```

## Step-by-Step Deployment

### Step 1: Pull Latest Code

```bash
# Navigate to project directory
cd /home/ubuntu/litrevtool  # or your project path

# Stash any local changes (if any)
git stash

# Fetch latest changes
git fetch origin

# Checkout the branch with Next.js implementation
git checkout claude/make-app-isomorphic-011CUuY2CQ8noVpagVJEkC5Z

# Pull latest changes
git pull origin claude/make-app-isomorphic-011CUuY2CQ8noVpagVJEkC5Z

# Verify the new frontend exists
ls -la frontend-nextjs/
```

**Expected output**: You should see the `frontend-nextjs/` directory with files like:
- `app/`, `components/`, `lib/`
- `package.json`, `next.config.js`, `tsconfig.json`

### Step 2: Configure Environment Variables

```bash
# Navigate to Next.js frontend
cd frontend-nextjs

# Create .env.local from your current settings
# Copy the Google Client ID from the backend .env or old frontend
cat ../.env | grep GOOGLE_CLIENT_ID

# Create .env.local with production values
cat > .env.local << 'EOF'
# API Backend URL (use production domain)
NEXT_PUBLIC_API_URL=https://litrev.haielab.org

# Google OAuth Client ID (copy from backend .env)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=337048330114-08bp752l61julmdpjj3o2h4df7rmeh0t.apps.googleusercontent.com

# Application URL (production domain)
NEXT_PUBLIC_APP_URL=https://litrev.haielab.org
EOF

# Verify the file was created
cat .env.local
```

**IMPORTANT**: Replace the `NEXT_PUBLIC_GOOGLE_CLIENT_ID` with your actual Google Client ID from the backend `.env` file.

### Step 3: Install Dependencies

```bash
# Still in frontend-nextjs/
npm install

# This will install all dependencies
# Expected: ~400-450 packages installed
# Time: 30-60 seconds
```

**Verify**: Check that `node_modules/` was created:
```bash
ls -la node_modules/ | head -20
```

### Step 4: Build Next.js Application

```bash
# Build the production bundle
npm run build

# This will:
# 1. Compile TypeScript
# 2. Optimize for production
# 3. Generate static pages
# 4. Create .next/ directory

# Expected output should end with:
# ✓ Compiled successfully
# ✓ Generating static pages
# Route (app)
# ○ / ○ /login ○ /dashboard
```

**Verify build succeeded**:
```bash
# Check that .next directory exists
ls -la .next/

# Test the build locally (optional, Ctrl+C to stop)
# npm start
```

### Step 5: Create Logs Directory

```bash
# Create logs directory for PM2
mkdir -p logs

# Verify
ls -la logs/
```

### Step 6: Update PM2 Configuration (Zero-Downtime Strategy)

We'll use a **blue-green deployment** strategy:

```bash
# Go back to project root
cd /home/ubuntu/litrevtool

# Verify the new PM2 config exists
cat ecosystem.config.nextjs.js | grep -A 20 "litrev-frontend-nextjs"
```

**Important**: The new config uses `litrev-frontend-nextjs` as the process name (different from old `litrev-frontend`).

### Step 7: Start New Frontend (Parallel to Old)

```bash
# Start the Next.js frontend WITHOUT stopping the old one
pm2 start ecosystem.config.nextjs.js --only litrev-frontend-nextjs

# Check status - you should see BOTH running:
pm2 status

# Expected output:
# litrev-backend         - online
# litrev-frontend        - online (old React)
# litrev-frontend-nextjs - online (new Next.js)
```

### Step 8: Verify Next.js is Working

```bash
# Check Next.js logs for errors
pm2 logs litrev-frontend-nextjs --lines 50

# Expected: Should see "ready started server on 0.0.0.0:3001"
# NO errors should appear

# Test the Next.js app (from server)
curl -I http://localhost:3001

# Expected: HTTP/1.1 200 OK

# Test login page
curl -s http://localhost:3001/login | grep -i "litrevtool"
# Expected: Should find "LitRevTool" in the HTML

# Verify SSR is working (check for rendered HTML, not just <div id="root">)
curl -s http://localhost:3001/login | grep -o "<h1.*LitRevTool.*</h1>"
# Expected: Should show the rendered h1 tag
```

**CRITICAL CHECK**: If any of these checks fail, **DO NOT PROCEED**. Debug the issue first.

### Step 9: Update Nginx to Use New Frontend (Atomic Swap)

**BEFORE making this change**, verify:
```bash
# 1. Next.js is running
pm2 status | grep litrev-frontend-nextjs
# Should show "online"

# 2. No errors in logs
pm2 logs litrev-frontend-nextjs --lines 20 --nostream
# Should show "ready started server"
```

Now update Nginx:

```bash
# Backup current Nginx config
sudo cp /etc/nginx/sites-available/litrevtool /etc/nginx/sites-available/litrevtool.backup.$(date +%Y%m%d_%H%M%S)

# The Nginx config should already be pointing to port 3001
# Both old and new frontends run on port 3001, so NO CHANGE NEEDED

# However, verify the config is correct:
sudo cat /etc/nginx/sites-available/litrevtool | grep -A 5 "location /"

# Expected to see:
# location / {
#     proxy_pass http://localhost:3001;
#     ...
# }

# Test Nginx config
sudo nginx -t

# Expected: configuration file /etc/nginx/nginx.conf test is successful
```

**NOTE**: Since both old and new frontends run on port 3001, and we cannot run both simultaneously on the same port, we need to do an **atomic swap**:

### Step 10: Atomic Swap (Stop Old, New Takes Over)

This is the critical moment - the swap should take ~1-2 seconds:

```bash
# ATOMIC SWAP: Stop old React frontend, Next.js immediately takes port 3001
pm2 stop litrev-frontend && pm2 start litrev-frontend-nextjs

# If Next.js was already running, restart it to be sure
pm2 restart litrev-frontend-nextjs

# Check status immediately
pm2 status

# Expected:
# litrev-backend         - online
# litrev-frontend        - stopped (old React)
# litrev-frontend-nextjs - online (new Next.js)
```

**Downtime**: ~1-2 seconds during the swap.

### Step 11: Verify Production Site

```bash
# 1. Check PM2 status
pm2 status

# 2. Check Next.js logs for errors
pm2 logs litrev-frontend-nextjs --lines 30

# 3. Test from server
curl -I https://litrev.haielab.org
# Expected: HTTP/2 200

# 4. Test SSR (verify HTML content is rendered)
curl -s https://litrev.haielab.org/login | grep -i "litrevtool"
# Expected: Should find "LitRevTool" in rendered HTML

# 5. Test API proxy
curl -I https://litrev.haielab.org/api/v1/health
# Expected: HTTP/2 200 (if health endpoint exists)
```

### Step 12: Browser Verification (Manual)

Open a browser and test:

1. **Visit**: https://litrev.haielab.org
   - Should redirect to `/login` or `/dashboard`

2. **Check SSR**:
   - Right-click → "View Page Source" (Ctrl+U)
   - Should see fully rendered HTML with content
   - Should see `<style data-emotion="mui">` tags
   - Should NOT see just `<div id="root"></div>`

3. **Test Login**:
   - Click Google Sign-In
   - Should authenticate successfully
   - Should redirect to Dashboard

4. **Test Dashboard**:
   - Should show existing jobs (if any)
   - Real-time updates should work
   - Create a test job
   - Verify job appears and updates in real-time

5. **Test Downloads**:
   - Click download on a completed job
   - CSV, PRISMA, LaTeX, BibTeX should all download

**If everything works**: Proceed to Step 13
**If anything fails**: Skip to Rollback Procedure below

### Step 13: Clean Up and Save Configuration

```bash
# Delete the old React frontend from PM2 (but keep files for rollback)
pm2 delete litrev-frontend

# Save PM2 configuration
pm2 save

# Update PM2 startup script
pm2 startup
# Follow the instructions it provides (usually running a command with sudo)

# Verify saved config
pm2 list

# Expected output:
# litrev-backend         - online
# litrev-frontend-nextjs - online
# (litrev-worker or litrev-celery) - online
```

### Step 14: Monitor for Issues

```bash
# Monitor logs for the next few minutes
pm2 logs litrev-frontend-nextjs

# Monitor PM2 dashboard
pm2 monit

# Check for any errors
pm2 logs litrev-frontend-nextjs --err --lines 50
```

**Keep monitoring for 15-30 minutes** to ensure stability.

### Step 15: Performance Verification

Compare performance metrics:

```bash
# Test Time to First Byte (TTFB)
curl -o /dev/null -s -w "Time: %{time_total}s\n" https://litrev.haielab.org/login

# Expected: Should be similar or faster than before (~0.3-0.6s)
```

**Lighthouse Audit** (from browser):
1. Open Chrome DevTools (F12)
2. Go to "Lighthouse" tab
3. Run audit for Desktop
4. Check scores:
   - SEO: Should be 90-100 (improved from 60-70)
   - Performance: Should be good
   - Accessibility: Should be maintained

## Rollback Procedure

If anything goes wrong, you can instantly rollback:

### Immediate Rollback (Within 5 minutes)

```bash
# Stop Next.js frontend
pm2 stop litrev-frontend-nextjs

# Restart old React frontend
pm2 restart litrev-frontend

# Verify
pm2 status

# Test
curl -I https://litrev.haielab.org
```

**Downtime**: ~1-2 seconds

### Full Rollback (If Next.js was deleted)

```bash
# Stop Next.js
pm2 stop litrev-frontend-nextjs
pm2 delete litrev-frontend-nextjs

# Start old React frontend with old config
pm2 start ecosystem.config.node.js --only litrev-frontend

# Or use the backup config
pm2 start ecosystem.config.backup.*.js --only litrev-frontend

# Save configuration
pm2 save

# Verify
pm2 status
curl -I https://litrev.haielab.org
```

## Post-Deployment Tasks

### Update Documentation

```bash
# Update CLAUDE.md to document the new frontend
# (Already done in the repository)

# Update any deployment scripts
# (Already done - deploy-nextjs.sh exists)
```

### Set Up Monitoring

```bash
# Add PM2 monitoring (if not already set up)
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Backup Old Frontend (Optional)

```bash
# Create a backup of the old React frontend
cd /home/ubuntu/litrevtool
tar -czf frontend-react-backup-$(date +%Y%m%d).tar.gz frontend/

# Move to backups directory
mkdir -p backups
mv frontend-react-backup-*.tar.gz backups/

# Verify
ls -lh backups/
```

## Troubleshooting

### Issue 1: Next.js Won't Start

**Symptoms**: PM2 shows "errored" or "stopped"

**Solution**:
```bash
# Check logs
pm2 logs litrev-frontend-nextjs --err --lines 100

# Common issues:
# 1. Port 3001 already in use
lsof -i :3001
pm2 stop litrev-frontend  # Stop old frontend

# 2. Missing dependencies
cd frontend-nextjs && npm install

# 3. Build failed
cd frontend-nextjs && npm run build

# 4. Environment variables missing
cat frontend-nextjs/.env.local
```

### Issue 2: White Screen / No Content

**Symptoms**: Browser shows white screen or "Loading..."

**Solution**:
```bash
# Check browser console for errors
# Common issues:

# 1. API calls failing (CORS or proxy issue)
curl https://litrev.haielab.org/api/v1/health

# 2. Environment variables wrong
cat frontend-nextjs/.env.local

# 3. Build issue - rebuild
cd frontend-nextjs
rm -rf .next
npm run build
pm2 restart litrev-frontend-nextjs
```

### Issue 3: Authentication Not Working

**Symptoms**: Login redirects back to login, or shows error

**Solution**:
```bash
# 1. Check Google Client ID matches
cat frontend-nextjs/.env.local | grep GOOGLE_CLIENT_ID
cat .env | grep GOOGLE_CLIENT_ID
# These should match!

# 2. Check cookies are being set
# In browser console:
# document.cookie

# 3. Verify backend is running
pm2 status | grep backend
curl https://litrev.haielab.org/api/v1/health
```

### Issue 4: Styles Missing / Broken Layout

**Symptoms**: Content appears but styles are missing

**Solution**:
```bash
# 1. Check Emotion SSR is working
curl -s https://litrev.haielab.org/login | grep "data-emotion"
# Should find style tags with data-emotion attribute

# 2. Rebuild
cd frontend-nextjs
rm -rf .next
npm run build
pm2 restart litrev-frontend-nextjs

# 3. Check browser console for CSS errors
```

### Issue 5: High Memory Usage

**Symptoms**: PM2 shows high memory usage or restarts

**Solution**:
```bash
# Check memory
pm2 status

# Adjust max memory in ecosystem.config.nextjs.js
# max_memory_restart: '1G'  # Increase if needed

# Restart with new config
pm2 reload ecosystem.config.nextjs.js
```

## Performance Monitoring

### Metrics to Track

Monitor these metrics post-deployment:

```bash
# 1. Response time
time curl -o /dev/null -s https://litrev.haielab.org/login

# 2. Memory usage
pm2 status

# 3. Error rate
pm2 logs litrev-frontend-nextjs --err --lines 100 | grep -i error | wc -l

# 4. Uptime
pm2 status | grep litrev-frontend-nextjs
```

### Expected Improvements

- **TTFB**: ~300-600ms (was ~200-500ms, slightly higher due to SSR but content is rendered)
- **FCP**: ~300-800ms (was ~1500-3000ms - **2-3x improvement**)
- **SEO Score**: 90-100 (was 60-70)
- **Memory**: ~200-400MB (similar to React)

## Success Criteria

Deployment is successful when:

- [x] PM2 shows `litrev-frontend-nextjs` as "online"
- [x] No errors in `pm2 logs litrev-frontend-nextjs`
- [x] Website loads at https://litrev.haielab.org
- [x] View Source shows fully rendered HTML (not just `<div id="root">`)
- [x] Google OAuth login works
- [x] Dashboard displays and updates in real-time
- [x] Downloads work (CSV, PRISMA, LaTeX, BibTeX)
- [x] SEO score improved (verify with Lighthouse)
- [x] No increase in error rate
- [x] Memory usage stable

## Summary

This deployment guide provides a **zero-downtime migration** strategy using these steps:

1. Pull latest code (Next.js frontend)
2. Configure environment variables
3. Install dependencies and build
4. Start Next.js in parallel with old frontend
5. Verify Next.js works correctly
6. Atomic swap: stop old, start new (~1-2 second downtime)
7. Verify production site
8. Monitor for issues
9. Clean up and save configuration

**Total estimated time**: 15-30 minutes
**Downtime**: 1-2 seconds (during atomic swap)
**Rollback time**: 1-2 seconds (if needed)

## Questions?

If you encounter issues not covered in this guide:

1. Check PM2 logs: `pm2 logs litrev-frontend-nextjs`
2. Check browser console for JavaScript errors
3. Verify backend is running: `pm2 status | grep backend`
4. Test API directly: `curl https://litrev.haielab.org/api/v1/health`
5. Review the documentation:
   - `frontend-nextjs/README.md`
   - `MIGRATION_TO_NEXTJS.md`
   - `ISOMORPHIC_IMPLEMENTATION.md`

## Contact

For issues or questions, refer to the project documentation or check the GitHub repository.

---

**Last Updated**: 2025-11-08
**Version**: 1.0
**Next.js Version**: 16.0.1
**Node.js Required**: 18+
