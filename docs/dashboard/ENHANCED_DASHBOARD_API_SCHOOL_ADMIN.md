# Enhanced Dashboard API Documentation

## Overview

The Enhanced Dashboard API provides comprehensive analytics for school admins and professors to monitor student performance, module engagement, and AI feedback patterns. This API includes detailed statistics, filtering capabilities, and role-based access control.

## API Endpoint

```
GET /api/school-admin/dashboard
```

## Authentication & Authorization

- **Authentication**: JWT Bearer Token required
- **Authorization**: 
  - `SCHOOL_ADMIN`: Can view all modules and data
  - `PROFESSOR`: Can only view data for assigned modules

## Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `from_date` | string | No | Filter by start date (YYYY-MM-DD) | `2024-01-01` |
| `to_date` | string | No | Filter by end date (YYYY-MM-DD) | `2024-12-31` |
| `module_id` | string | No | Filter by specific module ID | `507f1f77bcf86cd799439011` |
| `cohort` | string | No | Filter by cohort/class name | `Class of 2024` |

## Response Structure

```json
{
  "message": "Dashboard statistics retrieved successfully",
  "data": {
    "overview": {
      "active_students": 45,
      "total_students": 60,
      "average_completion_percentage": 78,
      "total_modules": 8,
      "active_modules": 6
    },
    "module_performance": [
      {
        "module_id": "507f1f77bcf86cd799439011",
        "title": "Child Development Psychology",
        "completion_percentage": 85,
        "active_students": 12,
        "average_time_spent": 120,
        "drop_off_rate": 15
      }
    ],
    "ai_feedback_errors": [
      {
        "error_type": "misunderstanding_trauma_cues",
        "count": 23,
        "percentage": 15.3,
        "affected_students": 8,
        "affected_modules": 3
      }
    ],
    "engagement_metrics": {
      "total_views": 1250,
      "average_session_duration": 45,
      "completion_rate": 78,
      "drop_off_points": [
        {
          "module_id": "507f1f77bcf86cd799439011",
          "title": "Child Development Psychology",
          "drop_off_percentage": 25,
          "common_issues": ["Complex terminology", "Long video content"]
        }
      ]
    },
    "quiz_statistics": {
      "total_quiz_attempts": 150,
      "passed_quiz_attempts": 120,
      "quiz_pass_rate": 80,
      "average_quiz_score": 75,
      "total_ai_chat_sessions": 85
    }
  }
}
```

## Features

### 1. Active Student Count (TC-001)
- **Description**: Displays number of students who accessed content in the last 24 hours
- **Calculation**: Students with `last_accessed_at` within 24 hours
- **Filter**: Respects date range and module filters

### 2. Average Module Completion Percentage (TC-002)
- **Description**: Shows average completion percentage across all modules
- **Calculation**: Average of all student progress percentages
- **Role-based**: Professors only see their assigned modules

### 3. AI Feedback Error Analysis (TC-003)
- **Description**: Analyzes most common AI feedback error types
- **Features**:
  - Error type categorization
  - Affected student count
  - Percentage distribution
  - Module impact analysis

### 4. Module Engagement Metrics (TC-004)
- **Description**: Comprehensive engagement statistics
- **Metrics**:
  - Total views
  - Average session duration
  - Completion rate
  - Drop-off points identification

### 5. Advanced Filtering (TC-005)
- **Date Range**: Filter by specific date periods
- **Module Filter**: Focus on specific modules
- **Cohort Filter**: Analyze specific student groups
- **Real-time Updates**: Data updates within 24 hours

### 6. Quiz Statistics (TC-006)
- **Total Quiz Attempts**: Count of all quiz attempts in the school
- **Quiz Pass Rate**: Percentage of quiz attempts that passed
- **Average Quiz Score**: Mean score across all quiz attempts
- **AI Chat Sessions**: Total number of AI practice sessions created
- **Performance Tracking**: Real-time monitoring of student assessment performance

## Quiz Statistics Calculation

### Overview
The quiz statistics provide comprehensive insights into student assessment performance and AI practice session engagement within the school.

### Metrics Breakdown

#### 1. Total Quiz Attempts
- **Description**: Count of all quiz attempts made by students
- **Calculation**: `COUNT(*)` from `student_quiz_attempts` collection
- **Filtering**: Respects date range, module, and professor assignment filters
- **Real-time**: Updates with each new quiz attempt

#### 2. Quiz Pass Rate
- **Description**: Percentage of quiz attempts that achieved passing scores
- **Calculation**: `(passed_attempts / total_attempts) * 100`
- **Passing Criteria**: Based on `is_passed` field in quiz attempts
- **Accuracy**: Rounded to nearest whole percentage

#### 3. Average Quiz Score
- **Description**: Mean score percentage across all quiz attempts
- **Calculation**: `AVG(score_percentage)` from all attempts
- **Score Range**: 0-100 percentage scale
- **Precision**: Rounded to nearest whole number

#### 4. AI Chat Sessions
- **Description**: Total number of AI practice sessions created by students
- **Calculation**: `COUNT(*)` from `ai_chat_sessions` collection
- **Session Types**: Includes all AI practice scenarios (patient simulation, supervisor analysis)
- **Filtering**: Respects module and date range filters

