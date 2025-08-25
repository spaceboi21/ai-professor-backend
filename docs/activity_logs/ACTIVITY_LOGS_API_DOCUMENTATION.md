# Activity Logs API Documentation

## Overview
The Activity Logs module provides comprehensive tracking and monitoring of all system activities across the AI Professor platform. It tracks user actions, system events, and provides analytics for administrators and users based on their role permissions.

## Base URL
```
GET /activity-logs
```

## Authentication
All endpoints require JWT authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Role-Based Access Control
- **SUPER_ADMIN**: Can access all activity logs across all schools
- **SCHOOL_ADMIN**: Can access logs for their school only
- **PROFESSOR**: Can access logs for their school and their own activities
- **STUDENT**: Can access only their own activity logs

---

## API Endpoints

### 1. Get Activity Logs (List)
**Endpoint:** `GET /activity-logs`

**Description:** Retrieve activity logs with filtering, pagination, and role-based access control.

**Permissions:** All roles (with data filtered based on user role)

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `page` | Number | No | Page number (default: 1) | `1` |
| `limit` | Number | No | Items per page (default: 10, max: 100) | `20` |
| `activity_type` | String | No | Filter by activity type | `USER_LOGIN` |
| `category` | String | No | Filter by activity category | `AUTHENTICATION` |
| `level` | String | No | Filter by activity level | `INFO` |
| `performed_by_role` | String | No | Filter by user role | `STUDENT` |
| `school_id` | String | No | Filter by school ID | `507f1f77bcf86cd799439011` |
| `target_user_id` | String | No | Filter by target user ID | `507f1f77bcf86cd799439012` |
| `module_id` | String | No | Filter by module ID | `507f1f77bcf86cd799439013` |
| `chapter_id` | String | No | Filter by chapter ID | `507f1f77bcf86cd799439014` |
| `is_success` | Boolean | No | Filter by success status | `true` |
| `status` | String | No | Filter by status | `SUCCESS` |
| `start_date` | String | No | Filter by start date (YYYY-MM-DD) | `2024-01-01` |
| `end_date` | String | No | Filter by end date (YYYY-MM-DD) | `2024-12-31` |
| `search` | String | No | Search in description, school name, user email, module name, or chapter name | `login` |

#### Activity Type Values
```
USER_LOGIN, USER_LOGOUT, USER_CREATED, USER_UPDATED, USER_DELETED,
USER_STATUS_CHANGED, PASSWORD_CHANGED, PASSWORD_RESET, SCHOOL_CREATED,
SCHOOL_UPDATED, SCHOOL_DELETED, SCHOOL_STATUS_CHANGED, STUDENT_CREATED,
STUDENT_UPDATED, STUDENT_DELETED, STUDENT_STATUS_CHANGED, STUDENT_BULK_IMPORT,
PROFESSOR_CREATED, PROFESSOR_UPDATED, PROFESSOR_DELETED, PROFESSOR_STATUS_CHANGED,
MODULE_CREATED, MODULE_UPDATED, MODULE_DELETED, MODULE_ASSIGNED,
MODULE_UNASSIGNED, CHAPTER_CREATED, CHAPTER_UPDATED, CHAPTER_DELETED,
CHAPTER_REORDERED, QUIZ_CREATED, QUIZ_UPDATED, QUIZ_DELETED, QUIZ_ATTEMPTED,
ANCHOR_TAG_CREATED, ANCHOR_TAG_UPDATED, ANCHOR_TAG_DELETED,
ANCHOR_TAG_ATTEMPT_STARTED, ANCHOR_TAG_ATTEMPT_COMPLETED, ANCHOR_TAG_SKIPPED,
PROGRESS_UPDATED, PROGRESS_COMPLETED, AI_CHAT_STARTED, AI_CHAT_MESSAGE_SENT,
AI_FEEDBACK_GIVEN, FILE_UPLOADED, FILE_DELETED, SYSTEM_BACKUP,
SYSTEM_MAINTENANCE, DATABASE_MIGRATION, CONFIGURATION_CHANGED,
NOTIFICATION_SENT, NOTIFICATION_READ, LOGIN_FAILED, UNAUTHORIZED_ACCESS,
SUSPICIOUS_ACTIVITY
```

#### Category Values
```
AUTHENTICATION, USER_MANAGEMENT, SCHOOL_MANAGEMENT, STUDENT_MANAGEMENT,
PROFESSOR_MANAGEMENT, CONTENT_MANAGEMENT, PROGRESS_TRACKING, AI_INTERACTION,
FILE_MANAGEMENT, SYSTEM_ADMINISTRATION, SECURITY, NOTIFICATION
```

#### Level Values
```
INFO, WARNING, ERROR, CRITICAL
```

#### Status Values
```
SUCCESS, WARNING, ERROR, INFO
```

