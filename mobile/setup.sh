#!/bin/bash

# Mobile App Setup Script for LitRevTool
# This script automates the initial setup of iOS and Android mobile apps

set -e  # Exit on error

echo "📱 LitRevTool Mobile App Setup"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "../package.json" ]; then
    echo "❌ Error: Please run this script from the mobile/ directory"
    exit 1
fi

# Step 1: Install dependencies
echo -e "${BLUE}Step 1/5: Installing frontend dependencies...${NC}"
cd ../frontend
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 2: Build the React app
echo -e "${BLUE}Step 2/5: Building React app...${NC}"
npm run build
echo -e "${GREEN}✅ React app built${NC}"
echo ""

# Step 3: Initialize Capacitor
echo -e "${BLUE}Step 3/5: Initializing Capacitor...${NC}"
if [ ! -f "capacitor.config.ts" ]; then
    echo "❌ Error: capacitor.config.ts not found. Please create it first."
    exit 1
fi
echo -e "${GREEN}✅ Capacitor config found${NC}"
echo ""

# Step 4: Add platforms
echo -e "${BLUE}Step 4/5: Adding mobile platforms...${NC}"

# Detect OS
OS="$(uname -s)"
case "${OS}" in
    Darwin*)
        echo "macOS detected - Adding both iOS and Android platforms"
        echo ""
        echo "Adding iOS platform..."
        npx cap add ios || echo "⚠️  iOS platform may already exist"
        echo ""
        echo "Adding Android platform..."
        npx cap add android || echo "⚠️  Android platform may already exist"
        ;;
    Linux*)
        echo "Linux detected - Adding Android platform only"
        echo "(iOS development requires macOS)"
        echo ""
        npx cap add android || echo "⚠️  Android platform may already exist"
        ;;
    *)
        echo "Windows detected - Adding Android platform only"
        echo "(iOS development requires macOS)"
        echo ""
        npx cap add android || echo "⚠️  Android platform may already exist"
        ;;
esac
echo -e "${GREEN}✅ Mobile platforms added${NC}"
echo ""

# Step 5: Sync
echo -e "${BLUE}Step 5/5: Syncing app to mobile platforms...${NC}"
npx cap sync
echo -e "${GREEN}✅ Mobile apps synced${NC}"
echo ""

# Success message
echo -e "${GREEN}🎉 Mobile app setup complete!${NC}"
echo ""
echo "Next steps:"
echo ""

case "${OS}" in
    Darwin*)
        echo "📱 For iOS development:"
        echo "   npm run mobile:open:ios"
        echo "   (Opens in Xcode)"
        echo ""
        echo "🤖 For Android development:"
        echo "   npm run mobile:open:android"
        echo "   (Opens in Android Studio)"
        ;;
    *)
        echo "🤖 For Android development:"
        echo "   npm run mobile:open:android"
        echo "   (Opens in Android Studio)"
        echo ""
        echo "📱 For iOS development:"
        echo "   Requires macOS with Xcode installed"
        ;;
esac

echo ""
echo "📖 Documentation: See mobile/README.md for full guide"
echo ""
