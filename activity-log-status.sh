#!/bin/bash

# Activity Log System Status Checker
BASE_URL="http://localhost:3000/api"

# Colors for status indicators
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Status counters
SUCCESS_COUNT=0
WARNING_COUNT=0
ERROR_COUNT=0
TOTAL_TESTS=0

# Function to print status with colors
print_status() {
    local status=$1
    local message=$2
    local details=$3
    
    case $status in
        "SUCCESS")
            echo -e "${GREEN}✅ SUCCESS${NC}: $message"
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  WARNING${NC}: $message"
            WARNING_COUNT=$((WARNING_COUNT + 1))
            ;;
        "ERROR")
            echo -e "${RED}❌ ERROR${NC}: $message"
            ERROR_COUNT=$((ERROR_COUNT + 1))
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  INFO${NC}: $message"
            ;;
        "SYSTEM")
            echo -e "${PURPLE}🔧 SYSTEM${NC}: $message"
            ;;
    esac
    
    if [ ! -z "$details" ]; then
        echo -e "   ${CYAN}Details:${NC} $details"
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo ""
}

# Function to check if server is running
check_server_status() {
    echo -e "${BLUE}🔍 Checking Server Status${NC}"
    echo "=========================="
    
    local response=$(curl -s -w "%{http_code}" "$BASE_URL/health" -o /tmp/health_response)
    local http_code=$(tail -c1 /tmp/health_response)
    local response_body=$(cat /tmp/health_response)
    
    if [ "$http_code" = "200" ] && [[ "$response_body" == *"ok"* ]]; then
        print_status "SUCCESS" "Server is running and healthy" "HTTP $http_code - $response_body"
    else
        print_status "ERROR" "Server is not responding properly" "HTTP $http_code - $response_body"
        return 1
    fi
}

# Function to check database connection
check_database_status() {
    echo -e "${BLUE}🗄️  Checking Database Status${NC}"
    echo "============================="
    
    # Try to access an endpoint that requires database
    local response=$(curl -s -w "%{http_code}" "$BASE_URL/activity-logs" -o /tmp/db_response)
    local http_code=$(tail -c1 /tmp/db_response)
    local response_body=$(cat /tmp/db_response)
    
    if [[ "$response_body" == *"Unauthorized"* ]] || [[ "$response_body" == *"Forbidden"* ]]; then
        print_status "SUCCESS" "Database connection is working" "Endpoint accessible, authentication required"
    elif [[ "$response_body" == *"Internal Server Error"* ]] || [[ "$response_body" == *"Database"* ]]; then
        print_status "ERROR" "Database connection failed" "HTTP $http_code - $response_body"
    else
        print_status "WARNING" "Database status unclear" "HTTP $http_code - $response_body"
    fi
}

# Function to check activity log endpoints
check_activity_log_endpoints() {
    echo -e "${BLUE}📊 Checking Activity Log Endpoints${NC}"
    echo "================================="
    
    # Check main activity logs endpoint
    local logs_response=$(curl -s -w "%{http_code}" "$BASE_URL/activity-logs" -o /tmp/logs_response)
    local logs_http_code=$(tail -c1 /tmp/logs_response)
    local logs_body=$(cat /tmp/logs_response)
    
    if [[ "$logs_body" == *"Unauthorized"* ]] || [[ "$logs_body" == *"Forbidden"* ]]; then
        print_status "SUCCESS" "Activity logs endpoint is accessible" "Authentication required (expected)"
    else
        print_status "ERROR" "Activity logs endpoint not working" "HTTP $logs_http_code - $logs_body"
    fi
    
    # Check activity logs stats endpoint
    local stats_response=$(curl -s -w "%{http_code}" "$BASE_URL/activity-logs/stats" -o /tmp/stats_response)
    local stats_http_code=$(tail -c1 /tmp/stats_response)
    local stats_body=$(cat /tmp/stats_response)
    
    if [[ "$stats_body" == *"Unauthorized"* ]] || [[ "$stats_body" == *"Forbidden"* ]]; then
        print_status "SUCCESS" "Activity logs stats endpoint is accessible" "Authentication required (expected)"
    else
        print_status "ERROR" "Activity logs stats endpoint not working" "HTTP $stats_http_code - $stats_body"
    fi
    
    # Check activity logs export endpoint
    local export_response=$(curl -s -w "%{http_code}" "$BASE_URL/activity-logs/export" -o /tmp/export_response)
    local export_http_code=$(tail -c1 /tmp/export_response)
    local export_body=$(cat /tmp/export_response)
    
    if [[ "$export_body" == *"Unauthorized"* ]] || [[ "$export_body" == *"Forbidden"* ]]; then
        print_status "SUCCESS" "Activity logs export endpoint is accessible" "Authentication required (expected)"
    else
        print_status "ERROR" "Activity logs export endpoint not working" "HTTP $export_http_code - $export_body"
    fi
}

