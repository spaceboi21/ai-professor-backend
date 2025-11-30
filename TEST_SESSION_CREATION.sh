#!/bin/bash

# Test Session Creation - Curl Commands
# This script tests if the session creation fix is working

echo "=========================================="
echo "   Testing Internship Session Creation"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration - UPDATE THESE VALUES
BASE_URL="http://localhost:5000"
STUDENT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDI4NDY2YjhiYzNmMjA4YTE2ZmMwMiIsImVtYWlsIjoidGFsaGFqdW5rQGdtYWlsLmNvbSIsInJvbGVfaWQiOiI2ODYzY2VjNzExYmU5MDE2YjdjY2I4MDIiLCJzY2hvb2xfaWQiOiI2OTAxNGE1OGI4YmMzZjIwOGExNmY1MDYiLCJyb2xlX25hbWUiOiJTVFVERU5UIiwidG9rZW5fdHlwZSI6ImFjY2VzcyIsImlhdCI6MTczMjc0ODgxNywiZXhwIjoxNzM1MzQwODE3fQ.0fxOKnvPvD6WXZ4H5QFWKNlbxeFGVRbS15XEzD6YvXA"
INTERNSHIP_ID="692757d8d57d3a3ab0e6cd1d"
CASE_ID="6928f32a48f9778d2a0ca575"  # Your newly created case

echo -e "${YELLOW}Configuration:${NC}"
echo "  Base URL: $BASE_URL"
echo "  Internship ID: $INTERNSHIP_ID"
echo "  Case ID: $CASE_ID"
echo ""

# Test 1: Create Session
echo -e "${YELLOW}Test 1: Creating Patient Interview Session${NC}"
echo "Command:"
echo "curl -X POST $BASE_URL/api/internship/sessions \\"
echo "  -H \"Authorization: Bearer \$STUDENT_TOKEN\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"internship_id\":\"$INTERNSHIP_ID\",\"case_id\":\"$CASE_ID\",\"session_type\":\"patient_interview\"}'"
echo ""
echo "Response:"
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/internship/sessions" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"internship_id\": \"$INTERNSHIP_ID\",
    \"case_id\": \"$CASE_ID\",
    \"session_type\": \"patient_interview\"
  }")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" == "201" ] || [ "$HTTP_STATUS" == "200" ]; then
    echo -e "${GREEN}✅ SUCCESS! Session created!${NC}"
    echo -e "${GREEN}HTTP Status: $HTTP_STATUS${NC}"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    
    # Extract session ID if possible
    SESSION_ID=$(echo "$BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('_id', ''))" 2>/dev/null)
    if [ ! -z "$SESSION_ID" ]; then
        echo ""
        echo -e "${GREEN}Session ID: $SESSION_ID${NC}"
        echo ""
        echo -e "${YELLOW}Test 2: Get Session Details${NC}"
        echo "curl -X GET $BASE_URL/api/internship/sessions/$SESSION_ID \\"
        echo "  -H \"Authorization: Bearer \$STUDENT_TOKEN\""
        echo ""
        
        SESSION_DETAILS=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/internship/sessions/$SESSION_ID" \
          -H "Authorization: Bearer $STUDENT_TOKEN")
        
        SESSION_HTTP_STATUS=$(echo "$SESSION_DETAILS" | grep "HTTP_STATUS" | cut -d: -f2)
        SESSION_BODY=$(echo "$SESSION_DETAILS" | sed '/HTTP_STATUS/d')
        
        if [ "$SESSION_HTTP_STATUS" == "200" ]; then
            echo -e "${GREEN}✅ Session details retrieved!${NC}"
            echo "$SESSION_BODY" | python3 -m json.tool 2>/dev/null || echo "$SESSION_BODY"
        else
            echo -e "${RED}❌ Failed to get session details${NC}"
            echo "HTTP Status: $SESSION_HTTP_STATUS"
            echo "$SESSION_BODY"
        fi
    fi
else
    echo -e "${RED}❌ FAILED!${NC}"
    echo -e "${RED}HTTP Status: $HTTP_STATUS${NC}"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    
    # Check for specific error messages
    if echo "$BODY" | grep -q "interview_focus\|patient_openness"; then
        echo ""
        echo -e "${YELLOW}⚠️  The case is still missing interview_focus or patient_openness${NC}"
        echo "Update the case first using:"
        echo "  PATCH $BASE_URL/api/internship/cases/$CASE_ID"
    fi
fi

echo ""
echo "=========================================="

