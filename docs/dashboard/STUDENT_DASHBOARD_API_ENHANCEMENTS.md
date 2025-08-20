# Student Dashboard API Enhancements Documentation

## Overview

The Student Dashboard API (`GET /api/progress/dashboard`) has been enhanced with two new features while maintaining complete backward compatibility. All existing fields remain unchanged, and new functionality is added through additional response fields.

## API Endpoint

```
GET /api/progress/dashboard?school_id={school_id}&student_id={student_id}
```

### Authorization
- **Header**: `Authorization: Bearer {student_token}`
- **Roles**: STUDENT, SCHOOL_ADMIN, PROFESSOR, SUPER_ADMIN

## Enhanced Response Structure

### Original Fields (Unchanged)
All existing fields remain exactly the same:
- `message`: Success message
- `data.overview`: Module progress statistics
- `data.recent_activity`: Recent module activities

### New Fields Added

#### 1. AI Conversation Errors Summary
**Field**: `data.ai_conversation_errors_summary`
**Type**: `Array<Object>`
**Description**: Summary of student's AI conversation errors categorized by skill gaps

```typescript
interface AIConversationErrorsSummary {
  skill_gap: string;           // The identified weakness/skill gap
  count: number;               // Number of times this issue occurred
  modules: string[];           // List of module names where this issue was found
  latest_occurrence: string;   // ISO date of most recent occurrence
}
```

#### 2. Recent Feedback Preview
**Field**: `data.recent_feedback_preview`
**Type**: `Object`
**Description**: Preview of most recent AI and professor feedback

```typescript
interface RecentFeedbackPreview {
  ai_feedback: AIFeedbackItem[];
  professor_feedback: ProfessorFeedbackItem[];
}

interface AIFeedbackItem {
  _id: string;                    // Feedback ID
  module_title: string;           // Module name
  overall_score: number | null;   // Overall score (1-10)
  strengths: string[];            // Top 2 identified strengths
  areas_for_improvement: string[]; // Top 2 areas needing improvement
  suggestions: string[];          // Top 1 suggestion
  created_at: string;             // ISO date
}

interface ProfessorFeedbackItem {
  _id: string;           // Review ID
  module_title: string;  // Module name
  rating: number | null; // Rating (1-5 stars)
  feedback: string;      // Feedback text (truncated to 150 chars if longer)
  reviewer_role: string; // PROFESSOR, SCHOOL_ADMIN, etc.
  created_at: string;    // ISO date
}
```

## Complete API Response Example

```json
{
  "message": "Dashboard data retrieved successfully",
  "data": {
    "overview": {
      "total_modules": 5,
      "in_progress_modules": 2,
      "completed_modules": 2,
      "total_quiz_attempts": 15,
      "passed_quizzes": 12,
      "average_progress": 75
    },
    "recent_activity": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "module_id": {
          "_id": "507f1f77bcf86cd799439012",
          "title": "Child Development Psychology",
          "subject": "Psychology"
        },
        "progress_percentage": 85,
        "status": "IN_PROGRESS",
        "last_accessed_at": "2024-01-15T10:00:00.000Z"
      }
    ],
    "ai_conversation_errors_summary": [
      {
        "skill_gap": "communication skills",
        "count": 5,
        "modules": ["Psychology Module 1", "Psychology Module 2"],
        "latest_occurrence": "2024-01-15T10:00:00.000Z"
      },
      {
        "skill_gap": "clinical reasoning",
        "count": 3,
        "modules": ["Clinical Skills Module"],
        "latest_occurrence": "2024-01-14T15:30:00.000Z"
      },
      {
        "skill_gap": "empathy",
        "count": 2,
        "modules": ["Patient Care Module"],
        "latest_occurrence": "2024-01-13T09:15:00.000Z"
      }
    ],
    "recent_feedback_preview": {
      "ai_feedback": [
        {
          "_id": "507f1f77bcf86cd799439020",
          "module_title": "Psychology Module 1",
          "overall_score": 8,
          "strengths": ["empathy", "active listening"],
          "areas_for_improvement": ["documentation", "time management"],
          "suggestions": ["Practice more detailed note-taking"],
          "created_at": "2024-01-15T10:00:00.000Z"
        },
        {
          "_id": "507f1f77bcf86cd799439021",
          "module_title": "Clinical Skills Module",
          "overall_score": 7,
          "strengths": ["problem-solving", "patient rapport"],
          "areas_for_improvement": ["clinical procedures"],
          "suggestions": ["Review clinical protocols"],
          "created_at": "2024-01-14T16:00:00.000Z"
        }
      ],
      "professor_feedback": [
        {
          "_id": "507f1f77bcf86cd799439022",
          "module_title": "Clinical Skills Module",
          "rating": 4,
          "feedback": "Great communication skills demonstrated. Shows good understanding of patient care principles. Could improve on documentation...",
          "reviewer_role": "PROFESSOR",
          "created_at": "2024-01-14T16:00:00.000Z"
        },
        {
          "_id": "507f1f77bcf86cd799439023",
          "module_title": "Psychology Module 1",
          "rating": 5,
          "feedback": "Excellent empathy and understanding. Student shows strong potential in psychological assessment techniques.",
          "reviewer_role": "SCHOOL_ADMIN",
          "created_at": "2024-01-13T14:30:00.000Z"
        }
      ]
    }
  }
}
```

