# Progress Tracking System Documentation

## Overview

The Progress Tracking System is a comprehensive solution for monitoring student learning progress across modules, chapters, and quizzes in the AI Professor platform. It provides real-time tracking, validation, and dashboard capabilities for both students and school administrators.

## Features

### ✅ **Module Progress Tracking**

- Track when students start modules
- Monitor progress percentage based on chapter completion
- Calculate overall module completion status
- Track time spent and last access times

### ✅ **Chapter Progress Tracking**

- Sequential chapter access validation
- Track chapter start and completion times
- Monitor quiz completion per chapter
- Prevent access to next chapter until previous chapter quiz is completed

### ✅ **Quiz Attempt Tracking**

- Track individual quiz attempts with detailed scoring
- Support for multiple attempts with attempt numbering
- Store individual question answers and timing
- Calculate pass/fail status based on configurable thresholds

### ✅ **Access Validation**

- Enforce sequential chapter progression
- Validate module quiz access (all chapters must be completed)
- Check prerequisites before allowing quiz attempts
- Provide clear error messages for access restrictions

### ✅ **Dashboard Analytics**

- Student dashboard with personal progress overview
- School admin dashboard with class-wide analytics
- Progress filtering and search capabilities
- Recent activity tracking

### ✅ **Performance Optimized**

- Comprehensive database indexing for fast queries
- Efficient aggregation pipelines for large datasets
- Optimized for multi-tenant architecture
- Scalable for thousands of students per school

## Database Schema

### Student Module Progress

```typescript
{
  student_id: ObjectId,           // Reference to student
  module_id: ObjectId,            // Reference to module
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED',
  started_at: Date,               // When student started the module
  completed_at: Date,             // When student completed the module
  progress_percentage: Number,    // 0-100, calculated from chapter progress
  chapters_completed: Number,     // Count of completed chapters
  total_chapters: Number,         // Total chapters in the module
  module_quiz_completed: Boolean, // Whether module quiz is completed
  last_accessed_at: Date,         // Last time student accessed this module
}
```

### Student Chapter Progress

```typescript
{
  student_id: ObjectId,           // Reference to student
  module_id: ObjectId,            // Reference to module
  chapter_id: ObjectId,           // Reference to chapter
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED',
  started_at: Date,               // When student started the chapter
  completed_at: Date,             // When student completed the chapter
  chapter_quiz_completed: Boolean, // Whether chapter quiz is completed
  quiz_completed_at: Date,        // When chapter quiz was completed
  chapter_sequence: Number,       // Chapter sequence number for validation
  last_accessed_at: Date,         // Last time student accessed this chapter
}
```

### Student Quiz Attempts

```typescript
{
  student_id: ObjectId,           // Reference to student
  quiz_group_id: ObjectId,        // Reference to quiz group
  module_id: ObjectId,            // Reference to module (if applicable)
  chapter_id: ObjectId,           // Reference to chapter (if applicable)
  status: 'IN_PROGRESS' | 'COMPLETED' | 'TIMEOUT' | 'ABANDONED',
  started_at: Date,               // When attempt was started
  completed_at: Date,             // When attempt was completed
  score_percentage: Number,       // 0-100 score percentage
  correct_answers: Number,        // Number of correct answers
  total_questions: Number,        // Total number of questions
  time_taken_seconds: Number,     // Time taken to complete quiz
  is_passed: Boolean,            // Whether the attempt passed
  passing_threshold: Number,      // Pass threshold (default 60%)
  attempt_number: Number,         // Sequential attempt number
  answers: [{                     // Individual question answers
    quiz_id: ObjectId,
    selected_answers: [String],
    is_correct: Boolean,
    time_spent_seconds: Number
  }]
}
```

## API Endpoints

### Student Endpoints

#### Start Module

```http
POST /api/progress/modules/start
Authorization: Bearer <student_token>
Content-Type: application/json

{
  "module_id": "507f1f77bcf86cd799439011"
}
```

#### Start Chapter

```http
POST /api/progress/chapters/start
Authorization: Bearer <student_token>
Content-Type: application/json

{
  "chapter_id": "507f1f77bcf86cd799439011"
}
```

#### Start Quiz Attempt

```http
POST /api/progress/quiz/start
Authorization: Bearer <student_token>
Content-Type: application/json

{
  "quiz_group_id": "507f1f77bcf86cd799439011"
}
```

#### Submit Quiz Answers

```http
POST /api/progress/quiz/submit
Authorization: Bearer <student_token>
Content-Type: application/json

{
  "quiz_group_id": "507f1f77bcf86cd799439011",
  "answers": [
    {
      "quiz_id": "507f1f77bcf86cd799439012",
      "selected_answers": ["Option A", "Option B"],
      "time_spent_seconds": 30
    }
  ],
  "time_taken_seconds": 25
}
```

#### Get Student Progress

```http
GET /api/progress/modules?page=1&limit=10&status=IN_PROGRESS
GET /api/progress/chapters?module_id=507f1f77bcf86cd799439011
GET /api/progress/quiz-attempts?module_id=507f1f77bcf86cd799439011
Authorization: Bearer <student_token>
```

#### Student Dashboard

```http
GET /api/progress/dashboard
Authorization: Bearer <student_token>
```

#### Validation Endpoints

```http
GET /api/progress/chapters/507f1f77bcf86cd799439011/can-access
GET /api/progress/quiz/507f1f77bcf86cd799439011/can-access
Authorization: Bearer <student_token>
```

### Admin/Professor Endpoints

#### School Dashboard