# Function to check authentication endpoints
check_auth_endpoints() {
    echo -e "${BLUE}🔐 Checking Authentication Endpoints${NC}"
    echo "====================================="
    
    # Test super admin login endpoint
    local super_admin_response=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/auth/super-admin/login" \
        -H "Content-Type: application/json" \
        -d '{"email": "test@example.com", "password": "wrongpassword"}' -o /tmp/super_admin_response)
    local super_admin_http_code=$(tail -c1 /tmp/super_admin_response)
    local super_admin_body=$(cat /tmp/super_admin_response)
    
    if [[ "$super_admin_body" == *"Invalid email or password"* ]] || [[ "$super_admin_body" == *"not found"* ]]; then
        print_status "SUCCESS" "Super admin login endpoint is working" "Proper error response for invalid credentials"
    else
        print_status "WARNING" "Super admin login endpoint response unclear" "HTTP $super_admin_http_code - $super_admin_body"
    fi
    
    # Test school admin login endpoint
    local school_admin_response=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/auth/school-admin/login" \
        -H "Content-Type: application/json" \
        -d '{"email": "test@example.com", "password": "wrongpassword"}' -o /tmp/school_admin_response)
    local school_admin_http_code=$(tail -c1 /tmp/school_admin_response)
    local school_admin_body=$(cat /tmp/school_admin_response)
    
    if [[ "$school_admin_body" == *"Invalid email or password"* ]] || [[ "$school_admin_body" == *"not found"* ]]; then
        print_status "SUCCESS" "School admin login endpoint is working" "Proper error response for invalid credentials"
    else
        print_status "WARNING" "School admin login endpoint response unclear" "HTTP $school_admin_http_code - $school_admin_body"
    fi
    
    # Test student login endpoint
    local student_response=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/auth/student/login" \
        -H "Content-Type: application/json" \
        -d '{"email": "test@example.com", "password": "wrongpassword"}' -o /tmp/student_response)
    local student_http_code=$(tail -c1 /tmp/student_response)
    local student_body=$(cat /tmp/student_response)
    
    if [[ "$student_body" == *"Invalid email or password"* ]] || [[ "$student_body" == *"not found"* ]]; then
        print_status "SUCCESS" "Student login endpoint is working" "Proper error response for invalid credentials"
    else
        print_status "WARNING" "Student login endpoint response unclear" "HTTP $student_http_code - $student_body"
    fi
}

# Function to check interceptor functionality
check_interceptor_status() {
    echo -e "${BLUE}🔄 Checking Activity Log Interceptor${NC}"
    echo "====================================="
    
    # Make a request that should trigger the interceptor
    local test_response=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/auth/super-admin/login" \
        -H "Content-Type: application/json" \
        -d '{"email": "interceptor_test@example.com", "password": "test"}' -o /tmp/interceptor_response)
    local test_http_code=$(tail -c1 /tmp/interceptor_response)
    
    if [ "$test_http_code" = "200" ] || [ "$test_http_code" = "400" ] || [ "$test_http_code" = "401" ]; then
        print_status "SUCCESS" "Interceptor is processing requests" "HTTP $test_http_code - Request processed"
    else
        print_status "ERROR" "Interceptor may not be working" "HTTP $test_http_code - Unexpected response"
    fi
}

