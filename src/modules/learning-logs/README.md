# Learning Logs Module

This module handles learning logs (AI feedback from chat sessions) and provides functionality for reviewing them.

## Features

### Learning Logs
- View learning logs with role-based access control
- Filter learning logs by various criteria
- Get skill gap statistics
- View detailed learning log information

### Learning Log Reviews
- School admins, professors, and super admins can review learning logs
- Students cannot review learning logs
- Each user can only review a learning log once per role
- Reviews include rating (1-5 stars) and feedback
- Students receive notifications when their learning logs are reviewed

## API Endpoints

### Learning Logs
- `GET /learning-logs` - Get learning logs with pagination and filtering
- `GET /learning-logs/:id` - Get a specific learning log by ID
- `GET /learning-logs/stats/skill-gaps` - Get skill gap statistics

### Learning Log Reviews
- `POST /learning-logs/:id/review` - Create a review for a learning log
- `GET /learning-logs/:id/review` - Get the current user's review for a learning log

## Role-Based Access Control

### Students
- Can view their own learning logs
- Cannot review learning logs
- Receive notifications when their learning logs are reviewed

### School Admins
- Can view all students' learning logs in their school
- Can review learning logs once per learning log
- Can see review status and can_review flag

### Professors
- Can view learning logs (based on module assignments)
- Can review learning logs once per learning log
- Can see review status and can_review flag

### Super Admins
- Can view all learning logs across all schools
- Can review learning logs once per learning log
- Can see review status and can_review flag

## Database Schema

### Learning Log Reviews Collection
```javascript
{
  _id: ObjectId,
  ai_feedback_id: ObjectId, // Reference to AI chat feedback
  reviewer_id: ObjectId, // User who gave the review
  reviewer_role: String, // Role of the reviewer (SUPER_ADMIN, SCHOOL_ADMIN, PROFESSOR)
  rating: Number, // 1-5 stars
  feedback: String, // Review comment
  metadata: Object, // Additional data
  deleted_at: Date,
  created_at: Date,
  updated_at: Date
}
```

## Review Logic

1. **Can Review Check**: Users can review if:
   - They are not a student
   - They haven't already reviewed this learning log with their current role

2. **Review Creation**: When a review is created:
   - Validation ensures user hasn't already reviewed
   - Review is saved to database
   - Student receives notification
   - Review information is returned

3. **Review Display**: Learning logs include:
   - `can_review`: Boolean indicating if current user can review
   - `review`: Review object if user has already reviewed

## Notifications

When a learning log is reviewed:
- Student receives an in-app notification
- Notification includes reviewer name, rating, and review details
- Notification type: `LEARNING_LOG_REVIEWED`

## Usage Examples

### Creating a Review
```javascript
POST /learning-logs/507f1f77bcf86cd799439011/review
{
  "rating": 4,
  "feedback": "Great communication skills demonstrated. Shows good understanding of patient care principles.",
  "metadata": {
    "strengths": ["communication", "empathy"],
    "areas_for_improvement": ["documentation"]
  }
}
```

### Getting Learning Logs with Review Info
```javascript
GET /learning-logs
// Response includes:
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "skill_gaps": ["empathy"],
      "can_review": true,
      "user_review": null, // or review object if already reviewed
      // ... other learning log fields
    }
  ]
}
``` 