```http
GET /api/progress/admin/dashboard
GET /api/progress/admin/dashboard?module_id=507f1f77bcf86cd799439011
Authorization: Bearer <admin_token>
```

## Usage Examples

### Frontend Integration

#### Starting a Module

```typescript
const startModule = async (moduleId: string) => {
  try {
    const response = await fetch('/api/progress/modules/start', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ module_id: moduleId }),
    });

    const result = await response.json();
    if (response.ok) {
      console.log('Module started:', result.data);
      // Update UI with progress information
    }
  } catch (error) {
    console.error('Error starting module:', error);
  }
};
```

#### Checking Chapter Access

```typescript
const canAccessChapter = async (chapterId: string) => {
  try {
    const response = await fetch(
      `/api/progress/chapters/${chapterId}/can-access`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    const result = await response.json();
    if (result.data.can_access) {
      // Allow chapter access
      navigateToChapter(chapterId);
    } else {
      // Show access restriction message
      showError(result.data.reason);
    }
  } catch (error) {
    console.error('Error checking chapter access:', error);
  }
};
```

#### Submitting Quiz

```typescript
const submitQuiz = async (quizGroupId: string, answers: QuizAnswer[]) => {
  try {
    const response = await fetch('/api/progress/quiz/submit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quiz_group_id: quizGroupId,
        answers: answers,
        time_taken_seconds: calculateTimeTaken(),
      }),
    });

    const result = await response.json();
    if (response.ok) {
      // Show quiz results
      displayQuizResults(result.data);

      // If passed, update progress and enable next content
      if (result.data.is_passed) {
        updateProgressUI();
        enableNextContent();
      }
    }
  } catch (error) {
    console.error('Error submitting quiz:', error);
  }
};
```

## Business Logic Flow

### Module Progress Calculation

1. **Chapter Completion Weight**: 90% of module progress
   - Progress = (completed_chapters / total_chapters) \* 90
2. **Module Quiz Weight**: 10% of module progress
   - Additional 10% when module quiz is completed
3. **Final Status**: Module marked as COMPLETED when progress reaches 100%

### Chapter Access Validation

1. **First Chapter**: Always accessible (sequence = 1)
2. **Subsequent Chapters**: Require previous chapter quiz completion
3. **Validation Steps**:
   - Find previous chapter (sequence - 1)
   - Check if previous chapter quiz is completed
   - Allow/deny access based on validation

### Quiz Access Validation

1. **Chapter Quiz**: Must have access to the chapter
2. **Module Quiz**: All chapter quizzes must be completed
3. **Access Control**: Clear error messages for failed validation

## Performance Considerations

### Database Indexing Strategy

- **Compound Indexes**: student_id + module_id, student_id + chapter_id
- **Query Optimization**: Specialized indexes for common query patterns
- **Time-based Indexes**: For recent activity and dashboard queries
- **Status Indexes**: For filtering by progress/completion status

### Aggregation Pipelines

- **Dashboard Queries**: Optimized aggregations for statistics
- **Progress Calculations**: Efficient batch updates
- **Filtering**: Indexed fields for fast filtering operations

### Caching Strategy

- **Dashboard Data**: Cache frequently accessed statistics
- **Progress Calculations**: Batch updates to reduce database calls
- **Validation Results**: Cache access validation results

## Migration and Deployment

### Database Migration

```bash
# Run the migration to add progress tracking to existing tenants
npm run migration:run:tenant 20250115000000-add-progress-tracking
```

### Environment Variables

No additional environment variables required. Uses existing database connections.

### Monitoring

- Monitor query performance with database profiling
- Track API response times for progress endpoints
- Monitor progress calculation accuracy

## Error Handling

### Common Error Scenarios

1. **Access Denied**: Clear messaging about prerequisites
2. **Invalid Progress State**: Graceful handling and recovery
3. **Duplicate Attempts**: Prevent duplicate quiz attempts
4. **Data Consistency**: Transaction-based updates for critical operations

### Error Response Format

```json
{
  "statusCode": 403,
  "message": "You must complete the quiz for \"Introduction to Psychology\" before accessing this chapter",
  "error": "Forbidden"
}
```

## Security Considerations

### Access Control

- **Student Isolation**: Students can only access their own progress
- **Role-based Access**: Admin/Professor access to school-wide data
- **Data Validation**: Comprehensive input validation and sanitization

### Data Privacy

- **Progress Data**: Encrypted in transit and at rest
- **Access Logs**: Audit trail for data access
- **GDPR Compliance**: Support for data deletion requests

## Future Enhancements

### Planned Features

- **Learning Analytics**: Advanced analytics and insights
- **Adaptive Learning**: Progress-based content recommendations
- **Gamification**: Badges and achievements based on progress
- **Reporting**: Detailed progress reports for educators
- **Mobile Offline**: Offline progress tracking capabilities

### API Versioning

- Current version: v1
- Backward compatibility maintained for major version updates
- Deprecation notices for breaking changes

## Support and Troubleshooting

### Common Issues

1. **Slow Dashboard Loading**: Check database indexes and query optimization
2. **Progress Not Updating**: Verify transaction completion and error logs
3. **Access Validation Errors**: Check chapter sequence and quiz completion status

### Debug Mode

Enable detailed logging by setting log level to DEBUG in development:

```typescript
// In progress.service.ts
this.logger.debug('Detailed progress calculation steps...');
```

### Performance Monitoring

```typescript
// Monitor query execution time
const startTime = Date.now();
// ... database operation
this.logger.log(`Query executed in ${Date.now() - startTime}ms`);
```