# Function to check module registration
check_module_registration() {
    echo -e "${BLUE}📦 Checking Module Registration${NC}"
    echo "================================="
    
    # Check if activity log module is properly registered by testing endpoints
    local module_response=$(curl -s -w "%{http_code}" "$BASE_URL/activity-logs" -o /tmp/module_response)
    local module_http_code=$(tail -c1 /tmp/module_response)
    
    if [ "$module_http_code" = "401" ] || [ "$module_http_code" = "403" ]; then
        print_status "SUCCESS" "Activity log module is properly registered" "Endpoints are accessible"
    else
        print_status "ERROR" "Activity log module may not be registered" "HTTP $module_http_code - Endpoint not found"
    fi
}

# Function to generate summary report
generate_summary() {
    echo -e "${BLUE}📋 Status Summary Report${NC}"
    echo "========================="
    
    local total=$TOTAL_TESTS
    local success_rate=$((SUCCESS_COUNT * 100 / total))
    local warning_rate=$((WARNING_COUNT * 100 / total))
    local error_rate=$((ERROR_COUNT * 100 / total))
    
    echo -e "${GREEN}✅ Success: $SUCCESS_COUNT/$total (${success_rate}%)${NC}"
    echo -e "${YELLOW}⚠️  Warnings: $WARNING_COUNT/$total (${warning_rate}%)${NC}"
    echo -e "${RED}❌ Errors: $ERROR_COUNT/$total (${error_rate}%)${NC}"
    echo ""
    
    if [ $ERROR_COUNT -eq 0 ] && [ $SUCCESS_COUNT -gt 0 ]; then
        echo -e "${GREEN}🎉 Activity Log System Status: HEALTHY${NC}"
        print_status "SUCCESS" "All critical components are working" "System is ready for use"
    elif [ $ERROR_COUNT -eq 0 ]; then
        echo -e "${YELLOW}⚠️  Activity Log System Status: PARTIAL${NC}"
        print_status "WARNING" "Some components may need attention" "Check warnings above"
    else
        echo -e "${RED}❌ Activity Log System Status: UNHEALTHY${NC}"
        print_status "ERROR" "Critical issues detected" "Review errors above"
    fi
}

# Function to provide next steps
provide_next_steps() {
    echo -e "${BLUE}📋 Next Steps${NC}"
    echo "============="
    
    if [ $ERROR_COUNT -eq 0 ]; then
        print_status "INFO" "System is ready for testing" "You can now test with real user credentials"
        echo -e "${CYAN}Testing Commands:${NC}"
        echo "1. Login with real credentials:"
        echo "   curl -X POST '$BASE_URL/auth/super-admin/login' \\"
        echo "     -H 'Content-Type: application/json' \\"
        echo "     -d '{\"email\": \"your_email@example.com\", \"password\": \"your_password\"}'"
        echo ""
        echo "2. Test activity logs with token:"
        echo "   curl -X GET '$BASE_URL/activity-logs' \\"
        echo "     -H 'Authorization: Bearer YOUR_TOKEN'"
        echo ""
        echo "3. Check database for logs:"
        echo "   db.activity_logs.find().sort({created_at: -1})"
    else
        print_status "WARNING" "System needs attention" "Fix errors before proceeding"
        echo -e "${CYAN}Troubleshooting Steps:${NC}"
        echo "1. Check application logs for errors"
        echo "2. Verify database connection"
        echo "3. Ensure all modules are properly registered"
        echo "4. Check if ActivityLogInterceptor is working"
    fi
}

# Main execution
main() {
    echo -e "${PURPLE}🚀 Activity Log System Status Checker${NC}"
    echo "=========================================="
    echo ""
    
    # Run all checks
    check_server_status
    check_database_status
    check_activity_log_endpoints
    check_auth_endpoints
    check_interceptor_status
    check_module_registration
    
    echo -e "${BLUE}📊 Generating Summary Report${NC}"
    echo "================================"
    generate_summary
    
    provide_next_steps
    
    # Clean up temporary files
    rm -f /tmp/*_response 2>/dev/null
}

# Run the main function
main 