### Performance Considerations
- **Database Optimization**: Uses indexed fields for efficient querying
- **Aggregation**: Leverages MongoDB aggregation pipeline for accurate calculations
- **Error Handling**: Graceful fallback to default values if calculations fail
- **Caching**: Results are cached to improve response times for large datasets

### Data Accuracy
- **Real-time Updates**: Statistics reflect current database state
- **Filter Consistency**: All metrics respect the same filtering criteria
- **Role-based Access**: Professors only see data for their assigned modules
- **Data Integrity**: Excludes soft-deleted records and invalid data

## Test Cases

### Test Case 1: Display of Active Student Count (TC-001)

**Description**: Display number of active students on dashboard

**Precondition**: At least one student has logged in and interacted with content

**Test Steps**:
1. Log in as school admin or professor
2. View the dashboard
3. Locate "Active Students" section

**Expected Result**: Correct count of students who accessed content in the last 24 hours or selected date range is displayed

### Test Case 2: Show Average Module Completion Percentage (TC-002)

**Description**: Show average completion percentage across modules

**Precondition**: At least one student has progress data in modules

**Test Steps**:
1. Log in as school admin or professor
2. View the dashboard
3. Locate "Average Completion Percentage" section

**Expected Result**: Correct average completion percentage is displayed

### Test Case 3: Display Quiz Statistics (TC-006)

**Description**: Display comprehensive quiz performance statistics

**Precondition**: At least one quiz attempt exists in the system

**Test Steps**:
1. Log in as school admin or professor
2. View the dashboard
3. Locate "Quiz Statistics" section

**Expected Result**: 
- Total quiz attempts count is displayed
- Quiz pass rate percentage is shown
- Average quiz score is calculated and displayed
- Total AI chat sessions count is shown
- All statistics respect date and module filters

### Test Case 4: View Most Common AI-Reported Errors (TC-003)

**Description**: Show top AI feedback error categories

**Precondition**: Students have interacted with AI anchor points and received feedback

**Test Steps**:
1. Log in as professor
2. Open dashboard
3. View "Top Error Types" widget or section

**Expected Result**: A list of the most common feedback types is shown (e.g., misunderstanding trauma cues, diagnostic error)

### Test Case 4: Module Engagement Metrics (TC-004)

**Description**: Display student engagement stats for each module

**Precondition**: Modules have been accessed and exited by students

**Test Steps**:
1. Open the dashboard
2. Go to Module Analytics
3. View start/completion/drop-off metrics

**Expected Result**: Each module shows number of views, average time spent, and % completed

### Test Case 5: Filter Dashboard by Cohort, Module, or Date (TC-005)

**Description**: Allow filtering of dashboard data

**Precondition**: Platform has student data across multiple modules, cohorts, and time periods

**Test Steps**:
1. Apply filter for a specific cohort or module
2. Change date range to "Last 7 Days"
3. Observe chart and stat updates

**Expected Result**: Dashboard charts, tables, and KPIs update based on selected filters

## Role-Based Access Control

### School Admin Access
- Can view all modules and student data
- Full access to all statistics and metrics
- Can filter by any module, date range, or cohort

### Professor Access
- Can only view data for assigned modules
- Limited to modules where they are assigned as professor
- Same filtering capabilities but restricted to assigned modules

## Error Handling

### Common Error Responses

```json
{
  "statusCode": 400,
  "message": "School not found",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 403,
  "message": "Access denied - insufficient permissions",
  "error": "Forbidden"
}
```

```json
{
  "statusCode": 200,
  "message": "No modules assigned to this professor",
  "data": {
    "overview": {
      "active_students": 0,
      "total_students": 0,
      "average_completion_percentage": 0,
      "total_modules": 0,
      "active_modules": 0
    },
    "module_performance": [],
    "ai_feedback_errors": [],
    "engagement_metrics": {
      "total_views": 0,
      "average_session_duration": 0,
      "completion_rate": 0,
      "drop_off_points": []
    }
  }
}
```

## Performance Considerations

- Data is cached and updated within 24 hours
- Large datasets are paginated for optimal performance
- Database queries are optimized with proper indexing
- Real-time calculations are performed efficiently

## Security Features

- JWT token authentication required
- Role-based access control
- Data isolation between schools
- Input validation and sanitization
- SQL injection prevention

## Usage Examples

### Basic Dashboard Request
```bash
curl -X GET "https://api.example.com/api/school-admin/dashboard" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Filtered Dashboard Request
```bash
curl -X GET "https://api.example.com/api/school-admin/dashboard?from_date=2024-01-01&to_date=2024-12-31&module_id=507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Professor-Specific Request
```bash
curl -X GET "https://api.example.com/api/school-admin/dashboard?cohort=Class%20of%202024" \
  -H "Authorization: Bearer PROFESSOR_JWT_TOKEN"
```

## Implementation Notes

1. **Data Freshness**: All statistics are calculated from real-time data
2. **Scalability**: Designed to handle large datasets efficiently
3. **Extensibility**: Easy to add new metrics and filters
4. **Monitoring**: Comprehensive logging for debugging and monitoring
5. **Caching**: Strategic caching to improve response times
6. **Quiz Analytics**: Real-time calculation of quiz performance metrics
7. **AI Session Tracking**: Comprehensive monitoring of AI practice sessions
