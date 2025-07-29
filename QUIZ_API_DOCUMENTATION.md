# Quiz Management & Analytics API Documentation

## Overview

This document provides comprehensive documentation for the Quiz Management & Analytics API endpoints. The API supports role-based access control with different permissions for different user types.

## Authentication & Authorization

All endpoints require JWT authentication. The API supports role-based access control with the following roles:

- **SUPER_ADMIN**: Full system access
- **SCHOOL_ADMIN**: School-level administrative access
- **PROFESSOR**: Teaching staff access
- **STUDENT**: Student access with personal data restrictions

## API Base URL

```
http://localhost:5000/api/quiz
```

## Endpoint Categories

### 1. Quiz Group Management

### 2. Quiz Question Management

### 3. Quiz Analytics (Admin)

### 4. Student Analytics

### 5. Export Functionality

### 6. Additional Query Endpoints

---

## 1. Quiz Group Management

### Create Quiz Group

**Endpoint:** `POST /quiz/groups`  
**Access:** Professors, School Admins  
**Description:** Creates a new quiz group for organizing related quiz questions.

**Request Body:**

```json
{
  "subject": "Mathematics",
  "description": "Basic algebra concepts",
  "difficulty": "INTERMEDIATE",
  "category": "Math",
  "module_id": "507f1f77bcf86cd799439011",
  "chapter_id": "507f1f77bcf86cd799439012"
}
```

**Response:**

```json
{
  "message": "Quiz group created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "subject": "Mathematics",
    "description": "Basic algebra concepts",
    "difficulty": "INTERMEDIATE",
    "category": "Math",
    "module_id": "507f1f77bcf86cd799439011",
    "chapter_id": "507f1f77bcf86cd799439012",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### Get All Quiz Groups

**Endpoint:** `GET /quiz/groups`  
**Access:** All authenticated users  
**Description:** Retrieve paginated list of quiz groups with optional filters.

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `module_id` (optional): Filter by module ID
- `chapter_id` (optional): Filter by chapter ID

**Response:**

```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "subject": "Mathematics",
      "description": "Basic algebra concepts",
      "difficulty": "INTERMEDIATE",
      "category": "Math",
      "module_id": "507f1f77bcf86cd799439011",
      "chapter_id": "507f1f77bcf86cd799439012",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### Get Quiz Group by ID

**Endpoint:** `GET /quiz/groups/:id`  
**Access:** All authenticated users  
**Description:** Retrieve a specific quiz group with its details.

**Response:**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "subject": "Mathematics",
  "description": "Basic algebra concepts",
  "difficulty": "INTERMEDIATE",
  "category": "Math",
  "module_id": "507f1f77bcf86cd799439011",
  "chapter_id": "507f1f77bcf86cd799439012",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Update Quiz Group

**Endpoint:** `PATCH /quiz/groups/:id`  
**Access:** Professors, School Admins  
**Description:** Update an existing quiz group.

**Request Body:**

```json
{
  "subject": "Advanced Mathematics",
  "description": "Advanced algebra concepts",
  "difficulty": "ADVANCED"
}
```

### Delete Quiz Group

**Endpoint:** `DELETE /quiz/groups/:id`  
**Access:** Professors, School Admins  
**Description:** Soft delete a quiz group and all its associated quizzes.

---

## 2. Quiz Question Management

### Create Quiz Question

**Endpoint:** `POST /quiz/questions`  
**Access:** Professors, School Admins  
**Description:** Creates a new quiz question within a quiz group.

**Request Body Examples:**

**Multiple Choice Question:**

```json
{
  "quiz_group_id": "507f1f77bcf86cd799439011",
  "question": "What is the solution to 2x + 5 = 13?",
  "type": "MULTIPLE_CHOICE",
  "options": ["3", "4", "5", "6"],
  "answer": ["4"],
  "explanation": "Subtract 5 from both sides: 2x = 8, then divide by 2: x = 4",
  "sequence": 1
}
```

**True/False Question:**

```json
{
  "quiz_group_id": "507f1f77bcf86cd799439011",
  "question": "The equation 2x + 3 = 7 has a solution of x = 2.",
  "type": "TRUE_FALSE",
  "options": ["True", "False"],
  "answer": ["True"],
  "explanation": "Substituting x = 2: 2(2) + 3 = 4 + 3 = 7 ✓",
  "sequence": 2
}
```

### Get All Quiz Questions

**Endpoint:** `GET /quiz/questions`  
**Access:** All authenticated users  
**Description:** Retrieve paginated list of quiz questions with optional filters.

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `quiz_group_id` (optional): Filter by quiz group ID
- `type` (optional): Filter by question type (MULTIPLE_CHOICE, TRUE_FALSE, FILL_IN_THE_BLANK)

**Response:**

