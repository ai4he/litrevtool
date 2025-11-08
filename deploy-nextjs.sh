#!/bin/bash

###############################################################################
# LitRevTool Next.js Deployment Script
###############################################################################
# This script deploys the Next.js SSR frontend with the existing backend
#
# Usage:
#   ./deploy-nextjs.sh          # Deploy for development
#   ./deploy-nextjs.sh prod     # Deploy for production
###############################################################################

set -e  # Exit on error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend-nextjs"
ENV_MODE="${1:-dev}"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   LitRevTool Next.js SSR Deployment Script           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if frontend-nextjs directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}✗ Error: frontend-nextjs directory not found!${NC}"
    exit 1
fi

echo -e "${BLUE}→ Mode: $ENV_MODE${NC}"
echo ""

###############################################################################
# Step 1: Check Prerequisites
###############################################################################
echo -e "${BLUE}[1/6] Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}  ✓ Node.js: $NODE_VERSION${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo -e "${GREEN}  ✓ npm: $NPM_VERSION${NC}"

# Check PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}✗ PM2 is not installed${NC}"
    echo -e "${YELLOW}  Installing PM2...${NC}"
    npm install -g pm2
fi
PM2_VERSION=$(pm2 --version)
echo -e "${GREEN}  ✓ PM2: $PM2_VERSION${NC}"

echo ""

###############################################################################
# Step 2: Install Dependencies
###############################################################################
echo -e "${BLUE}[2/6] Installing Next.js frontend dependencies...${NC}"
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}  Installing from scratch...${NC}"
    npm install
else
    echo -e "${GREEN}  Dependencies already installed, checking for updates...${NC}"
    npm install
fi

echo -e "${GREEN}  ✓ Dependencies installed${NC}"
echo ""

###############################################################################
# Step 3: Build Next.js Application
###############################################################################
echo -e "${BLUE}[3/6] Building Next.js application...${NC}"

# Remove old build
if [ -d ".next" ]; then
    echo -e "${YELLOW}  Removing old build...${NC}"
    rm -rf .next
fi

# Build
npm run build

echo -e "${GREEN}  ✓ Next.js build completed${NC}"
echo ""

###############################################################################
# Step 4: Create Logs Directory
###############################################################################
echo -e "${BLUE}[4/6] Setting up logs directory...${NC}"
mkdir -p "$FRONTEND_DIR/logs"
echo -e "${GREEN}  ✓ Logs directory ready${NC}"
echo ""

###############################################################################
# Step 5: Configure Environment
###############################################################################
echo -e "${BLUE}[5/6] Configuring environment...${NC}"

if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
    echo -e "${YELLOW}  Creating .env.local from template...${NC}"
    cat > "$FRONTEND_DIR/.env.local" << EOF
# Next.js Environment Variables for LitRevTool
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
NEXT_PUBLIC_APP_URL=http://localhost:3001
EOF
    echo -e "${YELLOW}  ⚠ Please update .env.local with your Google Client ID${NC}"
else
    echo -e "${GREEN}  ✓ .env.local already exists${NC}"
fi

echo ""

###############################################################################
# Step 6: Deploy with PM2
###############################################################################
echo -e "${BLUE}[6/6] Deploying with PM2...${NC}"
cd "$SCRIPT_DIR"

# Stop old frontend if running
if pm2 list | grep -q "litrev-frontend-nextjs"; then
    echo -e "${YELLOW}  Stopping old Next.js frontend...${NC}"
    pm2 stop litrev-frontend-nextjs
    pm2 delete litrev-frontend-nextjs
fi

# Start with Next.js config
if [ "$ENV_MODE" = "prod" ]; then
    echo -e "${BLUE}  Starting in PRODUCTION mode...${NC}"
    pm2 start ecosystem.config.nextjs.js --env production
else
    echo -e "${BLUE}  Starting in DEVELOPMENT mode...${NC}"
    pm2 start ecosystem.config.nextjs.js
fi

# Save PM2 configuration
pm2 save

echo -e "${GREEN}  ✓ Next.js frontend deployed${NC}"
echo ""

###############################################################################
# Deployment Complete
###############################################################################
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✓ Next.js SSR Deployment Complete                  ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Check logs: ${YELLOW}pm2 logs litrev-frontend-nextjs${NC}"
echo -e "  2. Monitor services: ${YELLOW}pm2 monit${NC}"
echo -e "  3. View status: ${YELLOW}pm2 status${NC}"
echo -e "  4. Access app: ${YELLOW}http://localhost:3001${NC}"
echo ""
echo -e "${BLUE}Verify SSR:${NC}"
echo -e "  1. Visit ${YELLOW}http://localhost:3001${NC}"
echo -e "  2. View page source (Ctrl+U) - you should see rendered HTML"
echo -e "  3. Check for server-rendered content before JavaScript loads"
echo ""
