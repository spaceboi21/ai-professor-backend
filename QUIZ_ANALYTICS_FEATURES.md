# Quiz Analytics Features Documentation

## Overview

This document describes the comprehensive quiz analytics features implemented for the AI Professor platform. The analytics system provides detailed insights for both administrators and students, with advanced filtering and export capabilities.

## Features Implemented

### ✅ Test Case 1: Display Quiz Stats in Admin Panel (TC-001)

- **Total attempts** per quiz
- **Average score** calculation
- **Pass rate** percentage
- **Most missed questions** with accuracy rates
- **Time analysis** (average time taken)
- **Score distribution** (min/max scores)

### ✅ Test Case 2: View Personal Score Breakdown as Student (TC-002)

- **Personal attempt history** with timestamps
- **Per-question accuracy** breakdown
- **Score progression** over time
- **Time spent** per question
- **Performance summary** (best/worst scores)
- **Question explanations** for incorrect answers

### ✅ Test Case 3: Filter Analytics by Module and Time Period (TC-003)

- **Module-based filtering**
- **Chapter-based filtering**
- **Date range filtering**
- **Combined filters** (multiple criteria)
- **Real-time filtering** with responsive results

### ✅ Test Case 4: Export Quiz Analytics (TC-004)

- **CSV export** with proper headers
- **JSON export** with structured data
- **Filtered exports** (apply filters before export)
- **Student personal exports**
- **Admin comprehensive exports**

## API Endpoints

### Admin Analytics

#### Get Quiz Analytics

```http
GET /api/quiz/analytics
Authorization: Bearer <admin_token>
```

**Query Parameters:**

- `module_id` (optional): Filter by specific module
- `chapter_id` (optional): Filter by specific chapter
- `quiz_group_id` (optional): Filter by specific quiz group
- `date_from` (optional): Start date (ISO string)
- `date_to` (optional): End date (ISO string)

**Response:**

```json
{
  "analytics": [
    {
      "_id": "quiz_group_id",
      "quiz_group": {
        "_id": "quiz_group_id",
        "subject": "Mathematics",
        "description": "Basic algebra concepts",
        "difficulty": "INTERMEDIATE",
        "category": "Math"
      },
      "module": {
        "_id": "module_id",
        "title": "Algebra Fundamentals",
        "subject": "Mathematics"
      },
      "chapter": {
        "_id": "chapter_id",
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
          "quiz_id": "question_id",
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

#### Export Quiz Analytics

```http
GET /api/quiz/analytics/export?format=csv
Authorization: Bearer <admin_token>
```

**Query Parameters:**

- `format`: `csv` or `json`
- All filter parameters supported

**Response:** File download with appropriate headers

### Student Analytics

#### Get Student Quiz Analytics

```http
GET /api/quiz/student/analytics
Authorization: Bearer <student_token>
```

**Query Parameters:** Same as admin analytics

**Response:**

```json
{
  "attempts": [
    {
      "_id": "attempt_id",
      "quiz_group": {
        "_id": "quiz_group_id",
        "subject": "Mathematics",
        "description": "Basic algebra concepts",
        "difficulty": "INTERMEDIATE"
      },
      "module": {
        "_id": "module_id",
        "title": "Algebra Fundamentals",
        "subject": "Mathematics"
      },
      "chapter": {
        "_id": "chapter_id",
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
          "quiz_id": "question_id",
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

#### Export Student Analytics

```http
GET /api/quiz/student/analytics/export?format=csv
Authorization: Bearer <student_token>
```

## Database Schema Enhancements

### StudentQuizAttempt Schema

The existing schema already supports all analytics features:

```typescript
{
  student_id: ObjectId,
  quiz_group_id: ObjectId,
  module_id: ObjectId,
  chapter_id: ObjectId,
  status: AttemptStatusEnum,
  score_percentage: number,
  correct_answers: number,
  total_questions: number,
  time_taken_seconds: number,
  is_passed: boolean,
  attempt_number: number,
  answers: [{
    quiz_id: ObjectId,
    selected_answers: [String],
    time_spent_seconds: Number
  }],
  started_at: Date,
  completed_at: Date
}
```

## Implementation Details

### Analytics Service Architecture

#### QuizAnalyticsService

- **Admin Analytics**: Aggregates data across all students
- **Student Analytics**: Personal performance tracking
- **Export Functionality**: CSV/JSON generation
- **Filtering**: Multi-criteria filtering support

#### Key Features:

1. **MongoDB Aggregation Pipelines**: Optimized for performance
2. **Role-based Access Control**: Secure data access
3. **Multi-tenant Support**: School-specific analytics
4. **Real-time Calculations**: Dynamic score and rate calculations

### Performance Optimizations

#### Database Indexes

```javascript
// StudentQuizAttempt indexes
{ student_id: 1, quiz_group_id: 1 }
{ student_id: 1, module_id: 1 }
{ student_id: 1, chapter_id: 1 }
{ quiz_group_id: 1, status: 1 }
{ score_percentage: 1 }
{ completed_at: 1 }
```

#### Aggregation Optimizations

- **Indexed lookups** for related data
- **Efficient grouping** by quiz groups
- **Optimized sorting** for most missed questions
- **Streaming exports** for large datasets

## Usage Examples

### 1. Admin Dashboard Integration

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

### 2. Student Progress Tracking

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

### 3. Filtered Analytics

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

### 4. Export Functionality

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

## Security Considerations

### Role-based Access

- **Admins**: Can view all analytics across all students
- **Students**: Can only view their own personal analytics
- **JWT Validation**: All endpoints require valid authentication

### Data Privacy

- **Student Data**: Isolated per student in tenant databases
- **School Isolation**: Analytics are school-specific
- **Audit Trail**: All analytics access is logged

## Error Handling

### Common Error Responses

```json
{
  "statusCode": 403,
  "message": "Only admins can access quiz analytics",
  "error": "Forbidden"
}
```

```json
{
  "statusCode": 400,
  "message": "Invalid filter parameters",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "Unsupported export format",
  "error": "Bad Request"
}
```

## Testing

### Running the Test Suite

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

## Future Enhancements

### Planned Features

1. **Real-time Analytics**: Live dashboard updates
2. **Advanced Visualizations**: Charts and graphs
3. **Predictive Analytics**: Performance predictions
4. **Comparative Analytics**: Student vs class averages
5. **Automated Reports**: Scheduled analytics reports

### Performance Improvements

1. **Caching Layer**: Redis-based analytics caching
2. **Background Processing**: Async analytics generation
3. **Data Archiving**: Historical data management
4. **Query Optimization**: Further database optimizations

## Conclusion

The quiz analytics system provides comprehensive insights for both administrators and students, with robust filtering, export capabilities, and security measures. The implementation follows best practices for performance, scalability, and maintainability.

All test cases (TC-001 through TC-004) have been successfully implemented and tested, providing a solid foundation for educational analytics in the AI Professor platform.
