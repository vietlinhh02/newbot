#!/bin/bash

# Bot Auto Update Script
# Usage: ./scripts/update.sh [force]

echo "🤖 NewBot Auto Update Script"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if force update
FORCE_UPDATE=false
if [ "$1" = "force" ]; then
    FORCE_UPDATE=true
    echo -e "${YELLOW}⚠️  Force update mode enabled${NC}"
fi

# Check if git is available
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed${NC}"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ NPM is not installed${NC}"
    exit 1
fi

# Step 1: Check git status
echo -e "${BLUE}📋 Step 1: Checking git status...${NC}"
if [ "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes${NC}"
    if [ "$FORCE_UPDATE" = true ]; then
        echo -e "${YELLOW}💾 Stashing changes...${NC}"
        git stash
    else
        echo -e "${RED}❌ Please commit your changes or use './scripts/update.sh force'${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Working directory is clean${NC}"
fi

# Step 2: Pull from GitHub
echo -e "${BLUE}📥 Step 2: Pulling from GitHub...${NC}"
git pull origin main
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to pull from GitHub${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Successfully pulled from GitHub${NC}"

# Step 3: Install dependencies
echo -e "${BLUE}📦 Step 3: Installing dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Step 4: Generate Prisma client
echo -e "${BLUE}🔧 Step 4: Generating Prisma client...${NC}"
npx prisma generate
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Failed to generate Prisma client (continuing...)${NC}"
else
    echo -e "${GREEN}✅ Prisma client generated${NC}"
fi

# Step 5: Restart bot (if using PM2)
echo -e "${BLUE}🔄 Step 5: Restarting bot...${NC}"
if command -v pm2 &> /dev/null; then
    if pm2 describe newbot &> /dev/null; then
        echo -e "${BLUE}📱 Restarting with PM2...${NC}"
        pm2 restart newbot
        echo -e "${GREEN}✅ Bot restarted with PM2${NC}"
    else
        echo -e "${YELLOW}⚠️  PM2 process 'newbot' not found. Please start manually.${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  PM2 not found. Please restart bot manually.${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Update completed successfully!${NC}"
echo -e "${BLUE}📊 Use 'pm2 status' to check bot status${NC}"
echo -e "${BLUE}📋 Use 'pm2 logs newbot' to view logs${NC}" 