```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "question": "What is the solution to 2x + 5 = 13?",
      "type": "MULTIPLE_CHOICE",
      "options": ["3", "4", "5", "6"],
      "answer": ["4"],
      "explanation": "Subtract 5 from both sides: 2x = 8, then divide by 2: x = 4",
      "sequence": 1,
      "quiz_group_id": "507f1f77bcf86cd799439011",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### Get Quiz Question by ID

**Endpoint:** `GET /quiz/questions/:id`  
**Access:** All authenticated users  
**Description:** Retrieve a specific quiz question with its details.

### Update Quiz Question

**Endpoint:** `PATCH /quiz/questions/:id`  
**Access:** Professors, School Admins  
**Description:** Update an existing quiz question.

### Delete Quiz Question

**Endpoint:** `DELETE /quiz/questions/:id`  
**Access:** Professors, School Admins  
**Description:** Soft delete a quiz question.

---

## 3. Quiz Analytics (Admin)

### Get Quiz Analytics

**Endpoint:** `GET /quiz/analytics`  
**Access:** Professors, School Admins  
**Description:** Retrieve comprehensive quiz analytics including total attempts, average scores, pass rates, and most missed questions.

**Query Parameters:**

- `module_id` (optional): Filter by specific module ID
- `chapter_id` (optional): Filter by specific chapter ID
- `quiz_group_id` (optional): Filter by specific quiz group ID
- `date_from` (optional): Filter by start date (ISO string format)
- `date_to` (optional): Filter by end date (ISO string format)

**Response:**

```json
{
  "analytics": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "quiz_group": {
        "_id": "507f1f77bcf86cd799439011",
        "subject": "Mathematics",
        "description": "Basic algebra concepts",
        "difficulty": "INTERMEDIATE",
        "category": "Math"
      },
      "module": {
        "_id": "507f1f77bcf86cd799439011",
        "title": "Algebra Fundamentals",
        "subject": "Mathematics"
      },
      "chapter": {
        "_id": "507f1f77bcf86cd799439012",
        "title": "Linear Equations"
      },
      "total_attempts": 45,
      "average_score": 78.5,
      "pass_rate": 82.2,
      "total_passed": 37,
      "total_failed": 8,
      "min_score": 45,
      "max_score": 100,
      "average_time_taken": 1200.5,
      "most_missed_questions": [
        {
          "quiz_id": "507f1f77bcf86cd799439014",
          "question": "What is the solution to 2x + 5 = 13?",
          "sequence": 3,
          "total_attempts": 45,
          "correct_attempts": 28,
          "incorrect_attempts": 17,
          "accuracy_rate": 62.2
        }
      ]
    }
  ],
  "summary": {
    "total_quizzes": 5,
    "total_attempts": 225,
    "average_pass_rate": 78.5
  }
}
```

### Export Quiz Analytics

**Endpoint:** `GET /quiz/analytics/export`  
**Access:** Professors, School Admins  
**Description:** Export comprehensive quiz analytics in CSV or JSON format.

**Query Parameters:**

- `format` (required): Export format (csv or json)
- All analytics filter parameters supported

**Response:** File download with appropriate headers

---

## 4. Student Analytics

### Get Student Quiz Analytics

**Endpoint:** `GET /quiz/student/analytics`  
**Access:** Students only  
**Description:** Retrieve detailed personal quiz analytics including attempt history, per-question breakdown, and performance summary.

**Query Parameters:** Same as admin analytics

**Response:**

```json
{
  "attempts": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "quiz_group": {
        "_id": "507f1f77bcf86cd799439011",
        "subject": "Mathematics",
        "description": "Basic algebra concepts",
        "difficulty": "INTERMEDIATE"
      },
      "module": {
        "_id": "507f1f77bcf86cd799439011",
        "title": "Algebra Fundamentals",
        "subject": "Mathematics"
      },
      "chapter": {
        "_id": "507f1f77bcf86cd799439012",
        "title": "Linear Equations"
      },
      "score_percentage": 85,
      "is_passed": true,
      "attempt_number": 1,
      "started_at": "2024-01-15T10:30:00Z",
      "completed_at": "2024-01-15T10:45:00Z",
      "time_taken_seconds": 900,
      "question_breakdown": [
        {
          "quiz_id": "507f1f77bcf86cd799439014",
          "question": "What is the solution to 2x + 5 = 13?",
          "sequence": 1,
          "selected_answers": ["4"],
          "correct_answers": ["4"],
          "is_correct": true,
          "time_spent_seconds": 45,
          "explanation": "Subtract 5 from both sides: 2x = 8, then divide by 2: x = 4"
        }
      ]
    }
  ],
  "summary": {
    "total_attempts": 12,
    "average_score": 82.5,
    "pass_rate": 75.0,
    "total_passed": 9,
    "total_failed": 3,
    "average_time_taken": 1100.2,
    "best_score": 95,
    "worst_score": 65
  }
}
```

### Export Student Analytics

**Endpoint:** `GET /quiz/student/analytics/export`  
**Access:** Students only  
**Description:** Export personal quiz analytics in CSV or JSON format.

**Query Parameters:**

- `format` (required): Export format (csv or json)
- All student analytics filter parameters supported

**Response:** File download with appropriate headers

---

## 5. Additional Query Endpoints

### Get Questions by Quiz Group

**Endpoint:** `GET /quiz/groups/:groupId/questions`  
**Access:** All authenticated users  
**Description:** Retrieve all quiz questions belonging to a specific quiz group.

### Get Quiz Groups by Module

**Endpoint:** `GET /quiz/modules/:moduleId/groups`  
**Access:** All authenticated users  
**Description:** Retrieve all quiz groups belonging to a specific module.

### Get Quiz Groups by Chapter

**Endpoint:** `GET /quiz/chapters/:chapterId/groups`  
**Access:** All authenticated users  
**Description:** Retrieve all quiz groups belonging to a specific chapter.

---

## Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Invalid input data or validation error",
  "error": "Bad Request"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "Access denied - Only Professors and School Admins can access this endpoint",
  "error": "Forbidden"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Quiz group not found",
  "error": "Not Found"
}
```

