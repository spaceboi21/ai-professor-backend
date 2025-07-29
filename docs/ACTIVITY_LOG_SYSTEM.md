# Activity Log System

A comprehensive activity logging system for the AI Professor platform with hierarchical access control and automatic activity tracking.

## Features

### 🔐 **Hierarchical Access Control**

- **Super Admin**: Can view all activity logs across all schools
- **School Admin**: Can view activity logs from their school only
- **Professor**: Can view school logs and their own activities
- **Student**: Can view only their own activities

### 📊 **Comprehensive Activity Tracking**

- **Authentication Activities**: Login, logout, failed attempts
- **User Management**: User creation, updates, deletions
- **School Management**: School creation, updates, status changes
- **Content Management**: Module and chapter operations
- **Progress Tracking**: Student progress updates
- **AI Interactions**: Chat sessions, messages, feedback
- **File Operations**: Uploads and deletions
- **System Events**: Backups, maintenance, migrations

### 🔍 **Advanced Filtering & Search**

- Filter by activity type, category, level
- Filter by user role, school, target user
- Date range filtering
- Full-text search across descriptions
- Success/failure status filtering

### 📈 **Analytics & Export**

- Activity statistics by category
- Export to CSV format
- Performance metrics (execution time)
- Error tracking and analysis

## Architecture

### Database Schema

```typescript
// Central Database - Activity Logs
{
  _id: ObjectId,
  activity_type: ActivityTypeEnum,
  category: ActivityCategoryEnum,
  level: ActivityLevelEnum,
  description: string,
  performed_by: ObjectId, // User who performed the action
  performed_by_role: RoleEnum,
  school_id: ObjectId,
  school_name: string,
  target_user_id: ObjectId, // User affected by the action
  target_user_email: string,
  target_user_role: RoleEnum,
  module_id: string,
  module_name: string,
  chapter_id: string,
  chapter_name: string,
  metadata: Record<string, any>,
  ip_address: string,
  user_agent: string,
  session_id: string,
  is_success: boolean,
  error_message: string,
  execution_time_ms: number,
  endpoint: string,
  http_method: string,
  http_status_code: number,
  created_at: Date,
  updated_at: Date
}
```

### Access Control Matrix

| Role             | Access Level | Description                                   |
| ---------------- | ------------ | --------------------------------------------- |
| **Super Admin**  | All logs     | Can view all activity logs across all schools |
| **School Admin** | School logs  | Can view logs from their school only          |
| **Professor**    | School + Own | Can view school logs and their own activities |
| **Student**      | Own only     | Can view only their own activities            |

## API Endpoints

### Activity Logs Controller (`/api/activity-logs`)

#### Get Activity Logs

```http
GET /api/activity-logs?page=1&limit=10&activity_type=USER_LOGIN&school_id=123&start_date=2024-01-01&end_date=2024-01-31&search=login
```

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `activity_type`: Filter by activity type
- `category`: Filter by activity category
- `level`: Filter by activity level (INFO, WARNING, ERROR, CRITICAL)
- `performed_by_role`: Filter by user role
- `school_id`: Filter by school ID
- `target_user_id`: Filter by target user ID
- `module_id`: Filter by module ID
- `chapter_id`: Filter by chapter ID
- `is_success`: Filter by success status
- `start_date`: Filter by start date (YYYY-MM-DD)
- `end_date`: Filter by end date (YYYY-MM-DD)
- `search`: Search in description, school name, user email, etc.

#### Get Activity Statistics

```http
GET /api/activity-logs/stats?days=30
```

#### Export Activity Logs

```http
GET /api/activity-logs/export?activity_type=USER_LOGIN&start_date=2024-01-01&end_date=2024-01-31
```

#### Get Activity Log by ID

```http
GET /api/activity-logs/:id
```

### Super Admin Controller (`/api/super-admin/activity-logs`)

#### Get All Activity Logs (Super Admin Only)

```http
GET /api/super-admin/activity-logs?page=1&limit=10
```

