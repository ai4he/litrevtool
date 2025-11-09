#!/bin/bash

###############################################################################
# LitRevTool Deployment Script - Next.js Edition
#
# This script deploys the complete LitRevTool stack with Next.js frontend:
# - Node.js backend (TypeScript)
# - BullMQ worker
# - Next.js frontend (SSR)
###############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     LitRevTool Deployment - Next.js Edition              ║"
echo "║     Automated deployment for production environments     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

###############################################################################
# Prerequisites Check
###############################################################################

log_info "Checking prerequisites..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi
log_success "Node.js $(node --version) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    log_error "npm is not installed. Please install npm first."
    exit 1
fi
log_success "npm $(npm --version) detected"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    log_warning "PM2 is not installed. Installing PM2 globally..."
    npm install -g pm2
fi
log_success "PM2 $(pm2 --version) detected"

# Check if Redis is running
if ! command -v redis-cli &> /dev/null; then
    log_error "Redis is not installed. Please install Redis first."
    exit 1
fi

if ! redis-cli ping &> /dev/null; then
    log_error "Redis is not running. Please start Redis: sudo systemctl start redis"
    exit 1
fi
log_success "Redis is running"

# Check if .env file exists
if [ ! -f ".env" ]; then
    log_error ".env file not found. Please create one from .env.example"
    exit 1
fi
log_success ".env file found"

###############################################################################
# Backend Deployment
###############################################################################

log_info "Deploying Node.js backend..."

cd backend-node

# Create logs directory
mkdir -p logs

# Install dependencies
log_info "Installing backend dependencies..."
npm install

# Build TypeScript
log_info "Building TypeScript backend..."
npm run build

cd ..

log_success "Backend deployed successfully"

###############################################################################
# Frontend Deployment (Next.js)
###############################################################################

log_info "Deploying Next.js frontend..."

cd frontend-nextjs

# Create logs directory
mkdir -p logs

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    log_warning ".env.local not found. Creating from example..."
    cp .env.local.example .env.local
    log_warning "Please edit frontend-nextjs/.env.local with your configuration"
fi

# Install dependencies
log_info "Installing frontend dependencies..."
npm install

# Build Next.js
log_info "Building Next.js frontend (this may take a few minutes)..."
npm run build

cd ..

log_success "Frontend deployed successfully"

###############################################################################
# PM2 Process Management
###############################################################################

log_info "Managing PM2 processes..."

# Stop existing processes
log_info "Stopping existing PM2 processes..."
pm2 delete all 2>/dev/null || true

# Start services with PM2
log_info "Starting services with PM2..."
pm2 start ecosystem.config.nextjs.js

# Save PM2 configuration
log_info "Saving PM2 configuration..."
pm2 save

# Setup PM2 startup (optional, for production servers)
if [ "$1" == "prod" ]; then
    log_info "Setting up PM2 startup script..."
    pm2 startup
fi

log_success "PM2 processes started successfully"

###############################################################################
# Verification
###############################################################################

log_info "Verifying deployment..."

# Wait for services to start
sleep 5

# Check PM2 status
pm2 status

# Test backend health
log_info "Testing backend health..."
if curl -f http://localhost:8000/health &> /dev/null; then
    log_success "Backend is responding on http://localhost:8000"
else
    log_error "Backend health check failed"
fi

# Test frontend
log_info "Testing frontend..."
if curl -f http://localhost:3001 &> /dev/null; then
    log_success "Frontend is responding on http://localhost:3001"
else
    log_error "Frontend health check failed"
fi

###############################################################################
# Summary
###############################################################################

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║              Deployment Complete!                        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Services:"
echo "  • Backend API:    http://localhost:8000"
echo "  • Frontend:       http://localhost:3001"
echo ""
echo "Management Commands:"
echo "  • View logs:      pm2 logs"
echo "  • Check status:   pm2 status"
echo "  • Restart:        pm2 restart all"
echo "  • Stop:           pm2 stop all"
echo "  • Monitor:        pm2 monit"
echo ""
echo "Next Steps:"
echo "  1. Configure .env and frontend-nextjs/.env.local"
echo "  2. Test the application at http://localhost:3001"
echo "  3. Review PM2 logs: pm2 logs"
echo ""

log_success "Deployment successful! 🚀"
