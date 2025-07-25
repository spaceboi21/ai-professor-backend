# Learning Logs Module

The Learning Logs module provides functionality to view and analyze AI chat feedback data from student conversations with AI. This module fetches data from existing AI chat feedback and session tables to provide insights into student learning progress and skill gaps.

## Features

- **Role-based Access Control**: Students can only see their own learning logs, while school admins can view all students' logs
- **Comprehensive Filtering**: Filter by module, skill gaps, date ranges, and student names
- **Skill Gap Analysis**: Track and analyze skill gaps using the predefined `AI_LEARNING_ERROR_TYPES`
- **Pagination Support**: Efficient handling of large datasets with pagination
- **Statistics**: Get skill gap statistics for better insights

## API Endpoints

### GET /api/learning-logs
Get learning logs with filtering and pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `module_title` (optional): Filter by module title
- `module_id` (optional): Filter by module ID
- `skill_gap` (optional): Filter by skill gap type
- `start_date` (optional): Filter by start date (YYYY-MM-DD)
- `end_date` (optional): Filter by end date (YYYY-MM-DD)
- `student_name` (optional): Filter by student name (school admin only)

**Response:**
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "session_id": "507f1f77bcf86cd799439012",
      "module_id": "507f1f77bcf86cd799439013",
      "module_title": "Child and Adolescent Development Psychology",
      "student_id": "507f1f77bcf86cd799439014",
      "student_name": "John Doe",
      "student_email": "john.doe@example.com",
      "session_started_at": "2024-01-15T10:30:00.000Z",
      "session_ended_at": "2024-01-15T11:45:00.000Z",
      "total_messages": 15,
      "student_messages": 8,
      "ai_messages": 7,
      "primary_skill_gap": "empathy",
      "skill_gaps": ["empathy", "listening", "patience"],
      "strengths": ["Good communication skills", "Active listening"],
      "areas_for_improvement": ["Improve empathy responses", "Ask more follow-up questions"],
      "missed_opportunities": ["Missed opportunity to show empathy"],
      "suggestions": ["Practice active listening", "Use more empathetic language"],
      "keywords_for_learning": ["psychology", "child-development", "communication"],
      "rating": {
        "overall": 7.5,
        "communication": 8,
        "empathy": 6,
        "professionalism": 9
      },
      "feedback_created_at": "2024-01-15T12:00:00.000Z",
      "session_title": "Child Counseling Session",
      "session_description": "Practice session focusing on child counseling techniques"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### GET /api/learning-logs/:id
Get a specific learning log by ID.

**Parameters:**
- `id`: Learning log ID

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "session_id": "507f1f77bcf86cd799439012",
  "module_id": "507f1f77bcf86cd799439013",
  "module_title": "Child and Adolescent Development Psychology",
  "student_id": "507f1f77bcf86cd799439014",
  "student_name": "John Doe",
  "student_email": "john.doe@example.com",
  "session_started_at": "2024-01-15T10:30:00.000Z",
  "session_ended_at": "2024-01-15T11:45:00.000Z",
  "total_messages": 15,
  "student_messages": 8,
  "ai_messages": 7,
  "primary_skill_gap": "empathy",
  "skill_gaps": ["empathy", "listening", "patience"],
  "strengths": ["Good communication skills", "Active listening"],
  "areas_for_improvement": ["Improve empathy responses", "Ask more follow-up questions"],
  "missed_opportunities": ["Missed opportunity to show empathy"],
  "suggestions": ["Practice active listening", "Use more empathetic language"],
  "keywords_for_learning": ["psychology", "child-development", "communication"],
  "rating": {
    "overall": 7.5,
    "communication": 8,
    "empathy": 6,
    "professionalism": 9
  },
  "feedback_created_at": "2024-01-15T12:00:00.000Z",
  "session_title": "Child Counseling Session",
  "session_description": "Practice session focusing on child counseling techniques"
}
```

### GET /api/learning-logs/stats/skill-gaps
Get skill gap statistics.

**Response:**
```json
[
  {
    "skill_gap": "empathy",
    "count": 15
  },
  {
    "skill_gap": "listening",
    "count": 12
  },
  {
    "skill_gap": "patience",
    "count": 8
  }
]
```

## Role-based Access Control

### Student Role
- Can only view their own learning logs
- Cannot see other students' data
- Can filter by module, skill gaps, and date ranges
- Can view their own skill gap statistics

### School Admin Role
- Can view all students' learning logs
- Can filter by student name in addition to other filters
- Can view skill gap statistics for all students
- Has full access to all learning log data

## Data Sources

The Learning Logs module fetches data from the following existing tables:

1. **ai_chat_feedback**: Contains feedback data including skill gaps, strengths, areas for improvement, etc.
2. **ai_chat_session**: Contains session information like start/end times, message counts, etc.
3. **modules**: Contains module information like titles and descriptions
4. **students**: Contains student information like names and emails

## Skill Gap Types

The module uses the predefined skill gap types from `AI_LEARNING_ERROR_TYPES` constant:

- empathy
- confidence
- clarity
- listening
- questioning
- rapport
- professionalism
- thoroughness
- sensitivity
- efficiency
- accuracy
- responsiveness
- assertiveness
- focus
- patience
- initiative
- organization
- judgment
- tone
- structure
- articulation
- emotional_control
- critical_thinking
- problem_solving
- engagement
- motivation
- collaboration
- adaptability
- receptiveness
- transparency
- openness
- integrity
- diplomacy
- reassurance
- respect
- trustworthiness
- consistency
- clarification
- concision
- timeliness
- curiosity
- initiative
- persuasion
- direction
- perspective
- validation
- inclusivity
- tone_management
- boundary_setting
- expectation_management

## Implementation Details

### Service Layer
- `LearningLogsService`: Handles business logic and data aggregation
- Uses MongoDB aggregation pipelines for efficient data retrieval
- Implements role-based filtering at the database level
- Transforms raw data into structured response DTOs

### Controller Layer
- `LearningLogsController`: Handles HTTP requests and responses
- Implements JWT authentication and role-based authorization
- Provides comprehensive API documentation with Swagger
- Includes proper error handling and logging

### Data Transformation
- Aggregates data from multiple collections using MongoDB lookups
- Validates skill gaps against the predefined constant
- Formats dates and handles missing data gracefully
- Provides consistent response structure

## Usage Examples

### For Students
```javascript
// Get student's own learning logs
GET /api/learning-logs?page=1&limit=10

// Filter by skill gap
GET /api/learning-logs?skill_gap=empathy

// Filter by date range
GET /api/learning-logs?start_date=2024-01-01&end_date=2024-01-31
```

### For School Admins
```javascript
// Get all students' learning logs
GET /api/learning-logs?page=1&limit=20

// Filter by specific student
GET /api/learning-logs?student_name=John

// Filter by module and skill gap
GET /api/learning-logs?module_title=Child Development&skill_gap=empathy

// Get skill gap statistics
GET /api/learning-logs/stats/skill-gaps
```

## Error Handling

The module includes comprehensive error handling:

- **404 Not Found**: When learning log or school is not found
- **400 Bad Request**: When invalid parameters are provided
- **403 Forbidden**: When user doesn't have permission to access data
- **500 Internal Server Error**: When database operations fail

## Performance Considerations

- Uses MongoDB aggregation pipelines for efficient data retrieval
- Implements proper indexing on frequently queried fields
- Provides pagination to handle large datasets
- Uses role-based filtering at the database level to minimize data transfer 