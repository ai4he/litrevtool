# Archive - Unsupported Legacy Code

⚠️ **WARNING: ALL CODE IN THIS DIRECTORY IS UNSUPPORTED AND FOR REFERENCE ONLY** ⚠️

This directory contains legacy code from previous versions of LitRevTool. These implementations are **no longer maintained** and should **NOT be used** in production.

## Archive Contents

### Backends (`backends/`)
- **Python Backend** (`backend-python-backup/`) - Original FastAPI + Celery implementation
  - Status: ❌ DEPRECATED
  - Replaced by: Node.js backend (`backend-node/`)
  - Issues: Schema incompatibilities, dependency conflicts, harder deployment

- **Node.js Backup** (`backend-node-backup/`) - Old Node.js implementation snapshot
  - Status: ❌ DEPRECATED
  - Use: `backend-node/` instead

### Frontends (`frontends/`)
- **Next.js Frontend** (`frontend-nextjs/`) - Experimental Next.js implementation
  - Status: ❌ DEPRECATED
  - Replaced by: React frontend (`frontend/`)
  - Issues: Unnecessary complexity, abandoned migration

### Configs (`configs/`)
- **ecosystem.config.js** - Original PM2 config for Python backend
- **ecosystem.config.python.js** - Python-specific PM2 config
- **ecosystem.config.nextjs.js** - Next.js-specific PM2 config

### Deployment Scripts (`deployment-scripts/`)
- **deploy-python.sh** - Python deployment automation
- **deploy-nextjs.sh** - Next.js deployment automation

### Documentation (`docs/`)
- Migration guides, deployment instructions for deprecated stacks

## Current Supported Stack

✅ **USE THESE INSTEAD:**

### Backend
- **Location:** `backend-node/`
- **Stack:** Node.js + TypeScript + Express + BullMQ + SQLite
- **Config:** `ecosystem.config.node.js`
- **Deploy:** `./deploy-node.sh` or `npm run deploy`

### Frontend
- **Location:** `frontend/`
- **Stack:** React + Material-UI
- **Config:** Part of `ecosystem.config.node.js`

### Mobile
- **Location:** `mobile/`
- **Stack:** Capacitor (iOS + Android)
- **Build:** `npm run mobile:build:ios` or `npm run mobile:build:android`

### Desktop
- **Location:** `electron/`
- **Stack:** Electron
- **Build:** `npm run electron:build`

### CLI
- **Location:** `cli/`
- **Stack:** Node.js CLI
- **Install:** `npm run cli:install`

## Why These Were Archived

### Python Backend
- **Schema mismatches** between Python and Node.js implementations
- **Deployment complexity** (virtualenv, Celery, multiple workers)
- **Dependency conflicts** and version management issues
- **Migration to unified JavaScript stack** for easier development

### Next.js Frontend
- **Abandoned migration** - complexity didn't justify benefits
- **React frontend is sufficient** and well-established
- **Better to maintain one frontend** than split resources

### Old Configs
- **Breaking changes** in application architecture
- **Port conflicts** and service naming issues
- **Replaced by cleaner, unified configs**

## Do NOT Use This Code

These implementations will NOT receive:
- ❌ Bug fixes
- ❌ Security updates
- ❌ Feature updates
- ❌ Support

**For any new development or deployment, use the current stack documented in the main README.md**

## Reference Only

This code is preserved for:
- Historical reference
- Understanding migration decisions
- Emergency rollback scenarios (with extreme caution)
- Learning from past architecture choices

---

**Last Updated:** November 8, 2025
**Archived Reason:** Consolidation to Node.js full-stack implementation
