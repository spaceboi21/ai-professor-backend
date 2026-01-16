#!/bin/bash

# Feedback Fix Deployment Script
# Date: December 27, 2025
# Purpose: Deploy the feedback enum validation fix

set -e

echo "========================================="
echo "Deploying Feedback Fix"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check current directory
echo "Step 1: Checking directory..."
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Not in ai-professor-backend directory${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} In correct directory"
echo ""

# Step 2: Show what was fixed
echo "Step 2: Changes made..."
echo "  - Fixed enum validation in internship-session.service.ts"
echo "  - Changed 'AUTO_GENERATED' string to FeedbackTypeEnum.AUTO_GENERATED"
echo "  - This fixes: ValidationError: feedback_type: \`AUTO_GENERATED\` is not a valid enum value"
echo ""

# Step 3: Build the application
echo "Step 3: Building application..."
echo -e "${YELLOW}This may take 1-2 minutes...${NC}"
yarn build

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Build completed successfully"
echo ""

# Step 4: Check if build artifacts exist
echo "Step 4: Verifying build artifacts..."
if [ -f "dist/src/modules/internship/internship-session.service.js" ]; then
    echo -e "${GREEN}✓${NC} Build artifacts verified"
else
    echo -e "${RED}✗ Build artifacts not found${NC}"
    exit 1
fi
echo ""

# Step 5: Restart PM2 service
echo "Step 5: Restarting PM2 service..."
pm2 restart ai-professor-backend-5000

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ PM2 restart failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Service restarted successfully"
echo ""

# Step 6: Wait for service to be ready
echo "Step 6: Waiting for service to be ready..."
sleep 5
echo -e "${GREEN}✓${NC} Service should be ready"
echo ""

# Step 7: Check logs for errors
echo "Step 7: Checking recent logs..."
echo -e "${YELLOW}Last 20 lines of logs:${NC}"
pm2 logs ai-professor-backend-5000 --lines 20 --nostream
echo ""

# Step 8: Summary
echo "========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "========================================="
echo ""
echo "What was fixed:"
echo "  1. Feedback enum validation error"
echo "  2. Automatic feedback generation now works"
echo ""
echo "Next steps:"
echo "  1. Test session completion"
echo "  2. Verify feedback is auto-generated"
echo "  3. Test professor validation workflow"
echo ""
echo "Monitor logs with:"
echo "  pm2 logs ai-professor-backend-5000"
echo ""
echo "Check for success messages:"
echo "  - 'Feedback auto-generated successfully'"
echo "  - No more 'ValidationError: feedback_type' errors"
echo ""

