# Non-Blocking Activity Logging

The activity log system is designed to be completely non-blocking, ensuring that your main application continues to function even if activity logging fails.

## 🛡️ Safety Features

### 1. **Completely Non-Blocking Interceptor**

The `ActivityLogInterceptor` is designed to never block or break your main application:

```typescript
// Activity logging happens in a separate promise that doesn't block the response
Promise.resolve()
  .then(async () => {
    try {
      await this.activityLogService.createActivityLog(createActivityLogDto);
    } catch (logError) {
      // Log the error but don't throw - prevents breaking main application
      this.logger.error('Failed to log activity (non-critical):', logError);
    }
  })
  .catch((promiseError) => {
    // Catch any unhandled promise rejections
    this.logger.error(
      'Unhandled error in activity logging promise:',
      promiseError,
    );
  });
```

### 2. **Comprehensive Error Handling**

All potential failure points are wrapped in try-catch blocks:

- **User validation**: Gracefully handles missing or invalid user data
- **Metadata extraction**: Continues even if metadata extraction fails
- **Request sanitization**: Handles malformed request bodies
- **IP address extraction**: Falls back to 'unknown' if extraction fails
- **Database operations**: Returns mock objects instead of throwing errors

### 3. **Infinite Loop Prevention**

Activity log requests are automatically skipped to prevent infinite loops:

```typescript
private shouldSkipLogging(request: Request): boolean {
  const skipPaths = [
    '/api/health',
    '/api/docs',
    '/api/docs-json',
    '/static',
    '/favicon.ico',
    '/api/activity-logs', // Prevents infinite loops
  ];
  return skipPaths.some((path) => request.url.startsWith(path));
}
```

### 4. **Graceful Degradation**

If the activity log service fails, it returns a mock object instead of throwing:

```typescript
catch (error) {
  this.logger.error('Error creating activity log (non-critical):', error);

  // Return a mock log object to prevent downstream errors
  return {
    _id: 'error-log-id',
    activity_type: createActivityLogDto.activity_type,
    // ... other fields
    is_success: false,
    status: 'ERROR',
  } as any;
}
```

## 🔍 Error Scenarios Handled

### 1. **Database Connection Issues**

```typescript
// If database is down, logging fails gracefully
try {
  await this.activityLogService.createActivityLog(dto);
} catch (dbError) {
  // Log error but don't break the application
  this.logger.error('Database error in activity logging:', dbError);
  // Application continues normally
}
```

### 2. **Invalid User Data**

```typescript
// Handles cases where user data is missing or malformed
if (!user || !user.id || !user.role?.name) {
  this.logger.debug('Invalid user data for activity logging - skipping');
  return; // Skip logging but don't break the request
}
```

### 3. **Malformed Request Data**

```typescript
// Handles cases where request body is malformed
try {
  const sanitized = { ...body };
  // Sanitization logic
} catch (error) {
  this.logger.debug('Error sanitizing request body:', error.message);
  return null; // Continue with null sanitized body
}
```

### 4. **Service Dependencies**

```typescript
// If ActivityLogService is not available, interceptor continues
constructor(private readonly activityLogService: ActivityLogService) {}

// If service injection fails, the interceptor still works
// (NestJS will handle dependency injection errors)
```

## 🧪 Testing Non-Blocking Behavior

### Test Script

Run the non-blocking test:

```bash
chmod +x test-non-blocking-logging.sh
./test-non-blocking-logging.sh
```

### Manual Testing

1. **Test with database down:**

   ```bash
   # Stop MongoDB and test your application
   sudo systemctl stop mongod
   curl http://localhost:3000/api/health
   # Should still return 200 OK
   ```

2. **Test with invalid data:**

   ```bash
   # Send malformed requests
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"invalid": "data"}'
   # Should handle gracefully
   ```

3. **Test concurrent requests:**
   ```bash
   # Make multiple requests simultaneously
   for i in {1..50}; do
     curl -s http://localhost:3000/api/health &
   done
   wait
   # All should complete successfully
   ```

## 📊 Monitoring and Debugging

### 1. **Activity Log Errors**

Check application logs for activity logging errors:

```bash
# Look for non-critical error messages
grep "Failed to log activity" /path/to/your/app.log
grep "Error in activity logging" /path/to/your/app.log
```

### 2. **Performance Impact**

Monitor the impact of activity logging:

```bash
# Check if activity logging affects response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health
```

### 3. **Database Health**

Monitor activity log database:

```javascript
// Check if activity logs are being created
db.activity_logs.countDocuments();

// Check for error logs
db.activity_logs.find({ status: 'ERROR' }).count();
```

## 🚀 Best Practices

### 1. **Configuration**

Ensure proper configuration for non-blocking behavior:

```typescript
// In your main.ts
const activityLogInterceptor = app.get(ActivityLogInterceptor);
app.useGlobalInterceptors(activityLogInterceptor);
```

### 2. **Monitoring**

Set up monitoring for activity logging:

```typescript
// Add metrics for activity logging
this.logger.log(`Activity logged successfully: ${activityType}`);
this.logger.error('Failed to log activity (non-critical):', error);
```

### 3. **Error Handling**

Always handle activity logging errors gracefully:

```typescript
// In your services
try {
  await this.activityLogService.createActivityLog(dto);
} catch (error) {
  // Log but don't throw
  this.logger.error('Activity logging failed:', error);
  // Continue with your business logic
}
```

## 🔧 Troubleshooting

### Common Issues

1. **Activity logging not working:**
   - Check if interceptor is properly registered
   - Verify database connection
   - Check application logs for errors

2. **Performance issues:**
   - Monitor response times
   - Check if activity logging is causing delays
   - Consider async/await patterns

3. **Missing logs:**
   - Verify user authentication
   - Check if requests are being skipped
   - Review error logs

### Debug Mode

Enable debug logging to see activity logging details:

```bash
export LOG_LEVEL=debug
npm run start:dev
```

## ✅ Verification Checklist

- [ ] Main application continues working even if activity logging fails
- [ ] Activity logging doesn't block HTTP responses
- [ ] Multiple concurrent requests are handled properly
- [ ] Application doesn't crash due to logging errors
- [ ] Database errors in logging don't affect main application
- [ ] Invalid user data is handled gracefully
- [ ] Activity log requests are skipped to prevent infinite loops
- [ ] All logging errors are caught and logged but don't break the app

The activity log system is now completely safe and non-blocking, ensuring your main application continues to function regardless of any logging issues.
