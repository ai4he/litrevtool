#!/bin/bash

# LitRevTool Deployment Script
# This script automates the complete deployment process

set -e  # Exit on error

echo "=========================================="
echo "   LitRevTool Deployment Script"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if running from project root
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

PROJECT_DIR=$(pwd)

echo "Step 1: Checking prerequisites..."
echo "-----------------------------------"

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi
print_success "Python 3 found: $(python3 --version)"

# Check for python3-venv
if ! dpkg -l python3-venv &> /dev/null; then
    print_info "python3-venv is not installed. Installing python3-venv..."
    sudo apt update -qq
    sudo apt install -y python3-venv
    print_success "python3-venv installed"
else
    print_success "python3-venv found"
fi

# Check for Node.js and npm
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi
print_success "Node.js found: $(node --version)"

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

# Check for Chrome/Chromium (needed for scraper)
if ! command -v google-chrome &> /dev/null && ! command -v chromium-browser &> /dev/null && ! command -v chromium &> /dev/null; then
    print_info "Chrome/Chromium is not installed. Installing Google Chrome..."
    wget -q -O /tmp/google-chrome-stable_current_amd64.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
    sudo apt install -y /tmp/google-chrome-stable_current_amd64.deb
    rm /tmp/google-chrome-stable_current_amd64.deb
    print_success "Google Chrome installed"
else
    print_success "Chrome/Chromium found"
fi

echo ""
echo "Step 2: Setting up Python backend..."
echo "-----------------------------------"

cd "$PROJECT_DIR/backend"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_info "Creating Python virtual environment..."
    python3 -m venv venv
    print_success "Virtual environment created"
else
    print_success "Virtual environment already exists"
fi

# Activate virtual environment and install dependencies
print_info "Installing Python dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
print_success "Python dependencies installed"

# Install Playwright browsers
print_info "Installing Playwright browsers..."
python -m playwright install chromium
print_success "Playwright browsers installed"

# Create necessary directories
print_info "Creating required directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p uploads/screenshots
print_success "Directories created"

# Initialize database
print_info "Initializing database..."
if [ ! -f "$PROJECT_DIR/backend/litrevtool.db" ]; then
    python3 -c "from app.db.session import engine; from app.db.base_class import Base; from app.models import User, SearchJob, Paper; Base.metadata.create_all(bind=engine); print('Database initialized')"
    print_success "Database initialized"
else
    print_success "Database already exists"
fi

deactivate

echo ""
echo "Step 3: Setting up React frontend..."
echo "-----------------------------------"

cd "$PROJECT_DIR/frontend"

# Create logs directory
mkdir -p logs

# Install dependencies
print_info "Installing npm dependencies..."
npm install
print_success "npm dependencies installed"

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
    print_info "   See docs/SETUP.md for instructions"
fi

echo ""
echo "Step 5: Starting services with PM2..."
echo "-----------------------------------"

# Stop existing PM2 processes if any
pm2 stop all 2>/dev/null || true

# Start services
print_info "Starting all services..."
npm start

sleep 3

# Check status
pm2 status

echo ""
echo "Step 6: Health check..."
echo "-----------------------------------"

sleep 2

# Check backend
if curl -s http://localhost:8000/docs > /dev/null; then
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
echo "Services:"
echo "  • Frontend:  http://localhost:3001"
echo "  • Backend:   http://localhost:8000"
echo "  • API Docs:  http://localhost:8000/docs"
echo ""
echo "Management commands:"
echo "  • npm start       - Start all services"
echo "  • npm stop        - Stop all services"
echo "  • npm restart     - Restart all services"
echo "  • npm run status  - Check service status"
echo "  • npm run logs    - View all logs"
echo "  • npm run reset   - Full system reset"
echo ""
echo "For more information, see docs/PM2_COMMANDS.md"
echo ""
print_info "Save PM2 configuration to auto-start on reboot:"
echo "  sudo pm2 startup"
echo "  pm2 save"
echo ""