---

## Usage Examples

### Example 1: Admin Dashboard Integration

```javascript
// Get comprehensive analytics for admin dashboard
const analytics = await axios.get('/api/quiz/analytics', {
  headers: { Authorization: `Bearer ${adminToken}` },
});

// Display summary statistics
console.log(`Total Quizzes: ${analytics.data.summary.total_quizzes}`);
console.log(`Total Attempts: ${analytics.data.summary.total_attempts}`);
console.log(`Average Pass Rate: ${analytics.data.summary.average_pass_rate}%`);

// Display quiz-level details
analytics.data.analytics.forEach((quiz) => {
  console.log(`${quiz.quiz_group.subject}: ${quiz.pass_rate}% pass rate`);
});
```

### Example 2: Student Progress Tracking

```javascript
// Get student's personal analytics
const studentAnalytics = await axios.get('/api/quiz/student/analytics', {
  headers: { Authorization: `Bearer ${studentToken}` },
});

// Display personal performance
console.log(
  `Your Average Score: ${studentAnalytics.data.summary.average_score}%`,
);
console.log(`Your Pass Rate: ${studentAnalytics.data.summary.pass_rate}%`);

// Show recent attempts
studentAnalytics.data.attempts.forEach((attempt) => {
  console.log(`${attempt.quiz_group.subject}: ${attempt.score_percentage}%`);
});
```

### Example 3: Filtered Analytics

```javascript
// Get analytics for specific module in date range
const filteredAnalytics = await axios.get('/api/quiz/analytics', {
  headers: { Authorization: `Bearer ${adminToken}` },
  params: {
    module_id: '507f1f77bcf86cd799439011',
    date_from: '2024-01-01T00:00:00.000Z',
    date_to: '2024-01-31T23:59:59.999Z',
  },
});
```

### Example 4: Export Functionality

```javascript
// Export admin analytics as CSV
const csvExport = await axios.get('/api/quiz/analytics/export', {
  headers: { Authorization: `Bearer ${adminToken}` },
  params: { format: 'csv' },
  responseType: 'blob',
});

// Download the file
const url = window.URL.createObjectURL(csvExport.data);
const link = document.createElement('a');
link.href = url;
link.download = 'quiz-analytics.csv';
link.click();
```

---

## Security Considerations

### Role-based Access Control

- **Admins**: Can view all analytics across all students
- **Students**: Can only view their own personal analytics
- **JWT Validation**: All endpoints require valid authentication

### Data Privacy

- **Student Data**: Isolated per student in tenant databases
- **School Isolation**: Analytics are school-specific
- **Audit Trail**: All analytics access is logged

### Multi-tenancy

- All data is automatically filtered by the user's school
- Cross-school data access is prevented
- Database connections are dynamically managed per school

---

## Performance Optimizations

### Database Indexes

- Optimized indexes for fast analytics queries
- Aggregation pipeline optimizations
- Efficient filtering and sorting

### Caching Strategy

- Redis-based caching for frequently accessed data
- Background processing for heavy analytics
- Streaming exports for large datasets

---

## Testing

### Running Tests

```bash
# Install dependencies
npm install axios

# Update tokens in test file
# Edit test-quiz-analytics.js and set ADMIN_TOKEN and STUDENT_TOKEN

# Run tests
node test-quiz-analytics.js
```

### Test Coverage

- ✅ Admin analytics retrieval
- ✅ Student personal analytics
- ✅ Filtering functionality
- ✅ Export capabilities
- ✅ Error handling
- ✅ Security validation

---

## Support

For API support and questions:

- Check the Swagger documentation at `/api/docs`
- Review error responses for troubleshooting
- Contact the development team for additional assistance

---

_This documentation covers all quiz management and analytics endpoints with comprehensive examples and security considerations._
