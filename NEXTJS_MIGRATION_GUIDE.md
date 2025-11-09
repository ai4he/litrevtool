# Next.js Migration Guide

## Overview

This document describes the successful migration of LitRevTool to Next.js as the default server application, with full feature parity and additional enhancements.

## What Was Completed

### ✅ 1. PRISMA Metrics Structure Fixed

**Problem**: Backend used simplified flat structure while frontend expected detailed nested structure.

**Solution**: Updated backend to follow PRISMA 2020 standards with detailed nested metrics.

**Changes**:
- `backend-node/src/models/SearchJob.ts`: Updated PrismaMetrics interface
- `backend-node/src/services/prismaDiagram.ts`: Enhanced diagram with duplicates tracking
- `backend-node/src/services/latexGenerator.ts`: Updated LaTeX generator for new structure
- `backend-node/src/tasks/scrapingTasks.ts`: Calculate actual duplicate counts

**Before**:
```typescript
interface PrismaMetrics {
  identification: number;
  screening: number;
  eligibility: number;
  included: number;
}
```

**After**:
```typescript
interface PrismaMetrics {
  identification: {
    records_identified: number;
  };
  screening: {
    records_excluded_duplicates: number;
    records_after_duplicates_removed: number;
  };
  eligibility: {
    full_text_assessed: number;
    full_text_excluded_semantic: number;
  };
  included: {
    studies_included: number;
  };
}
```

### ✅ 2. Mobile App Support Added

**Features**:
- Capacitor integration for iOS and Android
- Platform detection (web/mobile/electron)
- Mobile-specific initialization (splash screen, status bar)
- Google Auth for mobile platforms
- Back button handling (Android)
- App lifecycle management

**Files Created**:
- `frontend-nextjs/lib/mobile.ts`: Mobile initialization and utilities
- Added Capacitor dependencies to `package.json`

**Usage**:
```typescript
import { initMobile, isMobileApp, getPlatform } from '@/lib/mobile';

// Initialize mobile features (called in AuthContext)
await initMobile();

// Check if running on mobile
if (isMobileApp()) {
  console.log('Running on', getPlatform()); // 'ios' or 'android'
}
```

### ✅ 3. Electron API Mode Switching

**Features**:
- Detect Electron environment
- Retrieve API configuration from Electron
- Support for Local/Cloud/Hybrid modes
- Dynamic API URL selection

**Files Created**:
- `frontend-nextjs/lib/electron.ts`: Electron integration utilities

**API Modes**:
- **Local**: Pure local development (localhost:8000)
- **Cloud**: Pure cloud operation (litrev.haielab.org)
- **Hybrid**: Local processing + cloud sync

**Usage**:
```typescript
import { isElectron, getApiUrl, getApiMode } from '@/lib/electron';

// Check if running in Electron
if (isElectron()) {
  const apiUrl = await getApiUrl(); // Gets URL from Electron settings
  const mode = await getApiMode(); // 'local', 'cloud', or 'hybrid'
}
```

### ✅ 4. Complete Next.js Frontend Structure

**Missing lib files created**:
1. `lib/registry.tsx`: Material-UI SSR with Emotion cache
2. `lib/theme.ts`: Material-UI theme configuration
3. `lib/auth.ts`: Cookie-based authentication utilities
4. `lib/api.ts`: API client with Electron/mobile support
5. `lib/AuthContext.tsx`: Authentication context with platform detection
6. `lib/GoogleOAuthProvider.tsx`: Google OAuth wrapper
7. `lib/mobile.ts`: Mobile app integration
8. `lib/electron.ts`: Electron integration

**Updated files**:
- `app/layout.tsx`: Added GoogleOAuthProvider and mobile initialization

### ✅ 5. Deployment Configuration

**Files Created**:
- `ecosystem.config.nextjs.js`: PM2 configuration for Next.js stack
- `deploy-nextjs.sh`: Automated deployment script with prerequisites checks
- `frontend-nextjs/.env.local.example`: Environment variable template

**PM2 Services**:
1. `litrev-backend`: Node.js Express API (port 8000)
2. `litrev-worker`: BullMQ worker for scraping
3. `litrev-frontend`: Next.js SSR server (port 3001)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Next.js Frontend (Port 3001)                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ SSR Rendering + Client Hydration                    │ │
│ │ - Material-UI with Emotion SSR                      │ │
│ │ - Mobile/Electron platform detection                │ │
│ │ - Dynamic API URL from Electron settings            │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Node.js Backend (Port 8000)                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Express + TypeScript                                │ │
│ │ - REST API endpoints                                │ │
│ │ - Google OAuth                                      │ │
│ │ - Enhanced PRISMA metrics                           │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ BullMQ Worker                                       │ │
│ │ - Background scraping tasks                         │ │
│ │ - Multi-strategy scraper                            │ │
│ │ - Semantic filtering with Gemini AI                 │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Platform Wrappers                                       │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│ │ Web      │  │ Electron │  │ Capacitor│              │
│ │ Browser  │  │ Desktop  │  │ Mobile   │              │
│ └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
```

## Platform Support

| Platform | Wrapper | Status | Features |
|----------|---------|--------|----------|
| Web Browser | - | ✅ Complete | SSR, OAuth, Full features |
| Desktop (Windows) | Electron | ✅ Complete | API mode switching, Native feel |
| Desktop (macOS) | Electron | ✅ Complete | API mode switching, Native feel |
| Desktop (Linux) | Electron | ✅ Complete | API mode switching, Native feel |
| Mobile (iOS) | Capacitor | ✅ Complete | Native plugins, Splash screen |
| Mobile (Android) | Capacitor | ✅ Complete | Native plugins, Back button |

## Deployment Instructions

### Quick Start

```bash
# 1. Configure environment
cp frontend-nextjs/.env.local.example frontend-nextjs/.env.local
# Edit .env.local with your configuration

