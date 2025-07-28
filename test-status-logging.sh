#!/bin/bash

# Test Status Logging in Activity Logs
BASE_URL="http://localhost:3000/api"

echo "🔍 Testing Status Field in Activity Logs"
echo "======================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}1. Testing successful login (should create SUCCESS status log)${NC}"
success_response=$(curl -s -X POST "$BASE_URL/auth/super-admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "wrongpassword"}')

echo "Response: $success_response"
echo ""

echo -e "${BLUE}2. Testing activity logs endpoint without auth (should create ERROR status log)${NC}"
error_response=$(curl -s -X GET "$BASE_URL/activity-logs")

echo "Response: $error_response"
echo ""

echo -e "${BLUE}3. Testing health endpoint (should create SUCCESS status log)${NC}"
health_response=$(curl -s -X GET "$BASE_URL/health")

echo "Response: $health_response"
echo ""

echo -e "${GREEN}✅ Status logging test completed!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Login with real credentials to get a token"
echo "2. Check activity logs with status filtering:"
echo "   curl -X GET '$BASE_URL/activity-logs?status=SUCCESS' -H 'Authorization: Bearer YOUR_TOKEN'"
echo "   curl -X GET '$BASE_URL/activity-logs?status=ERROR' -H 'Authorization: Bearer YOUR_TOKEN'"
echo "   curl -X GET '$BASE_URL/activity-logs?status=WARNING' -H 'Authorization: Bearer YOUR_TOKEN'"
echo ""
echo "3. Check database for logs with status:"
echo "   db.activity_logs.find({status: 'SUCCESS'}).sort({created_at: -1})"
echo "   db.activity_logs.find({status: 'ERROR'}).sort({created_at: -1})"
echo ""
echo "4. View all status types:"
echo "   db.activity_logs.distinct('status')" 