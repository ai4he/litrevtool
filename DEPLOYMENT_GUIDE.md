# LitRevTool Node.js Backend - Complete Deployment Guide

This guide provides comprehensive instructions for deploying the Node.js backend for LitRevTool, including migration from the Python backend.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Node.js Backend Deployment](#nodejs-backend-deployment)
5. [Production Configuration](#production-configuration)
6. [Migration from Python Backend](#migration-from-python-backend)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Rollback Procedures](#rollback-procedures)
10. [Architecture Overview](#architecture-overview)
11. [Security Checklist](#security-checklist)

---

## Quick Start

For the fastest deployment using the automated script:

```bash
# Make deployment script executable
chmod +x deploy-node.sh

# Run automated deployment
./deploy-node.sh
```

This will:
- Check all prerequisites
- Install dependencies
- Build TypeScript
- Stop Python backend services
- Start Node.js backend services
- Run health checks

**Deployment takes approximately 5-10 minutes.**

---

## Prerequisites

### Required Software

1. **Node.js 18+**
   ```bash
   # Check version
   node --version  # Should be v18.x or higher

   # Install if needed (Ubuntu/Debian)
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Redis Server**
   ```bash
   # Check if running
   redis-cli ping  # Should return PONG

   # Install if needed
   sudo apt update
   sudo apt install -y redis-server
   sudo systemctl enable redis-server
   sudo systemctl start redis-server
   ```

3. **PM2 Process Manager**
   ```bash
   # Install globally
   sudo npm install -g pm2

   # Verify installation
   pm2 --version
   ```

4. **Git** (for cloning/updating repository)
   ```bash
   sudo apt install -y git
   ```

### System Requirements

- **RAM**: Minimum 2GB, Recommended 4GB
- **Disk**: Minimum 5GB free space
- **CPU**: 2+ cores recommended
- **OS**: Ubuntu 20.04+, Debian 10+, or compatible Linux

### Optional Components

- **Nginx** (for production reverse proxy)
- **Certbot** (for SSL/TLS certificates)
- **UFW** (for firewall configuration)

---

## Initial Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/ai4he/litrevtool.git
cd litrevtool

# Or pull latest changes if already cloned
git pull origin main
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit with your credentials
nano .env
```

Required environment variables:
```env
# Google OAuth (Required)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# JWT Secret (Required - change in production!)
SECRET_KEY=change_this_to_a_random_string_in_production

# Gemini AI (Optional - for semantic filtering)
GEMINI_API_KEY=your_gemini_api_key_here

# Email Notifications (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Frontend URL (Change for production)
FRONTEND_URL=http://localhost:3001
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - Development: `http://localhost:8000/api/v1/auth/google/callback`
   - Production: `https://yourdomain.com/api/v1/auth/google/callback`
4. Copy Client ID and Secret to `.env`

---

## Node.js Backend Deployment

### Option A: Automated Deployment (Recommended)

The automated deployment script handles everything:

```bash
# Make executable
chmod +x deploy-node.sh

# Run deployment
./deploy-node.sh
```

The script will:
- ✅ Check Node.js, npm, Redis, PM2
- ✅ Install Redis if missing
- ✅ Install npm dependencies
- ✅ Install Playwright browsers (Chromium)
- ✅ Build TypeScript code
- ✅ Create required directories
- ✅ Stop old Python services
- ✅ Start Node.js services with PM2
- ✅ Run health checks

**Expected output:**
```
==========================================
   LitRevTool Node.js Deployment
==========================================

Step 1: Checking prerequisites...
✓ Node.js found: v18.17.0
✓ npm found: 9.6.7
✓ Redis found
✓ Redis is running
✓ PM2 found: 5.3.0

Step 2: Setting up Node.js backend...
✓ Dependencies installed
✓ Playwright browsers installed
✓ TypeScript compiled successfully

...

==========================================
   Deployment Complete!
==========================================

Frontend:  http://localhost:3001
Backend:   http://localhost:8000
API Docs:  http://localhost:8000/api/v1/*
```

See complete documentation in sections below for manual deployment, production configuration, monitoring, and troubleshooting.

---

For full documentation, see the complete sections in this file covering:
- Manual deployment steps
- Production configuration (Nginx, SSL, firewall)
- Migration strategies from Python backend
- Monitoring and maintenance procedures
- Comprehensive troubleshooting guide
- Rollback procedures
- Architecture overview
- Security checklist

**Repository:** https://github.com/ai4he/litrevtool
**Last Updated:** January 2025