#### Get System-wide Statistics (Super Admin Only)

```http
GET /api/super-admin/activity-logs/stats?days=30
```

#### Export All Activity Logs (Super Admin Only)

```http
GET /api/super-admin/activity-logs/export?start_date=2024-01-01&end_date=2024-01-31
```

## Activity Types

### Authentication

- `USER_LOGIN`: User login attempts
- `USER_LOGOUT`: User logout
- `LOGIN_FAILED`: Failed login attempts
- `PASSWORD_CHANGED`: Password changes
- `PASSWORD_RESET`: Password resets

### User Management

- `USER_CREATED`: New user creation
- `USER_UPDATED`: User profile updates
- `USER_DELETED`: User deletion
- `USER_STATUS_CHANGED`: User status changes

### School Management

- `SCHOOL_CREATED`: New school creation
- `SCHOOL_UPDATED`: School information updates
- `SCHOOL_DELETED`: School deletion
- `SCHOOL_STATUS_CHANGED`: School status changes

### Student Management

- `STUDENT_CREATED`: New student creation
- `STUDENT_UPDATED`: Student profile updates
- `STUDENT_DELETED`: Student deletion
- `STUDENT_STATUS_CHANGED`: Student status changes
- `STUDENT_BULK_IMPORT`: Bulk student import

### Professor Management

- `PROFESSOR_CREATED`: New professor creation
- `PROFESSOR_UPDATED`: Professor profile updates
- `PROFESSOR_DELETED`: Professor deletion
- `PROFESSOR_STATUS_CHANGED`: Professor status changes

### Content Management

- `MODULE_CREATED`: New module creation
- `MODULE_UPDATED`: Module updates
- `MODULE_DELETED`: Module deletion
- `MODULE_ASSIGNED`: Module assignment to professor
- `MODULE_UNASSIGNED`: Module unassignment
- `CHAPTER_CREATED`: New chapter creation
- `CHAPTER_UPDATED`: Chapter updates
- `CHAPTER_DELETED`: Chapter deletion
- `CHAPTER_REORDERED`: Chapter reordering

### Quiz Management

- `QUIZ_CREATED`: New quiz creation
- `QUIZ_UPDATED`: Quiz updates
- `QUIZ_DELETED`: Quiz deletion
- `QUIZ_ATTEMPTED`: Quiz attempts

### Progress Tracking

- `PROGRESS_UPDATED`: Progress updates
- `PROGRESS_COMPLETED`: Progress completion

### AI Interactions

- `AI_CHAT_STARTED`: AI chat session started
- `AI_CHAT_MESSAGE_SENT`: AI chat messages
- `AI_FEEDBACK_GIVEN`: AI feedback provided

### File Management

- `FILE_UPLOADED`: File uploads
- `FILE_DELETED`: File deletions

### System Events

- `SYSTEM_BACKUP`: System backups
- `SYSTEM_MAINTENANCE`: System maintenance
- `DATABASE_MIGRATION`: Database migrations
- `CONFIGURATION_CHANGED`: Configuration changes

### Security Events

- `UNAUTHORIZED_ACCESS`: Unauthorized access attempts
- `SUSPICIOUS_ACTIVITY`: Suspicious activity detection

## Usage Examples

### 1. Get Recent Login Activities

```javascript
// Get recent login activities for a school
const response = await fetch(
  '/api/activity-logs?activity_type=USER_LOGIN&school_id=123&limit=20',
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
);
```

### 2. Get Failed Login Attempts

```javascript
// Get failed login attempts
const response = await fetch(
  '/api/activity-logs?activity_type=LOGIN_FAILED&is_success=false&limit=50',
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
);
```

### 3. Get Module Creation Activities

```javascript
// Get module creation activities
const response = await fetch(
  '/api/activity-logs?activity_type=MODULE_CREATED&category=CONTENT_MANAGEMENT',
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
);
```

### 4. Export Activity Logs for Analysis

