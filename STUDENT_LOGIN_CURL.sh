#!/bin/bash

# Student Login - Get JWT Token
# This script logs in as a student and extracts the JWT token

BASE_URL="https://api.psysphereai.com"
EMAIL="talhajunk@gmail.com"
PASSWORD="%_181p^2wm*W"

echo "=========================================="
echo "   Student Login - Get JWT Token"
echo "=========================================="
echo ""
echo "Email: $EMAIL"
echo "Base URL: $BASE_URL"
echo ""

# Login and get token
echo "Logging in..."
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/auth/student/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" == "200" ]; then
    echo -e "\033[0;32m✅ Login Successful!\033[0m"
    echo ""
    echo "Full Response:"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    echo ""
    
    # Extract token
    TOKEN=$(echo "$BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('access_token', ''))" 2>/dev/null)
    
    if [ ! -z "$TOKEN" ]; then
        echo "=========================================="
        echo -e "\033[0;32mJWT TOKEN:\033[0m"
        echo "=========================================="
        echo "$TOKEN"
        echo ""
        echo "=========================================="
        echo "Copy this token and use it in your requests:"
        echo "  Authorization: Bearer $TOKEN"
        echo ""
        echo "Example curl command:"
        echo "curl -X POST $BASE_URL/api/internship/sessions \\"
        echo "  -H \"Authorization: Bearer $TOKEN\" \\"
        echo "  -H \"Content-Type: application/json\" \\"
        echo "  -d '{\"internship_id\":\"YOUR_INTERNSHIP_ID\",\"case_id\":\"YOUR_CASE_ID\",\"session_type\":\"patient_interview\"}'"
        echo "=========================================="
    else
        echo -e "\033[1;33m⚠️  Could not extract token from response${NC}"
        echo "Response structure might be different. Check the full response above."
    fi
else
    echo -e "\033[0;31m❌ Login Failed!\033[0m"
    echo "HTTP Status: $HTTP_STATUS"
    echo ""
    echo "Response:"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
fi

