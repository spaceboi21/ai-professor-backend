# Module Feedback API Documentation

## Overview
New API endpoint to get all feedback received by a student for a specific module from professors and school administrators.

## Endpoint
```
GET /learning-logs/module/:moduleId/feedback
```

## Authentication
- **Required**: Bearer token (JWT)
- **Authorized Roles**: `STUDENT` only

## Parameters

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| moduleId  | string | Yes | MongoDB ObjectId of the module |

### Example Request
```bash
curl -X GET \
  'https://your-api-domain.com/learning-logs/module/507f1f77bcf86cd799439011/feedback' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json'
```

## Response Format

### Success Response (200)
```json
{
  "module_id": "507f1f77bcf86cd799439011",
  "module_title": "Patient Communication Skills",
  "total_feedback_count": 3,
  "average_rating": 4.33,
  "feedback_list": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "ai_feedback_id": "507f1f77bcf86cd799439012",
      "rating": 5,
      "feedback": "Excellent communication skills demonstrated throughout the session. Shows great empathy and understanding.",
      "metadata": {
        "strengths": ["communication", "empathy"],
        "areas_for_improvement": ["documentation"]
      },
      "reviewer_info": {
        "first_name": "Dr. Jane",
        "last_name": "Smith",
        "email": "jane.smith@hospital.com",
        "role": "PROFESSOR",
        "profile_pic": "https://example.com/profile.jpg"
      },
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439016",
      "ai_feedback_id": "507f1f77bcf86cd799439013",
      "rating": 4,
      "feedback": "Good understanding of patient care principles. Need to work on time management.",
      "metadata": {
        "strengths": ["patient care", "knowledge"],
        "areas_for_improvement": ["time management"]
      },
      "reviewer_info": {
        "first_name": "Admin",
        "last_name": "Johnson",
        "email": "admin.johnson@school.edu",
        "role": "SCHOOL_ADMIN",
        "profile_pic": null
      },
      "created_at": "2024-01-14T15:45:00.000Z",
      "updated_at": "2024-01-14T15:45:00.000Z"
    }
  ]
}
```

### Empty Response (200)
When no feedback exists for the module:
```json
{
  "module_id": "507f1f77bcf86cd799439011",
  "module_title": "Patient Communication Skills",
  "total_feedback_count": 0,
  "average_rating": 0,
  "feedback_list": []
}
```

### Error Responses

#### 400 - Bad Request
Only students can access this endpoint:
```json
{
  "statusCode": 400,
  "message": "Only students can access module feedback",
  "error": "Bad Request"
}
```

#### 401 - Unauthorized
Missing or invalid JWT token:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

#### 404 - Module Not Found
```json
{
  "statusCode": 404,
  "message": "Module not found",
  "error": "Not Found"
}
```

## Key Features

### 🎯 **Student-Only Access**
- Only students can call this API
- Students can only see feedback for their own learning logs
- Automatic filtering by the authenticated student's ID

### 📊 **Comprehensive Feedback Data**
- All feedback/reviews from professors and school admins
- Reviewer information including name, email, and role
- Rating and detailed feedback comments
- Metadata for additional context

### 🔢 **Statistics**
- Total count of feedback received
- Average rating across all feedback
- Chronological ordering (newest first)

### 🔐 **Security & Privacy**
- Encrypted email decryption
- Role-based access control
- Tenant-based data isolation

## Use Cases

1. **Student Progress Review**: Students can see all feedback received for a specific module
2. **Performance Tracking**: View ratings and comments over time
3. **Learning Improvement**: Access detailed suggestions and areas for improvement
4. **Reviewer Recognition**: See which professors/admins provided feedback

## Implementation Notes

### Database Optimization
- **Direct student_id indexing**: Reviews now store student_id directly for efficient querying
- Uses MongoDB aggregation pipeline starting from learning_log_reviews collection
- Optimized queries with proper indexing on student_id and created_at
- Minimal data transfer with projection
- **Performance improvement**: No longer needs to join through ai_chat_feedback for student filtering

### Performance Features
- Single query to fetch all required data
- Reviewer information batched and mapped
- Sorted results (newest first)
- Efficient email decryption

### Error Handling
- Comprehensive validation
- User-friendly error messages
- Graceful handling of missing data

## Testing

### Prerequisites
1. Student account with valid JWT token
2. Module with learning logs that have reviews
3. Reviews from professors or school admins

### Test Scenarios
1. **Valid Request**: Student with feedback for the module
2. **No Feedback**: Student with no reviews for the module
3. **Non-Student Access**: Professor/Admin trying to access (should fail)
4. **Invalid Module**: Non-existent module ID
5. **Different School**: Student trying to access module from different school

### Sample Test Data
```javascript
// Create test learning log review
POST /learning-logs/{learningLogId}/review
{
  "rating": 4,
  "feedback": "Great communication skills demonstrated.",
  "metadata": {
    "strengths": ["communication", "empathy"],
    "areas_for_improvement": ["documentation"]
  }
}
```

## Related APIs
- `GET /learning-logs` - Get all learning logs with pagination
- `POST /learning-logs/:id/review` - Create a review for a learning log
- `GET /learning-logs/:id/review` - Get user's review for a learning log
