# Chapter Completion Flow

This document describes the updated chapter completion flow where students must manually mark chapters as complete before accessing quizzes.

## Overview

The progress tracking system has been updated to separate **manual chapter completion** from **quiz completion**:

- **Manual Chapter Completion**: Students must click a "Mark as Complete" button to mark a chapter as finished
- **Quiz Completion**: Students can only access chapter quizzes after manually marking the chapter as complete
- **Status Tracking**: Two separate fields track progress:
  - `status`: Tracks manual completion (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`)
  - `chapter_quiz_completed`: Tracks quiz completion (boolean)

## API Endpoints

### 1. Mark Chapter as Complete

**Endpoint**: `POST /api/progress/chapters/complete`

**Description**: Manually mark a chapter as complete. This is required before accessing the chapter quiz.

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Request Body**:
```json
{
  "chapter_id": "507f1f77bcf86cd799439011"
}
```

**Response**:
```json
{
  "message": "Chapter marked as complete successfully",
  "data": {
    "chapter_id": "507f1f77bcf86cd799439011",
    "module_id": "507f1f77bcf86cd799439012",
    "status": "COMPLETED",
    "completed_at": "2024-01-15T10:00:00.000Z",
    "chapter_quiz_completed": false
  }
}
```

**Error Responses**:
- `404`: Chapter not found
- `403`: Only students can mark chapters as complete
- `400`: Bad request

### 2. Start Quiz Attempt

**Endpoint**: `POST /api/progress/quiz/start`

**Description**: Start a quiz attempt. For chapter quizzes, the chapter must be manually completed first.

**Validation**: 
- For chapter quizzes: Chapter must be marked as complete (`status: COMPLETED`)
- For module quizzes: All chapters must be marked as complete and their quizzes passed

**Error Response** (if chapter not completed):
```json
{
  "message": "You must mark \"Chapter Title\" as complete before taking the quiz",
  "error": "Forbidden",
  "statusCode": 403
}
```

## Flow Diagram

```
1. Student starts chapter
   ↓
2. Student reads chapter content
   ↓
3. Student clicks "Mark as Complete" button
   ↓
4. API call: POST /api/progress/chapters/complete
   ↓
5. Chapter status set to COMPLETED
   ↓
6. Quiz becomes visible/accessible
   ↓
7. Student takes quiz
   ↓
8. Quiz completion sets chapter_quiz_completed = true
   ↓
9. Next chapter becomes accessible
```

## Database Schema Changes

### Student Chapter Progress Schema

```typescript
{
  student_id: ObjectId,
  module_id: ObjectId,
  chapter_id: ObjectId,
  status: ProgressStatusEnum, // NOT_STARTED, IN_PROGRESS, COMPLETED
  started_at: Date,
  completed_at: Date, // Set when manually marked complete
  chapter_quiz_completed: boolean, // Set when quiz is passed
  quiz_completed_at: Date,
  chapter_sequence: number,
  last_accessed_at: Date
}
```

## Frontend Integration

### 1. Chapter View

```javascript
// Check if chapter is completed
const isChapterCompleted = chapterProgress?.status === 'COMPLETED';

// Show "Mark as Complete" button if not completed
if (!isChapterCompleted) {
  return (
    <button onClick={markChapterComplete}>
      Mark Chapter as Complete
    </button>
  );
}
```

### 2. Quiz Access

```javascript
// Check if quiz is accessible
const canAccessQuiz = chapterProgress?.status === 'COMPLETED';

// Show quiz button only if chapter is completed
if (canAccessQuiz) {
  return (
    <button onClick={startQuiz}>
      Take Chapter Quiz
    </button>
  );
}
```

### 3. Next Chapter Access

```javascript
// Check if next chapter is accessible
const canAccessNextChapter = previousChapterProgress?.chapter_quiz_completed === true;

// Enable next chapter only if previous quiz is completed
if (canAccessNextChapter) {
  return (
    <button onClick={startNextChapter}>
      Start Next Chapter
    </button>
  );
}
```

## Validation Rules

### Chapter Access
- First chapter (sequence 1): Always accessible
- Subsequent chapters: Previous chapter's quiz must be completed (`chapter_quiz_completed: true`)

### Quiz Access
- Chapter quizzes: Chapter must be manually completed (`status: COMPLETED`)
- Module quizzes: All chapters must be manually completed and their quizzes passed

### Progress Calculation
- Module progress: Based on quiz completion (`chapter_quiz_completed: true`)
- Chapter status: Based on manual completion (`status: COMPLETED`)

## Testing Scenarios

### Test Case 1: Manual Chapter Completion
1. Student starts chapter
2. Student reads content
3. Student clicks "Mark as Complete"
4. Verify chapter status is `COMPLETED`
5. Verify quiz becomes accessible

### Test Case 2: Quiz Access Control
1. Try to access quiz without completing chapter
2. Verify error message: "You must mark 'Chapter Title' as complete before taking the quiz"
3. Complete chapter manually
4. Verify quiz is now accessible

### Test Case 3: Next Chapter Access
1. Complete chapter manually
2. Complete chapter quiz
3. Verify next chapter becomes accessible
4. Verify previous chapter's quiz completion is required

### Test Case 4: Module Quiz Access
1. Complete all chapters manually
2. Complete all chapter quizzes
3. Verify module quiz becomes accessible

## Migration Notes

- Existing progress data will continue to work
- Students may need to manually mark previously completed chapters as complete
- Quiz access will be restricted until chapters are manually marked complete
- No data migration required - new validation rules apply to new attempts