# Status Field in Activity Logs

The activity log system now includes a `status` field to categorize activities with different status levels.

## Status Types

- **SUCCESS**: Successful operations (HTTP 200-299)
- **WARNING**: Operations with warnings (HTTP 300-399)
- **ERROR**: Failed operations (HTTP 400+ or exceptions)
- **INFO**: Informational activities

## Automatic Status Assignment

The system automatically assigns status based on HTTP response codes:

```typescript
// Status assignment logic in ActivityLogInterceptor
let status: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO' = 'SUCCESS';
if (!isSuccess) {
  status = 'ERROR';
} else if (response.statusCode >= 400) {
  status = 'ERROR';
} else if (response.statusCode >= 300) {
  status = 'WARNING';
} else if (response.statusCode >= 200) {
  status = 'SUCCESS';
}
```

## Database Schema

```typescript
@Prop({
  type: String,
  enum: ['SUCCESS', 'WARNING', 'ERROR', 'INFO'],
  default: 'SUCCESS',
  index: true
})
status: string;
```

## API Usage Examples

### 1. Filter Activity Logs by Status

```bash
# Get only successful activities
curl -X GET "http://localhost:3000/api/activity-logs?status=SUCCESS" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get only error activities
curl -X GET "http://localhost:3000/api/activity-logs?status=ERROR" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get warning activities
curl -X GET "http://localhost:3000/api/activity-logs?status=WARNING" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Manual Activity Log Creation with Status

```typescript
// In your service
await this.activityLogService.createActivityLog({
  activity_type: ActivityTypeEnum.SYSTEM_MAINTENANCE,
  description: 'Database backup completed',
  performed_by: user.id,
  performed_by_role: user.role.name,
  status: 'SUCCESS', // Explicitly set status
  is_success: true,
  metadata: { backup_size: '1.2GB', duration: '5 minutes' },
});

// For a warning
await this.activityLogService.createActivityLog({
  activity_type: ActivityTypeEnum.SYSTEM_MAINTENANCE,
  description: 'High memory usage detected',
  performed_by: user.id,
  performed_by_role: user.role.name,
  status: 'WARNING', // Set warning status
  is_success: true,
  metadata: { memory_usage: '85%', threshold: '80%' },
});

// For an error
await this.activityLogService.createActivityLog({
  activity_type: ActivityTypeEnum.SYSTEM_MAINTENANCE,
  description: 'Database connection failed',
  performed_by: user.id,
  performed_by_role: user.role.name,
  status: 'ERROR', // Set error status
  is_success: false,
  error_message: 'Connection timeout',
  metadata: { retry_attempts: 3, timeout_ms: 5000 },
});
```

## Database Queries

### 1. Find All Status Types

```javascript
// Get all distinct status values
db.activity_logs.distinct('status');
// Returns: ['SUCCESS', 'WARNING', 'ERROR', 'INFO']
```

### 2. Filter by Status

```javascript
// Get all successful activities
db.activity_logs.find({ status: 'SUCCESS' }).sort({ created_at: -1 });

// Get all error activities
db.activity_logs.find({ status: 'ERROR' }).sort({ created_at: -1 });

// Get all warning activities
db.activity_logs.find({ status: 'WARNING' }).sort({ created_at: -1 });
```

### 3. Status Statistics

```javascript
// Count activities by status
db.activity_logs.aggregate([
  {
    $group: {
      _id: '$status',
      count: { $sum: 1 },
    },
  },
  {
    $sort: { count: -1 },
  },
]);

// Result:
// [
//   { "_id": "SUCCESS", "count": 150 },
//   { "_id": "ERROR", "count": 25 },
//   { "_id": "WARNING", "count": 10 },
//   { "_id": "INFO", "count": 5 }
// ]
```

### 4. Status by Activity Type

```javascript
// Get status distribution by activity type
db.activity_logs.aggregate([
  {
    $group: {
      _id: {
        activity_type: '$activity_type',
        status: '$status',
      },
      count: { $sum: 1 },
    },
  },
  {
    $sort: { '_id.activity_type': 1, count: -1 },
  },
]);
```

## Response Format

Activity logs now include the status field:

```json
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
  "is_success": true,
  "status": "SUCCESS",
  "execution_time_ms": 150,
  "ip_address": "192.168.1.100",
  "endpoint": "/api/auth/login",
  "http_method": "POST",
  "http_status_code": 200
}
```

## Indexes for Performance

The following indexes are created for efficient status-based queries:

```javascript
// Single status index
{ status: 1, created_at: -1 }

// Compound indexes for common queries
{ status: 1, activity_type: 1, created_at: -1 }
{ status: 1, is_success: 1, created_at: -1 }
```

## Testing the Status Field

Run the test script to see status logging in action:

```bash
chmod +x test-status-logging.sh
./test-status-logging.sh
```

This will create activity logs with different statuses that you can then query and analyze.

## Use Cases

1. **Monitoring System Health**: Track SUCCESS vs ERROR rates
2. **Performance Analysis**: Identify which operations have high ERROR rates
3. **Security Monitoring**: Focus on ERROR status activities for security analysis
4. **User Experience**: Monitor WARNING status for potential UX issues
5. **Compliance**: Generate reports based on status for audit purposes

The status field provides a quick way to categorize and filter activity logs for different analysis purposes.