#### Response Format
```json
{
  "message": "Activity logs retrieved successfully",
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "activity_type": "USER_LOGIN",
      "category": "AUTHENTICATION",
      "level": "INFO",
      "description": "User logged in successfully",
      "performed_by": {
        "id": "507f1f77bcf86cd799439012",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "role": "STUDENT"
      },
      "school": {
        "id": "507f1f77bcf86cd799439013",
        "name": "Example School"
      },
      "target_user": {
        "id": "507f1f77bcf86cd799439012",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "role": "STUDENT"
      },
      "module": {
        "id": "507f1f77bcf86cd799439014",
        "name": "Mathematics 101"
      },
      "chapter": {
        "id": "507f1f77bcf86cd799439015",
        "name": "Introduction to Algebra"
      },
      "is_success": true,
      "error_message": null,
      "execution_time_ms": 150,
      "ip_address": "192.168.1.100",
      "endpoint": "/auth/login",
      "http_method": "POST",
      "http_status_code": 200,
      "status": "SUCCESS"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "total_pages": 15,
    "has_next": true,
    "has_prev": false
  }
}
```

---

### 2. Get Activity Statistics
**Endpoint:** `GET /activity-logs/stats`

**Description:** Retrieve activity statistics for the last 30 days (or specified days) based on user permissions.

**Permissions:** SUPER_ADMIN, SCHOOL_ADMIN, PROFESSOR

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `days` | Number | No | Number of days to analyze (default: 30) | `7` |

#### Response Format
```json
{
  "message": "Activity statistics retrieved successfully",
  "data": [
    {
      "category": "AUTHENTICATION",
      "activities": [
        {
          "type": "USER_LOGIN",
          "level": "INFO",
          "success_count": 45,
          "error_count": 2,
          "total_count": 47
        },
        {
          "type": "LOGIN_FAILED",
          "level": "ERROR",
          "success_count": 0,
          "error_count": 3,
          "total_count": 3
        }
      ]
    },
    {
      "category": "CONTENT_MANAGEMENT",
      "activities": [
        {
          "type": "MODULE_CREATED",
          "level": "INFO",
          "success_count": 5,
          "error_count": 0,
          "total_count": 5
        }
      ]
    }
  ]
}
```

---

### 3. Export Activity Logs
**Endpoint:** `GET /activity-logs/export`

**Description:** Export filtered activity logs to CSV format for download.

**Permissions:** SUPER_ADMIN, SCHOOL_ADMIN, PROFESSOR

#### Query Parameters
Same as the main activity logs endpoint (excluding pagination parameters).

#### Response Format
```json
{
  "message": "Activity logs exported successfully",
  "data": [
    {
      "timestamp": "2024-01-15T10:30:00.000Z",
      "activity_type": "USER_LOGIN",
      "category": "AUTHENTICATION",
      "level": "INFO",
      "description": "User logged in successfully",
      "performed_by": "John Doe",
      "performed_by_email": "john.doe@example.com",
      "performed_by_role": "STUDENT",
      "school": "Example School",
      "target_user": "John Doe",
      "target_user_email": "john.doe@example.com",
      "target_user_role": "STUDENT",
      "module": "Mathematics 101",
      "chapter": "Introduction to Algebra",
      "is_success": "true",
      "error_message": "",
      "execution_time_ms": "150",
      "ip_address": "192.168.1.100",
      "endpoint": "/auth/login",
      "http_method": "POST",
      "http_status_code": "200"
    }
  ]
}
```

---

### 4. Get Activity Log by ID
**Endpoint:** `GET /activity-logs/:id`

**Description:** Retrieve a specific activity log by ID with proper access control.

**Permissions:** All roles (with data filtered based on user role)

#### Path Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `id` | String | Yes | Activity log ID | `507f1f77bcf86cd799439011` |

#### Response Format
```json
{
  "message": "Activity log retrieved successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "activity_type": "USER_LOGIN",
    "category": "AUTHENTICATION",
    "level": "INFO",
    "description": "User logged in successfully",
    "performed_by": {
      "id": "507f1f77bcf86cd799439012",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "STUDENT"
    },
    "school": {
      "id": "507f1f77bcf86cd799439013",
      "name": "Example School"
    },
    "target_user": {
      "id": "507f1f77bcf86cd799439012",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "STUDENT"
    },
    "module": {
      "id": "507f1f77bcf86cd799439014",
      "name": "Mathematics 101"
    },
    "chapter": {
      "id": "507f1f77bcf86cd799439015",
      "name": "Introduction to Algebra"
    },
    "metadata": {
      "browser": "Chrome",
      "version": "120.0.0.0"
    },
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "is_success": true,
    "error_message": null,
    "execution_time_ms": 150,
    "endpoint": "/auth/login",
    "http_method": "POST",
    "http_status_code": 200
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid activity log ID",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden - Insufficient permissions",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Activity log not found",
  "error": "Not Found"
}
```

