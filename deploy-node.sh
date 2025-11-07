#!/bin/bash

# LitRevTool Node.js Backend Deployment Script
# This script automates the deployment of the Node.js backend

set -e  # Exit on error

echo "=========================================="
echo "   LitRevTool Node.js Deployment"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

# Check if running from project root
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

PROJECT_DIR=$(pwd)

echo "Step 1: Checking prerequisites..."
echo "-----------------------------------"

# Check for Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18 or higher is required. Found: $(node --version)"
    exit 1
fi
print_success "Node.js found: $(node --version)"

# Check for npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi
print_success "npm found: $(npm --version)"

# Check for Redis
if ! command -v redis-server &> /dev/null; then
    print_info "Redis is not installed. Installing Redis..."
    sudo apt update
    sudo apt install -y redis-server
    sudo systemctl enable redis-server
    sudo systemctl start redis-server
    print_success "Redis installed"
else
    print_success "Redis found"
fi

# Check if Redis is running
if ! redis-cli ping &> /dev/null; then
    print_info "Redis is not running. Starting Redis..."
    sudo systemctl start redis-server || print_error "Failed to start Redis. Please check the service."
fi
print_success "Redis is running"

# Check for PM2
if ! command -v pm2 &> /dev/null; then
    print_info "PM2 is not installed. Installing PM2 globally..."
    sudo npm install -g pm2
fi
print_success "PM2 found: $(pm2 --version)"

echo ""
echo "Step 2: Setting up Node.js backend..."
echo "-----------------------------------"

cd "$PROJECT_DIR/backend-node"

# Install dependencies
print_step "Installing npm dependencies..."
npm install
print_success "Dependencies installed"

# Install Playwright browsers
print_step "Installing Playwright browsers..."
npx playwright install chromium
print_success "Playwright browsers installed"

# Build TypeScript
print_step "Building TypeScript..."
npm run build
print_success "TypeScript compiled successfully"

# Create necessary directories
print_step "Creating required directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p uploads/screenshots
print_success "Directories created"

# Initialize database (uses same DB as Python backend if exists)
if [ ! -f "$PROJECT_DIR/backend-node/litrevtool.db" ] && [ ! -f "$PROJECT_DIR/backend/litrevtool.db" ]; then
    print_info "Database will be created on first run"
else
    print_success "Database already exists"
fi

echo ""
echo "Step 3: Setting up React frontend..."
echo "-----------------------------------"

cd "$PROJECT_DIR/frontend"

# Create logs directory
mkdir -p logs

# Install dependencies
print_step "Installing npm dependencies..."
npm install
print_success "npm dependencies installed"

# Build production frontend
print_step "Building production frontend with memory optimizations..."
GENERATE_SOURCEMAP=false NODE_OPTIONS="--max-old-space-size=512" REACT_APP_API_URL=https://litrev.haielab.org npm run build
print_success "Frontend built successfully"

# Deploy to Nginx directory
if [ -d "build" ]; then
    print_step "Deploying frontend to /var/www/litrev..."
    sudo mkdir -p /var/www/litrev
    sudo cp -r build/* /var/www/litrev/
    sudo chown -R www-data:www-data /var/www/litrev
    print_success "Frontend deployed to /var/www/litrev"
else
    print_error "Build directory not found!"
    exit 1
fi

echo ""
echo "Step 4: Checking environment configuration..."
echo "-----------------------------------"

cd "$PROJECT_DIR"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        print_info "Creating .env file from .env.example..."
        cp .env.example .env
        print_info "Please edit .env file with your Google OAuth credentials"
    else
        print_error ".env file not found. Please create one with required configurations."
        exit 1
    fi
else
    print_success ".env file exists"
fi

# Check if Google OAuth credentials are set
if grep -q "your_google_client_id_here" .env 2>/dev/null || grep -q "GOOGLE_CLIENT_ID=" .env | grep -q "^GOOGLE_CLIENT_ID=$" 2>/dev/null; then
    print_info "⚠️  Please configure Google OAuth credentials in .env file"
fi

echo ""
echo "Step 5: Stopping old Python backend (if running)..."
echo "-----------------------------------"

pm2 stop litrev-backend litrev-celery 2>/dev/null || true
pm2 delete litrev-backend litrev-celery 2>/dev/null || true
print_success "Old services stopped"

echo ""
echo "Step 6: Starting Node.js services with PM2..."
echo "-----------------------------------"

# Stop any existing Node.js services
pm2 stop litrev-backend litrev-worker 2>/dev/null || true

# Start services
print_step "Starting all services..."
pm2 start ecosystem.config.node.js

sleep 3

# Save PM2 configuration
pm2 save

# Check status
pm2 status

echo ""
echo "Step 7: Health check..."
echo "-----------------------------------"

sleep 2

# Check backend
if curl -s http://localhost:8000/health > /dev/null; then
    print_success "Backend API is running on http://localhost:8000"
else
    print_error "Backend API is not responding"
fi

# Check frontend
if curl -s http://localhost:3001 > /dev/null; then
    print_success "Frontend is running on http://localhost:3001"
else
    print_error "Frontend is not responding"
fi

# Check Redis
if redis-cli ping > /dev/null; then
    print_success "Redis is running"
else
    print_error "Redis is not responding"
fi

echo ""
echo "=========================================="
echo "   Deployment Complete!"
echo "=========================================="
echo ""
echo "Node.js Backend Services:"
echo "  • Frontend:  http://localhost:3001"
echo "  • Backend:   http://localhost:8000"
echo "  • API Docs:  http://localhost:8000/api/v1/* (REST API)"
echo ""
echo "Management commands:"
echo "  • pm2 start ecosystem.config.node.js  - Start Node.js services"
echo "  • pm2 stop all                        - Stop all services"
echo "  • pm2 restart all                     - Restart all services"
echo "  • pm2 status                          - Check service status"
echo "  • pm2 logs                            - View all logs"
echo "  • pm2 logs litrev-backend             - View backend logs"
echo "  • pm2 logs litrev-worker              - View worker logs"
echo ""
echo "Architecture:"
echo "  • Backend: Express (Node.js)"
echo "  • Worker: BullMQ (Node.js)"
echo "  • Database: SQLite (shared with Python)"
echo "  • Queue: Redis"
echo ""
print_info "Setup auto-start on reboot:"
echo "  sudo pm2 startup"
echo "  pm2 save"
echo ""
print_info "To rollback to Python backend:"
echo "  pm2 stop all"
echo "  pm2 start ecosystem.config.js"
echo ""