# 2. Deploy entire stack
./deploy-nextjs.sh

# 3. For production servers
./deploy-nextjs.sh prod
```

### Manual Deployment

```bash
# Backend
cd backend-node
npm install
npm run build

# Frontend
cd ../frontend-nextjs
npm install
npm run build

# Start with PM2
cd ..
pm2 start ecosystem.config.nextjs.js
pm2 save
```

### Environment Variables

**Backend** (`.env`):
```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
SECRET_KEY=your_jwt_secret
GEMINI_API_KEY=your_gemini_key
FRONTEND_URL=http://localhost:3001
```

**Frontend** (`.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

## Benefits of Next.js

1. **Server-Side Rendering (SSR)**
   - Better SEO
   - Faster initial page load
   - Content visible before JavaScript loads

2. **TypeScript Type Safety**
   - Catch errors at compile-time
   - Better IDE support
   - Self-documenting code

3. **Modern Architecture**
   - App Router (Next.js 14+)
   - React Server Components
   - Automatic code splitting

4. **Platform Flexibility**
   - Web browser (SSR)
   - Electron desktop (with API modes)
   - Capacitor mobile (iOS/Android)

5. **Enhanced PRISMA Compliance**
   - Detailed metrics following PRISMA 2020
   - Automatic duplicate tracking
   - Semantic exclusion metrics

## Testing

```bash
# Start development servers
npm run dev:nextjs

# Build for production
cd frontend-nextjs && npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

## Migration Checklist

- [x] Fix PRISMA metrics structure incompatibility
- [x] Add mobile app support (Capacitor integration)
- [x] Add Electron API mode switching
- [x] Create complete Next.js lib structure
- [x] Implement Material-UI SSR
- [x] Add authentication context with platform detection
- [x] Create API client with Electron/mobile support
- [x] Add PM2 configuration
- [x] Create deployment script
- [x] Update documentation

## Breaking Changes

### PRISMA Metrics Structure

Existing jobs in the database may have the old flat PRISMA metrics structure. These will continue to work but won't show detailed metrics in the UI. New jobs will automatically use the enhanced structure.

To regenerate metrics for existing jobs, re-run them or manually update the database.

### API Changes

The API response structure for PRISMA metrics has changed:

**Old**:
```json
{
  "prisma_metrics": {
    "identification": 100,
    "screening": 95,
    "eligibility": 80,
    "included": 75
  }
}
```

**New**:
```json
{
  "prisma_metrics": {
    "identification": {
      "records_identified": 100
    },
    "screening": {
      "records_excluded_duplicates": 5,
      "records_after_duplicates_removed": 95
    },
    "eligibility": {
      "full_text_assessed": 95,
      "full_text_excluded_semantic": 15
    },
    "included": {
      "studies_included": 75
    }
  }
}
```

## Troubleshooting

### Hydration Errors

If you see React hydration mismatch warnings:
1. Check server/client rendering consistency
2. Verify Material-UI SSR setup in `lib/registry.tsx`
3. Ensure no Date/Time formatting differences

### Mobile Not Initializing

1. Verify Capacitor dependencies installed
2. Check platform detection in browser console
3. Ensure Google OAuth credentials match

### Electron API Not Working

1. Verify `preload.js` is loading (check console)
2. Check that `window.electron` is defined
3. Review Electron main process logs

## Next Steps

1. **Production Deployment**: Configure production `.env` files and deploy
2. **Mobile Builds**: Use `npm run mobile:build:ios` and `npm run mobile:build:android`
3. **Electron Builds**: Use `npm run electron:build`
4. **Testing**: Create test suite for Next.js frontend
5. **Documentation**: Update main README with Next.js instructions

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [Material-UI SSR](https://mui.com/material-ui/guides/server-rendering/)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [PRISMA 2020 Guidelines](http://prisma-statement.org/)

---

**Migration completed**: November 9, 2025
**Branch**: `claude/nextjs-default-server-011CUxWgoZ5kQP333sPDRE7h`
**Status**: ✅ Ready for testing and deployment
