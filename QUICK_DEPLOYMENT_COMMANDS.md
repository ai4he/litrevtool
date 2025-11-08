# Quick Deployment Commands - Next.js Migration

**IMPORTANT**: Read `PRODUCTION_DEPLOYMENT_GUIDE.md` for full details. This is a quick reference only.

## Quick Command Sequence (Copy & Paste)

### 1. Pull Latest Code

```bash
cd /home/ubuntu/litrevtool  # or your project path
git fetch origin
git checkout claude/make-app-isomorphic-011CUuY2CQ8noVpagVJEkC5Z
git pull origin claude/make-app-isomorphic-011CUuY2CQ8noVpagVJEkC5Z
```

### 2. Configure Environment

```bash
cd frontend-nextjs

# IMPORTANT: Edit this with your actual Google Client ID
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://litrev.haielab.org
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
NEXT_PUBLIC_APP_URL=https://litrev.haielab.org
EOF

# Get your Google Client ID from backend .env:
cat ../.env | grep GOOGLE_CLIENT_ID
# Copy the value and update .env.local above
```

### 3. Install & Build

```bash
npm install
npm run build
mkdir -p logs
```

### 4. Start Next.js (Parallel to Old)

```bash
cd /home/ubuntu/litrevtool
pm2 start ecosystem.config.nextjs.js --only litrev-frontend-nextjs
pm2 status
```

### 5. Verify Next.js Works

```bash
# Check logs for errors
pm2 logs litrev-frontend-nextjs --lines 50

# Test locally
curl -I http://localhost:3001

# Test SSR is working
curl -s http://localhost:3001/login | grep -i "litrevtool"
```

**CRITICAL**: If any errors, DO NOT PROCEED. Debug first.

### 6. Atomic Swap (1-2 seconds downtime)

```bash
# This stops old React and starts Next.js
pm2 stop litrev-frontend && pm2 restart litrev-frontend-nextjs

# Check status
pm2 status
```

### 7. Verify Production

```bash
# Check site is up
curl -I https://litrev.haielab.org

# Check SSR
curl -s https://litrev.haielab.org/login | grep -i "litrevtool"

# Check logs
pm2 logs litrev-frontend-nextjs --lines 30

# Open browser and test:
# - Login with Google OAuth
# - View dashboard
# - Create/view jobs
# - Download files
```

### 8. Clean Up & Save

```bash
pm2 delete litrev-frontend
pm2 save
```

## Emergency Rollback

```bash
# If something goes wrong, instant rollback:
pm2 stop litrev-frontend-nextjs
pm2 restart litrev-frontend

# Verify
pm2 status
curl -I https://litrev.haielab.org
```

## Common Issues

### Next.js won't start
```bash
pm2 logs litrev-frontend-nextjs --err --lines 100
cd frontend-nextjs && npm install && npm run build
pm2 restart litrev-frontend-nextjs
```

### Authentication not working
```bash
# Check Google Client ID matches
cat frontend-nextjs/.env.local | grep GOOGLE_CLIENT_ID
cat .env | grep GOOGLE_CLIENT_ID
```

### Port 3001 in use
```bash
lsof -i :3001
pm2 stop litrev-frontend
```

## Pre-Flight Checklist

Before starting:
- [ ] Backend services running (`pm2 status`)
- [ ] At least 2GB disk space (`df -h`)
- [ ] Node.js 18+ (`node --version`)
- [ ] Backup created (`pm2 save`)

## Success Criteria

After deployment:
- [ ] PM2 shows `litrev-frontend-nextjs` online
- [ ] Website loads at https://litrev.haielab.org
- [ ] View Source shows rendered HTML (not just `<div id="root">`)
- [ ] Login works
- [ ] Dashboard shows jobs
- [ ] Downloads work

## Full Documentation

For detailed information, read:
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `frontend-nextjs/README.md` - Next.js frontend documentation
- `MIGRATION_TO_NEXTJS.md` - Migration details
- `ISOMORPHIC_IMPLEMENTATION.md` - Architecture overview

---

**Deployment Time**: 15-30 minutes
**Downtime**: 1-2 seconds (during atomic swap)
**Rollback Time**: 1-2 seconds
