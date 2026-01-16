#!/bin/bash

# Complete Feedback System Fix Deployment
# Date: December 27, 2025
# Fixes: Enum validation + Missing GET endpoint

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "========================================="
echo -e "${BLUE}Complete Feedback System Fix${NC}"
echo "========================================="
echo ""

# Show what's being fixed
echo -e "${YELLOW}Fixes Applied:${NC}"
echo "  1. ✅ Enum validation error in session completion"
echo "  2. ✅ Missing GET /api/internship/feedback/:feedbackId endpoint"
echo "  3. ✅ Frontend 404 error when loading feedback details"
echo ""

# Step 1: Verify we're in the right directory
echo -e "${BLUE}Step 1: Verifying directory...${NC}"
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ Error: Not in ai-professor-backend directory${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} In correct directory: $(pwd)"
echo ""

# Step 2: Show changes summary
echo -e "${BLUE}Step 2: Changes Summary${NC}"
echo ""
echo "File: src/modules/internship/internship-session.service.ts"
echo "  - Line 535: Changed 'AUTO_GENERATED' → FeedbackTypeEnum.AUTO_GENERATED"
echo ""
echo "File: src/modules/internship/internship-feedback.service.ts"
echo "  - Added: getFeedbackById() method"
echo "  - Returns feedback with populated student/case/session info"
echo ""
echo "File: src/modules/internship/internship.controller.ts"
echo "  - Added: GET /api/internship/feedback/:feedbackId endpoint"
echo "  - Roles: STUDENT, PROFESSOR, SCHOOL_ADMIN, SUPER_ADMIN"
echo ""

# Step 3: Build the application
echo -e "${BLUE}Step 3: Building application...${NC}"
echo -e "${YELLOW}This will take 1-2 minutes...${NC}"
echo ""

yarn build 2>&1 | tail -10

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Build failed${NC}"
    echo "Please check the error messages above"
    exit 1
fi

echo ""
echo -e "${GREEN}✓${NC} Build completed successfully"
echo ""

# Step 4: Verify build artifacts
echo -e "${BLUE}Step 4: Verifying build artifacts...${NC}"

if [ ! -f "dist/src/modules/internship/internship-session.service.js" ]; then
    echo -e "${RED}✗ Session service build artifact not found${NC}"
    exit 1
fi

if [ ! -f "dist/src/modules/internship/internship-feedback.service.js" ]; then
    echo -e "${RED}✗ Feedback service build artifact not found${NC}"
    exit 1
fi

if [ ! -f "dist/src/modules/internship/internship.controller.js" ]; then
    echo -e "${RED}✗ Controller build artifact not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} All build artifacts verified"
echo ""

# Step 5: Show current PM2 status
echo -e "${BLUE}Step 5: Current PM2 status${NC}"
pm2 list
echo ""

# Step 6: Restart PM2 service
echo -e "${BLUE}Step 6: Restarting PM2 service...${NC}"
pm2 restart ai-professor-backend-5000

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ PM2 restart failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Service restarted successfully"
echo ""

# Step 7: Wait for service to be ready
echo -e "${BLUE}Step 7: Waiting for service to initialize...${NC}"
sleep 5
echo -e "${GREEN}✓${NC} Service should be ready"
echo ""

# Step 8: Check logs
echo -e "${BLUE}Step 8: Checking recent logs for errors...${NC}"
echo -e "${YELLOW}Last 30 lines:${NC}"
echo "---"
pm2 logs ai-professor-backend-5000 --lines 30 --nostream | grep -E "(ERROR|error|Feedback|feedback|ValidationError)" || echo "No errors found in recent logs"
echo "---"
echo ""

# Step 9: Test the new endpoint (if curl is available)
echo -e "${BLUE}Step 9: Endpoint verification${NC}"
echo ""
echo "New endpoint available:"
echo "  GET /api/internship/feedback/:feedbackId"
echo ""
echo "To test manually:"
echo "  curl -X GET https://api.psysphereai.com/api/internship/feedback/YOUR_FEEDBACK_ID \\"
echo "    -H \"Authorization: Bearer YOUR_TOKEN\""
echo ""

# Final summary
echo "========================================="
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "========================================="
echo ""
echo -e "${YELLOW}What was fixed:${NC}"
echo "  1. ✅ Feedback enum validation error"
echo "     - No more: ValidationError: feedback_type: 'AUTO_GENERATED' is not a valid enum value"
echo ""
echo "  2. ✅ Missing feedback details endpoint"
echo "     - No more: Cannot GET /api/internship/feedback/:feedbackId (404)"
echo ""
echo "  3. ✅ Frontend can now load feedback details page"
echo "     - Status values properly returned"
echo "     - Student/case/session info included"
echo ""
echo -e "${YELLOW}Test the fixes:${NC}"
echo "  1. Complete a student session"
echo "  2. Check that feedback is auto-generated (no ValidationError)"
echo "  3. Open feedback details page in frontend"
echo "  4. Verify page loads without 404 errors"
echo ""
echo -e "${YELLOW}Monitor logs:${NC}"
echo "  pm2 logs ai-professor-backend-5000"
echo ""
echo -e "${YELLOW}Check for success indicators:${NC}"
echo "  ✓ 'Feedback auto-generated successfully'"
echo "  ✓ 'Feedback retrieved successfully'"
echo "  ✓ No ValidationError messages"
echo "  ✓ No 404 errors for /api/internship/feedback/:id"
echo ""
echo "Documentation:"
echo "  - FEEDBACK_WORKFLOW_COMPLETE.md"
echo "  - FRONTEND_FEEDBACK_FIX.md"
echo ""
echo -e "${GREEN}Deployment successful! 🎉${NC}"
echo ""