## Frontend Implementation Guide

### 1. Update TypeScript Interfaces

```typescript
// Existing interface (keep unchanged)
interface DashboardResponse {
  message: string;
  data: {
    overview: {
      total_modules: number;
      in_progress_modules: number;
      completed_modules: number;
      total_quiz_attempts: number;
      passed_quizzes: number;
      average_progress: number;
    };
    recent_activity: Array<{
      _id: string;
      module_id: {
        _id: string;
        title: string;
        subject: string;
      };
      progress_percentage: number;
      status: string;
      last_accessed_at: string;
    }>;
    // NEW: Add these fields
    ai_conversation_errors_summary?: AIConversationErrorsSummary[];
    recent_feedback_preview?: RecentFeedbackPreview;
  };
}

// NEW: Add these interfaces
interface AIConversationErrorsSummary {
  skill_gap: string;
  count: number;
  modules: string[];
  latest_occurrence: string;
}

interface RecentFeedbackPreview {
  ai_feedback: AIFeedbackItem[];
  professor_feedback: ProfessorFeedbackItem[];
}

interface AIFeedbackItem {
  _id: string;
  module_title: string;
  overall_score: number | null;
  strengths: string[];
  areas_for_improvement: string[];
  suggestions: string[];
  created_at: string;
}

interface ProfessorFeedbackItem {
  _id: string;
  module_title: string;
  rating: number | null;
  feedback: string;
  reviewer_role: string;
  created_at: string;
}
```

### 2. Frontend Component Updates

#### A. AI Conversation Errors Summary Component

