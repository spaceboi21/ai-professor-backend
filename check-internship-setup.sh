#!/bin/bash

# Internship API Setup Checker
# This script checks if everything is configured correctly for the Internship feature

echo "=================================================="
echo "   Internship API Setup Checker"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: NestJS Backend
echo "1. Checking NestJS Backend..."
if curl -s -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} NestJS backend is running on port 5000"
else
    echo -e "${RED}✗${NC} NestJS backend is NOT running on port 5000"
    echo "   Run: npm run start:dev"
fi
echo ""

# Check 2: Python Backend
echo "2. Checking Python Backend..."
if curl -s -f http://localhost:8000/api/v1/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Python backend is running on port 8000"
    
    # Check specific endpoints
    echo "   Checking Python endpoints..."
    
    # Test patient initialize (will return error but we just check if endpoint exists)
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/api/v1/internship/patient/initialize \
        -H "Content-Type: application/json" \
        -d '{"case_id":"test","patient_profile":{},"scenario_config":{}}' 2>/dev/null)
    
    if [ "$HTTP_CODE" == "404" ]; then
        echo -e "${RED}   ✗${NC} /api/v1/internship/patient/initialize NOT FOUND (404)"
        echo -e "${YELLOW}   → Python backend is running but internship endpoints are not implemented${NC}"
    elif [ "$HTTP_CODE" == "422" ] || [ "$HTTP_CODE" == "500" ] || [ "$HTTP_CODE" == "200" ]; then
        echo -e "${GREEN}   ✓${NC} /api/v1/internship/patient/initialize endpoint exists"
    else
        echo -e "${YELLOW}   ?${NC} /api/v1/internship/patient/initialize returned status $HTTP_CODE"
    fi
else
    echo -e "${RED}✗${NC} Python backend is NOT running on port 8000"
    echo -e "${YELLOW}   This is the main issue causing the 404 error!${NC}"
    echo ""
    echo "   Options to fix:"
    echo "   1. Start the Python backend (if implemented)"
    echo "   2. Use the mock server provided in INTERNSHIP_TROUBLESHOOTING.md"
    echo "   3. Implement the Python backend following PYTHON_INTEGRATION_GUIDE.md"
fi
echo ""

# Check 3: Environment Variables
echo "3. Checking Environment Variables..."
if [ -f .env ]; then
    if grep -q "PYTHON_API_URL" .env; then
        PYTHON_URL=$(grep "PYTHON_API_URL" .env | cut -d '=' -f2-)
        echo -e "${GREEN}✓${NC} PYTHON_API_URL is set: $PYTHON_URL"
    else
        echo -e "${YELLOW}!${NC} PYTHON_API_URL not found in .env (will use default: http://localhost:8000/api/v1)"
    fi
else
    echo -e "${YELLOW}!${NC} .env file not found (will use default Python URL)"
fi
echo ""

# Check 4: MongoDB
echo "4. Checking MongoDB..."
if curl -s -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} MongoDB is accessible (NestJS can connect)"
else
    echo -e "${RED}✗${NC} Cannot verify MongoDB connection"
fi
echo ""

# Check 5: Internship Endpoints
echo "5. Checking Internship Endpoints (NestJS)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/internship 2>/dev/null)

if [ "$HTTP_CODE" == "401" ]; then
    echo -e "${GREEN}✓${NC} Internship endpoints are registered (got 401 - needs auth)"
elif [ "$HTTP_CODE" == "404" ]; then
    echo -e "${RED}✗${NC} Internship endpoints NOT found (404)"
else
    echo -e "${YELLOW}?${NC} Internship endpoint returned status $HTTP_CODE"
fi
echo ""

# Summary
echo "=================================================="
echo "   Summary"
echo "=================================================="
echo ""

if curl -s -f http://localhost:8000/api/v1/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Your setup is ready for testing!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Import internship-api.postman_collection.json into Postman"
    echo "  2. Set your authentication tokens in Postman variables"
    echo "  3. Start testing the endpoints"
    echo ""
    echo "See POSTMAN_USAGE_GUIDE.md for detailed instructions"
else
    echo -e "${RED}✗ Python backend is not running!${NC}"
    echo ""
    echo "THIS IS THE CAUSE OF YOUR 404 ERROR"
    echo ""
    echo "Quick Fix Options:"
    echo ""
    echo "Option 1: Use Mock Server (for testing only)"
    echo "  1. Copy the mock server code from INTERNSHIP_TROUBLESHOOTING.md"
    echo "  2. Save it as mock_python_api.py"
    echo "  3. Run: pip install fastapi uvicorn"
    echo "  4. Run: python mock_python_api.py"
    echo ""
    echo "Option 2: Implement Full Python Backend"
    echo "  1. Follow the guide in src/modules/internship/PYTHON_INTEGRATION_GUIDE.md"
    echo "  2. Implement all required endpoints"
    echo "  3. Start the Python service"
    echo ""
    echo "Option 3: Test Without AI Features"
    echo "  Many endpoints work without Python backend:"
    echo "  - Create/manage internships ✓"
    echo "  - Create/manage cases ✓"
    echo "  - Manage logbooks ✓"
    echo "  - View/validate feedback ✓"
    echo ""
    echo "  Only AI session features require Python backend:"
    echo "  - Create AI sessions ✗"
    echo "  - Send messages to AI ✗"
    echo "  - Generate AI feedback ✗"
fi

echo ""
echo "For more help, see: INTERNSHIP_TROUBLESHOOTING.md"
echo "=================================================="