---

## Frontend Implementation Guidelines

### 1. Data Display
- **Activity Logs Table**: Display logs in a sortable, filterable table
- **Status Indicators**: Use color-coded badges for different statuses and levels
- **User Information**: Show user avatars/initials with names and roles
- **Timestamps**: Format timestamps in user's local timezone
- **Pagination**: Implement server-side pagination with page size options

### 2. Filtering System
- **Quick Filters**: Provide preset filter combinations (Today, This Week, This Month)
- **Advanced Filters**: Collapsible section with all filter options
- **Search Bar**: Global search across multiple fields
- **Date Range Picker**: Calendar-based date selection
- **Filter Chips**: Show active filters with remove options

### 3. Role-Based UI
- **SUPER_ADMIN**: Full access to all filters and data
- **SCHOOL_ADMIN**: School-specific filters, hide school_id filter
- **PROFESSOR**: School and personal filters, limited access
- **STUDENT**: Personal filters only, simplified interface

### 4. Export Functionality
- **Export Button**: Trigger CSV download with current filters
- **Export Options**: Allow users to select export format and fields
- **Progress Indicator**: Show export progress for large datasets

### 5. Statistics Dashboard
- **Charts**: Bar charts for activity types, line charts for trends
- **Metrics Cards**: Key performance indicators
- **Time Period Selector**: Quick period selection (7d, 30d, 90d, 1y)
- **Category Breakdown**: Pie charts for activity categories

### 6. Real-time Updates
- **WebSocket Integration**: Real-time activity log updates
- **Live Counter**: Show new activities since last refresh
- **Auto-refresh**: Optional automatic refresh every 30 seconds

### 7. Mobile Responsiveness
- **Responsive Table**: Horizontal scroll or card view on mobile
- **Touch-friendly Filters**: Large touch targets for mobile users
- **Simplified Layout**: Streamlined interface for small screens

---

## Data Models

### Activity Log Object
```typescript
interface ActivityLog {
  id: string;
  timestamp: string;
  activity_type: ActivityTypeEnum;
  category: ActivityCategoryEnum;
  level: ActivityLevelEnum;
  description: string;
  performed_by: UserInfo;
  school?: SchoolInfo;
  target_user?: UserInfo;
  module?: ModuleInfo;
  chapter?: ChapterInfo;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  is_success: boolean;
  error_message?: string;
  execution_time_ms?: number;
  endpoint?: string;
  http_method?: string;
  http_status_code?: number;
  status: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface SchoolInfo {
  id: string;
  name: string;
}

interface ModuleInfo {
  id: string;
  name: string;
}

interface ChapterInfo {
  id: string;
  name: string;
}
```

### Filter Object
```typescript
interface ActivityLogFilter {
  page?: number;
  limit?: number;
  activity_type?: ActivityTypeEnum;
  category?: ActivityCategoryEnum;
  level?: ActivityLevelEnum;
  performed_by_role?: RoleEnum;
  school_id?: string;
  target_user_id?: string;
  module_id?: string;
  chapter_id?: string;
  is_success?: boolean;
  status?: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';
  start_date?: string;
  end_date?: string;
  search?: string;
}
```

---

## Security Considerations

1. **Data Privacy**: Email addresses are encrypted in the database
2. **Access Control**: Role-based filtering ensures users only see authorized data
3. **Audit Trail**: All API calls are logged for security monitoring
4. **Rate Limiting**: Implement rate limiting to prevent abuse
5. **Input Validation**: Validate all query parameters on the frontend

---

## Performance Optimization

1. **Pagination**: Always use pagination for large datasets
2. **Indexed Queries**: Database is optimized for common filter combinations
3. **Caching**: Consider caching frequently accessed statistics
4. **Lazy Loading**: Load detailed information on demand
5. **Debounced Search**: Implement search with debouncing for better performance

---

## Testing Scenarios

### Frontend Testing
1. **Filter Combinations**: Test various filter combinations
2. **Role Access**: Verify data access for different user roles
3. **Pagination**: Test pagination with different page sizes
4. **Export**: Verify CSV export functionality
5. **Mobile**: Test responsive design on various screen sizes

### API Testing
1. **Authentication**: Test with valid/invalid JWT tokens
2. **Authorization**: Test role-based access control
3. **Filtering**: Test all filter parameters
4. **Edge Cases**: Test with invalid IDs, dates, etc.
5. **Performance**: Test with large datasets

---

This documentation provides comprehensive information for implementing the Activity Logs module in the frontend. The APIs are designed to be RESTful, secure, and performant, with clear role-based access control and extensive filtering capabilities.