```typescript
// Component to display AI conversation errors
const AIErrorsSummary: React.FC<{ errors: AIConversationErrorsSummary[] }> = ({ errors }) => {
  if (!errors || errors.length === 0) {
    return <div className="text-gray-500">No conversation errors to display</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Areas for Improvement</h3>
      <div className="space-y-3">
        {errors.map((error, index) => (
          <div key={index} className="border-l-4 border-orange-400 pl-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-gray-900 capitalize">
                  {error.skill_gap}
                </h4>
                <p className="text-sm text-gray-600">
                  Occurred {error.count} time{error.count !== 1 ? 's' : ''}
                </p>
                <div className="mt-1">
                  <span className="text-xs text-gray-500">Modules: </span>
                  <span className="text-xs text-gray-700">
                    {error.modules.join(', ')}
                  </span>
                </div>
              </div>
              <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
                {error.count}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Last seen: {new Date(error.latest_occurrence).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### B. Recent Feedback Preview Component

```typescript
// Component to display recent feedback preview
const RecentFeedbackPreview: React.FC<{ feedback: RecentFeedbackPreview }> = ({ feedback }) => {
  if (!feedback) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Feedback</h3>
      
      {/* AI Feedback Section */}
      {feedback.ai_feedback && feedback.ai_feedback.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-blue-700 mb-3">AI Feedback</h4>
          <div className="space-y-3">
            {feedback.ai_feedback.map((item) => (
              <div key={item._id} className="border border-blue-200 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-sm">{item.module_title}</span>
                  {item.overall_score && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      Score: {item.overall_score}/10
                    </span>
                  )}
                </div>
                
                {item.strengths.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-green-700">Strengths: </span>
                    <span className="text-xs text-gray-700">
                      {item.strengths.join(', ')}
                    </span>
                  </div>
                )}
                
                {item.areas_for_improvement.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-orange-700">Improve: </span>
                    <span className="text-xs text-gray-700">
                      {item.areas_for_improvement.join(', ')}
                    </span>
                  </div>
                )}
                
                {item.suggestions.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-purple-700">Suggestion: </span>
                    <span className="text-xs text-gray-700">
                      {item.suggestions[0]}
                    </span>
                  </div>
                )}
                
                <p className="text-xs text-gray-500">
                  {new Date(item.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Professor Feedback Section */}
      {feedback.professor_feedback && feedback.professor_feedback.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-purple-700 mb-3">Professor Feedback</h4>
          <div className="space-y-3">
            {feedback.professor_feedback.map((item) => (
              <div key={item._id} className="border border-purple-200 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-sm">{item.module_title}</span>
                  {item.rating && (
                    <div className="flex items-center">
                      <span className="text-yellow-400 mr-1">
                        {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                      </span>
                      <span className="text-xs text-gray-600">({item.rating}/5)</span>
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-gray-700 mb-2">{item.feedback}</p>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-purple-600 capitalize">
                    {item.reviewer_role.toLowerCase().replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!feedback.ai_feedback || feedback.ai_feedback.length === 0) && 
       (!feedback.professor_feedback || feedback.professor_feedback.length === 0) && (
        <div className="text-gray-500 text-center py-4">
          No recent feedback available
        </div>
      )}
    </div>
  );
};
```

#### C. Updated Main Dashboard Component

```typescript
// Update your main dashboard component
const StudentDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/progress/dashboard', {
        params: {
          school_id: studentInfo.school_id,
          student_id: studentInfo.student_id
        }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!dashboardData) return <div>Error loading dashboard</div>;

  return (
    <div className="space-y-6">
      {/* Existing dashboard components */}
      <OverviewStats overview={dashboardData.data.overview} />
      <RecentActivity activities={dashboardData.data.recent_activity} />
      
      {/* NEW: Add the enhanced components */}
      {dashboardData.data.ai_conversation_errors_summary && (
        <AIErrorsSummary errors={dashboardData.data.ai_conversation_errors_summary} />
      )}
      
      {dashboardData.data.recent_feedback_preview && (
        <RecentFeedbackPreview feedback={dashboardData.data.recent_feedback_preview} />
      )}
    </div>
  );
};
```

### 3. Error Handling

```typescript
// Handle cases where new fields might not be available
const safelyAccessNewFields = (dashboardData: DashboardResponse) => {
  const aiErrors = dashboardData.data.ai_conversation_errors_summary || [];
  const recentFeedback = dashboardData.data.recent_feedback_preview || {
    ai_feedback: [],
    professor_feedback: []
  };
  
  return { aiErrors, recentFeedback };
};
```

### 4. CSS Classes (Tailwind Examples)

```css
/* Add these utility classes if needed */
.skill-gap-badge {
  @apply bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded;
}

.feedback-card {
  @apply border rounded-lg p-3 hover:shadow-md transition-shadow;
}

.rating-stars {
  @apply text-yellow-400;
}

.feedback-preview-container {
  @apply bg-white rounded-lg shadow p-6;
}
```

## Data Handling Notes

### 1. Backward Compatibility
- All existing dashboard functionality remains unchanged
- New fields are optional and won't break existing implementations
- API response includes new fields only when data is available

### 2. Empty States
- `ai_conversation_errors_summary` returns empty array `[]` when no errors found
- `recent_feedback_preview` returns empty arrays for both `ai_feedback` and `professor_feedback` when no data available
- Handle these gracefully in your UI

### 3. Data Limits
- **AI Conversation Errors**: Top 10 most frequent skill gaps
- **AI Feedback**: Most recent 3 items
- **Professor Feedback**: Most recent 3 items
- **Error Summary**: Based on last 50 AI conversations

### 4. Date Formatting
- All dates are in ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- Use `new Date(dateString)` for parsing in JavaScript

## Testing Recommendations

### 1. Test with Different Data States
- Student with no AI feedback
- Student with no professor feedback
- Student with extensive feedback history
- Student with mixed data quality

### 2. Verify Backward Compatibility
- Ensure existing dashboard components still work
- Test with older API responses (before enhancement)

### 3. Performance Considerations
- New data doesn't significantly impact load times
- Graceful handling of slow API responses

## API Changes Summary

| Change Type | Field | Description |
|-------------|-------|-------------|
| **Added** | `data.ai_conversation_errors_summary` | Array of categorized skill gaps |
| **Added** | `data.recent_feedback_preview` | Object with recent AI and professor feedback |
| **Unchanged** | `data.overview` | Original overview statistics |
| **Unchanged** | `data.recent_activity` | Original recent activity data |

## Questions or Issues?

If you encounter any issues during implementation:

1. **Data Structure**: Verify the API response matches the documented structure
2. **Missing Fields**: New fields are optional - handle gracefully if missing
3. **Performance**: Monitor API response times after implementation
4. **UI/UX**: Consider the additional data volume in your dashboard layout

The enhanced dashboard provides students with valuable insights into their learning patterns while maintaining full backward compatibility with existing implementations.
