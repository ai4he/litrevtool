# LitRevTool Next.js - Quick Start Guide

This guide will help you quickly get the isomorphic (SSR) version of LitRevTool up and running.

## Prerequisites

- Node.js 18+ installed
- FastAPI backend running on port 8000
- Google OAuth credentials configured

## Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
cd frontend-nextjs
npm install
```

### 2. Configure Environment

Edit `.env.local`:

```bash
# Copy your Google Client ID from the backend .env file
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here

# API URL (development)
NEXT_PUBLIC_API_URL=http://localhost:8000

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 3. Build the Application

```bash
npm run build
```

### 4. Start the Server

Choose one option:

**Option A: Development Mode** (with hot reload)
```bash
npm run dev
```

**Option B: Production Mode** (optimized)
```bash
npm start
```

**Option C: PM2 (recommended for production)**
```bash
cd ..
./deploy-nextjs.sh prod
```

### 5. Access the Application

Visit: **http://localhost:3001**

## Verify SSR is Working

1. Open **http://localhost:3001** in your browser
2. Right-click → "View Page Source" (or press Ctrl+U / Cmd+U)
3. You should see:
   - Full HTML content (not just `<div id="root"></div>`)
   - Material-UI styles in `<style data-emotion="mui">` tags
   - Meta tags and page title

## Available Commands

```bash
npm run dev         # Development server with hot reload
npm run build       # Build optimized production bundle
npm run start       # Start production server
npm run lint        # Run ESLint
npm run type-check  # Run TypeScript type checking
```

## Troubleshooting

### Build Fails

```bash
# Clean and reinstall
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

### Authentication Not Working

1. Verify `NEXT_PUBLIC_GOOGLE_CLIENT_ID` matches backend
2. Check backend is running: `curl http://localhost:8000/api/v1/health`
3. Check browser console for errors

### Styles Not Loading

```bash
# Clear build cache
rm -rf .next
npm run build
```

### Port Already in Use

```bash
# Kill process on port 3001
npx kill-port 3001

# Or use a different port
PORT=3002 npm start
```

## What's Different from React Version?

- **Server-Side Rendering**: Pages pre-rendered on server
- **Cookie-Based Auth**: Instead of localStorage
- **TypeScript**: Full type safety
- **Next.js Routing**: File-based instead of react-router
- **Better SEO**: Search engines can index content
- **Faster Load**: Content visible before JavaScript loads

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Review [MIGRATION_TO_NEXTJS.md](../MIGRATION_TO_NEXTJS.md) for migration guide
- Configure production environment variables
- Set up PM2 for process management
- Configure Nginx reverse proxy (production only)

## Support

For issues or questions:
1. Check logs: `pm2 logs litrev-frontend-nextjs`
2. Review [README.md](README.md) troubleshooting section
3. Check browser console for JavaScript errors
4. Verify backend API is accessible

## Production Deployment

For production deployment, see:
- [README.md](README.md) - Production Deployment section
- [../MIGRATION_TO_NEXTJS.md](../MIGRATION_TO_NEXTJS.md) - Complete migration guide
- Use the deployment script: `../deploy-nextjs.sh prod`
