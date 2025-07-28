#!/bin/bash

# Simple Activity Log Test Script
BASE_URL="http://localhost:3000/api"

echo "🔍 Testing Activity Log System"
echo "=============================="

# Test 1: Check if server is running
echo "1. Checking server status..."
response=$(curl -s "$BASE_URL/health")
if [[ "$response" == *"ok"* ]]; then
    echo "✅ Server is running"
else
    echo "❌ Server is not responding"
    exit 1
fi

# Test 2: Test login endpoints (these should create activity logs)
echo ""
echo "2. Testing login endpoints (should create activity logs)..."

# Test super admin login
echo "   Testing super admin login..."
super_admin_response=$(curl -s -X POST "$BASE_URL/auth/super-admin/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "wrongpassword"}')

echo "   Super admin login response: $super_admin_response"

# Test school admin login
echo "   Testing school admin login..."
school_admin_response=$(curl -s -X POST "$BASE_URL/auth/school-admin/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "wrongpassword"}')

echo "   School admin login response: $school_admin_response"

# Test student login
echo "   Testing student login..."
student_response=$(curl -s -X POST "$BASE_URL/auth/student/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "wrongpassword"}')

echo "   Student login response: $student_response"

# Test 3: Check if we can access activity logs (this will fail without auth, but should show the endpoint exists)
echo ""
echo "3. Testing activity logs endpoint..."
logs_response=$(curl -s -X GET "$BASE_URL/activity-logs")

if [[ "$logs_response" == *"Unauthorized"* ]] || [[ "$logs_response" == *"Forbidden"* ]]; then
    echo "✅ Activity logs endpoint exists (requires authentication)"
else
    echo "❌ Activity logs endpoint not working properly"
    echo "Response: $logs_response"
fi

# Test 4: Test activity logs stats endpoint
echo ""
echo "4. Testing activity logs stats endpoint..."
stats_response=$(curl -s -X GET "$BASE_URL/activity-logs/stats")

if [[ "$stats_response" == *"Unauthorized"* ]] || [[ "$stats_response" == *"Forbidden"* ]]; then
    echo "✅ Activity logs stats endpoint exists (requires authentication)"
else
    echo "❌ Activity logs stats endpoint not working properly"
    echo "Response: $stats_response"
fi

echo ""
echo "🎉 Basic tests completed!"
echo ""
echo "📋 Next steps:"
echo "1. Login with a real user account to get a token:"
echo "   curl -X POST '$BASE_URL/auth/super-admin/login' -H 'Content-Type: application/json' -d '{\"email\": \"your_email@example.com\", \"password\": \"your_password\"}'"
echo ""
echo "2. Test activity logs with authentication:"
echo "   curl -X GET '$BASE_URL/activity-logs' -H 'Authorization: Bearer YOUR_TOKEN'"
echo ""
echo "3. Check the database for activity logs:"
echo "   db.activity_logs.find().sort({created_at: -1})"
echo ""
echo "4. Test different user roles:"
echo "   - Super admin: $BASE_URL/auth/super-admin/login"
echo "   - School admin: $BASE_URL/auth/school-admin/login"
echo "   - Student: $BASE_URL/auth/student/login" 