```javascript
// Export activity logs for the last month
const response = await fetch(
  '/api/activity-logs/export?start_date=2024-01-01&end_date=2024-01-31',
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
);
```

### 5. Get Activity Statistics

```javascript
// Get activity statistics for the last 30 days
const response = await fetch('/api/activity-logs/stats?days=30', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

## Response Format

### Activity Logs Response

```json
{
  "message": "Activity logs retrieved successfully",
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "timestamp": "2024-01-20T14:30:22.000Z",
      "activity_type": "USER_LOGIN",
      "category": "AUTHENTICATION",
      "level": "INFO",
      "description": "User login successfully",
      "performed_by": {
        "id": "507f1f77bcf86cd799439012",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "role": "PROFESSOR"
      },
      "school": {
        "id": "507f1f77bcf86cd799439013",
        "name": "Harvard University"
      },
      "target_user": null,
      "module": null,
      "chapter": null,
      "is_success": true,
      "error_message": null,
      "execution_time_ms": 150,
      "ip_address": "192.168.1.100",
      "endpoint": "/api/auth/login",
      "http_method": "POST",
      "http_status_code": 200
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

### Activity Statistics Response

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
          "error_count": 8,
          "total_count": 8
        }
      ]
    },
    {
      "category": "CONTENT_MANAGEMENT",
      "activities": [
        {
          "type": "MODULE_CREATED",
          "level": "INFO",
          "success_count": 12,
          "error_count": 0,
          "total_count": 12
        }
      ]
    }
  ]
}
```

## Security Features

### Data Sanitization

- Sensitive fields (passwords, tokens, secrets) are automatically redacted
- IP addresses and user agents are logged for security analysis
- Session IDs are tracked for session management

### Access Control

- Role-based access control ensures users only see relevant logs
- School-based filtering prevents cross-school data access
- Audit trail for all access attempts

### Performance Optimization

- Efficient database indexing for fast queries
- Pagination to handle large datasets
- Caching for frequently accessed statistics

## Monitoring & Alerts

### Error Tracking

- Failed activities are logged with error messages
- Execution time tracking for performance monitoring
- HTTP status codes for API health monitoring

### Security Monitoring

- Failed login attempts are tracked
- Unauthorized access attempts are logged
- Suspicious activity patterns can be detected

### Performance Monitoring

- Execution time tracking for all activities
- Database query performance monitoring
- API response time tracking

## Integration

### Automatic Logging

The system automatically logs activities through interceptors, so no manual logging is required in your controllers.

### Manual Logging

For custom activities, you can use the ActivityLogService directly:

```typescript
import { ActivityLogService } from 'src/modules/activity-log/activity-log.service';

@Injectable()
export class YourService {
  constructor(private readonly activityLogService: ActivityLogService) {}

  async performAction(user: JWTUserPayload) {
    // Your business logic here

    // Log the activity
    await this.activityLogService.createActivityLog({
      activity_type: ActivityTypeEnum.CUSTOM_ACTION,
      description: 'Custom action performed',
      performed_by: user.id,
      performed_by_role: user.role.name,
      school_id: user.school_id,
      is_success: true,
    });
  }
}
```

## Best Practices

1. **Use Appropriate Activity Types**: Choose the most specific activity type for your action
2. **Include Relevant Metadata**: Add useful information to the metadata field
3. **Handle Errors Gracefully**: Always log both successful and failed activities
4. **Respect Privacy**: Ensure sensitive data is properly sanitized
5. **Monitor Performance**: Use the execution time data to identify slow operations
6. **Regular Analysis**: Use the statistics and export features for regular system analysis

## Troubleshooting

### Common Issues

1. **Missing Logs**: Check if the endpoint is being skipped by the interceptor
2. **Access Denied**: Verify user role and school permissions
3. **Performance Issues**: Check database indexes and query optimization
4. **Export Failures**: Ensure proper date format and filter parameters

### Debug Mode

Enable debug logging by setting the log level to debug in your environment:

```bash
LOG_LEVEL=debug
```

This will provide detailed information about activity logging operations.
