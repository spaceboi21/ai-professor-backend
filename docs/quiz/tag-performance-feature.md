# Tag Performance Tracking Feature

## Overview

The tag performance tracking feature calculates student performance based on quiz tags. When a student submits answers for a quiz group, the system analyzes each quiz's tags and tracks how well the student performs across different topics.

## How It Works

### Example Scenario

Let's say a quiz group has 10 quizzes with the following tag distribution:
- 3 quizzes tagged with "Trauma"
- 4 quizzes tagged with "Depression" 
- 2 quizzes tagged with "Anxiety"
- 1 quiz tagged with both "Trauma" and "Depression"

If a student answers:
- 2 out of 3 "Trauma" questions correctly
- 3 out of 4 "Depression" questions correctly
- 1 out of 2 "Anxiety" questions correctly

The tag performance would be:
- **Trauma**: 2/3 = 66.67%
- **Depression**: 3/4 = 75.00%
- **Anxiety**: 1/2 = 50.00%

## Implementation Details

### 1. Schema Changes

Updated `StudentQuizAttempt` schema to include:

```typescript
tag_performance: Array<{
  tag: string;
  correct_count: number;
  total_count: number;
  performance_percentage: number;
}>;
```

### 2. Calculation Logic

The `calculateTagPerformance` method:

1. **Iterates through each quiz** in the quiz group
2. **Determines correctness** using AI verification results or fallback comparison
3. **Processes quiz tags** and updates counters for each tag
4. **Calculates percentages** rounded to 2 decimal places
5. **Returns structured data** for storage

### 3. API Response

The `/api/progress/quiz/submit` endpoint now includes `tag_performance` in the response:

```json
{
  "message": "Quiz answers submitted successfully",
  "data": {
    "attempt_id": "507f1f77bcf86cd799439011",
    "score_percentage": 85,
    "correct_answers": 17,
    "total_questions": 20,
    "is_passed": true,
    "time_taken_seconds": 25,
    "status": "COMPLETED",
    "completed_at": "2024-01-15T10:25:00.000Z",
    "ai_verification": "completed",
    "ai_verification_report": {},
    "tag_performance": [
      {
        "tag": "Trauma",
        "correct_count": 2,
        "total_count": 3,
        "performance_percentage": 66.67
      },
      {
        "tag": "Depression",
        "correct_count": 3,
        "total_count": 4,
        "performance_percentage": 75.0
      }
    ]
  }
}
```

## Key Features

### Accuracy Through AI Integration
- **Primary Method**: Uses AI verification results for precise correctness determination
- **Fallback Method**: Manual comparison with stored correct answers if AI fails

### Comprehensive Tag Tracking
- **Per-Quiz Tags**: Each quiz can have multiple tags
- **Aggregated Performance**: Combines results across all quizzes in a group
- **Detailed Metrics**: Tracks both counts and percentages

### Persistent Storage
- **Database Storage**: Tag performance is stored in the `StudentQuizAttempt` record
- **Historical Data**: Performance data is preserved for future analysis
- **API Access**: Available immediately in the submission response

## Usage Examples

### Frontend Integration

```typescript
const submitQuiz = async (quizGroupId: string, answers: QuizAnswer[]) => {
  const response = await fetch('/api/progress/quiz/submit', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      quiz_group_id: quizGroupId,
      answers: answers,
      total_time_taken_seconds: 300
    })
  });

  const result = await response.json();
  
  // Access tag performance data
  const tagPerformance = result.data.tag_performance;
  
  // Display performance per tag
  tagPerformance.forEach(tag => {
    console.log(`${tag.tag}: ${tag.performance_percentage}% (${tag.correct_count}/${tag.total_count})`);
  });
};
```

### Performance Analysis

```typescript
// Analyze student's strongest and weakest areas
const analyzePerformance = (tagPerformance) => {
  const sorted = tagPerformance.sort((a, b) => b.performance_percentage - a.performance_percentage);
  
  const strongestAreas = sorted.slice(0, 3);
  const weakestAreas = sorted.slice(-3).reverse();
  
  console.log('Strongest areas:', strongestAreas);
  console.log('Areas for improvement:', weakestAreas);
};
```

## Benefits

1. **Personalized Feedback**: Students can see their performance in specific topic areas
2. **Learning Insights**: Identify strengths and areas for improvement
3. **Progress Tracking**: Monitor improvement over time in different subjects
4. **Adaptive Learning**: Enables recommendation systems based on performance patterns
5. **Data-Driven Decisions**: Educators can adjust curriculum based on common weak areas

## Technical Notes

- **Performance**: Tag calculation adds minimal overhead to quiz submission
- **Scalability**: Efficient aggregation handles large numbers of tags and quizzes
- **Reliability**: Graceful handling when AI verification fails
- **Accuracy**: Precise percentage calculations with proper rounding
