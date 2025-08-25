# Enhanced Student Activity Tracking

This document describes the enhanced activity logging system that now properly tracks student activities including module starts, chapter starts, quiz submissions, and progress updates.

## Overview

The activity log interceptor has been enhanced to automatically track student activities when they:

- Start a module
- Start a chapter
- Mark a chapter as complete
- Start a quiz attempt
- Submit quiz answers
- Complete modules and chapters

## New Activity Types

### Progress Tracking Activities

- `MODULE_STARTED` - When a student starts a module
- `MODULE_COMPLETED` - When a student completes a module (all chapters + quiz)
- `CHAPTER_STARTED` - When a student starts a chapter
- `CHAPTER_COMPLETED` - When a student manually marks a chapter as complete
- `QUIZ_STARTED` - When a student starts a quiz attempt
- `QUIZ_SUBMITTED` - When a student submits quiz answers
- `PROGRESS_UPDATED` - General progress updates
- `PROGRESS_COMPLETED` - When progress reaches 100%

### Quiz-Specific Activities

- `QUIZ_STARTED` - New activity type for quiz initiation
- `QUIZ_SUBMITTED` - New activity type for quiz completion

## Enhanced Metadata Extraction

The interceptor now extracts comprehensive metadata for student activities:

### Module Activities

```typescript
{
  module_id: "507f1f77bcf86cd799439011",
  module_name: "Introduction to Psychology",
  progress_status: "IN_PROGRESS",
  started_at: "2024-01-15T10:00:00.000Z",
  progress_percentage: 0,
  chapters_completed: 0,
  total_chapters: 5
}
```

### Chapter Activities

```typescript
{
  module_id: "507f1f77bcf86cd799439011",
  chapter_id: "507f1f77bcf86cd799439012",
  chapter_name: "Chapter 1: Basics",
  progress_status: "COMPLETED",
  started_at: "2024-01-15T10:00:00.000Z",
  completed_at: "2024-01-15T10:30:00.000Z",
  chapter_sequence: 1,
  chapter_quiz_completed: false
}
```

### Quiz Activities

```typescript
{
  module_id: "507f1f77bcf86cd799439011",
  chapter_id: "507f1f77bcf86cd799439012",
  quiz_group_id: "507f1f77bcf86cd799439013",
  attempt_id: "507f1f77bcf86cd799439014",
  score_percentage: 85,
  correct_answers: 17,
  total_questions: 20,
  is_passed: true,
  time_taken_seconds: 1200
}
```

## API Endpoints Tracked

### Progress Endpoints

- `POST /api/progress/modules/start` → `MODULE_STARTED`
- `POST /api/progress/chapters/start` → `CHAPTER_STARTED`
- `POST /api/progress/chapters/complete` → `CHAPTER_COMPLETED`
- `POST /api/progress/quiz/start` → `QUIZ_STARTED`
- `POST /api/progress/quiz/submit` → `QUIZ_SUBMITTED`

### Automatic Detection

The interceptor automatically detects these activities based on:

- URL path patterns
- HTTP methods
- Request body content
- User role (STUDENT)

## Enhanced Logging

### Debug Information

For student activities, the interceptor now logs:

- Activity type being logged
- User ID and endpoint
- Extracted metadata
- Success/failure status

### Non-Blocking Operation

All activity logging is completely non-blocking:

- Uses Promise.resolve().then() for async operations
- Never blocks the main application response
- Handles all errors gracefully
- Continues even if logging fails

## Database Schema

### Activity Log Schema

```typescript
{
  activity_type: ActivityTypeEnum,
  description: string,
  performed_by: ObjectId,
  performed_by_role: RoleEnum,
  school_id: ObjectId,
  module_id: ObjectId,        // For module/chapter activities
  chapter_id: ObjectId,       // For chapter/quiz activities
  quiz_group_id: ObjectId,    // For quiz activities
  metadata: {
    // Progress-specific data
    progress_status: string,
    started_at: Date,
    completed_at: Date,
    progress_percentage: number,
    chapters_completed: number,
    total_chapters: number,
    chapter_sequence: number,
    chapter_quiz_completed: boolean,

    // Quiz-specific data
    attempt_id: string,
    score_percentage: number,
    correct_answers: number,
    total_questions: number,
    is_passed: boolean,
    time_taken_seconds: number
  },
  ip_address: string,
  user_agent: string,
  is_success: boolean,
  execution_time_ms: number,
  endpoint: string,
  http_method: string,
  http_status_code: number
}
```

## Usage Examples

### 1. Student Starts a Module

```typescript
// POST /api/progress/modules/start
{
  "module_id": "507f1f77bcf86cd799439011"
}

// Activity Log Created:
{
  activity_type: "MODULE_STARTED",
  description: "Module started successfully",
  performed_by: "student_id",
  performed_by_role: "STUDENT",
  module_id: "507f1f77bcf86cd799439011",
  metadata: {
    progress_status: "IN_PROGRESS",
    started_at: "2024-01-15T10:00:00.000Z",
    progress_percentage: 0,
    chapters_completed: 0,
    total_chapters: 5
  }
}
```

### 2. Student Submits Quiz

```typescript
// POST /api/progress/quiz/submit
{
  "attempt_id": "507f1f77bcf86cd799439014",
  "answers": [...]
}

// Activity Log Created:
{
  activity_type: "QUIZ_SUBMITTED",
  description: "Quiz submitted successfully",
  performed_by: "student_id",
  performed_by_role: "STUDENT",
  module_id: "507f1f77bcf86cd799439011",
  chapter_id: "507f1f77bcf86cd799439012",
  quiz_group_id: "507f1f77bcf86cd799439013",
  metadata: {
    attempt_id: "507f1f77bcf86cd799439014",
    score_percentage: 85,
    correct_answers: 17,
    total_questions: 20,
    is_passed: true,
    time_taken_seconds: 1200
  }
}
```

## Monitoring and Analytics

### Activity Dashboard

Administrators can now track:

- Student engagement patterns
- Module/chapter completion rates
- Quiz performance metrics
- Learning progress timelines
- Time spent on different activities

### Performance Metrics

- Quiz success rates by chapter
- Average completion times
- Student progression through modules
- Quiz retake patterns

## Configuration

### Environment Variables

No additional configuration required - the interceptor is applied globally and automatically detects student activities.

### Logging Levels

- `DEBUG`: Detailed metadata extraction logs
- `INFO`: Standard activity logging
- `ERROR`: Non-critical logging failures

## Troubleshooting

### Common Issues

1. **Activities not being logged**: Check if the interceptor is applied globally
2. **Missing metadata**: Verify request body contains required fields
3. **Performance impact**: All logging is non-blocking, so no performance impact

### Debug Mode

Enable debug logging to see:

- Activity type detection
- Metadata extraction
- Database operation results

## Future Enhancements

### Planned Features

- Real-time activity notifications
- Advanced analytics dashboard
- Export capabilities for compliance
- Integration with learning management systems
- Custom activity type definitions

### API Extensions

- Bulk activity log retrieval
- Activity filtering by date ranges
- Student progress summaries
- Comparative analytics between students
