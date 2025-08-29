# AI Chat Session Activities - Unified API Documentation

## Overview

This document describes the **UPDATED** API endpoint for retrieving AI chat session activities. 

⚠️ **BREAKING CHANGE**: The endpoint response structure has been modified to return a unified, chronologically sorted array of session activities instead of separate objects.

## Endpoint

```
GET /api/ai-chat/sessions/{sessionId}/messages
```

**Headers Required:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

## What Changed

### Before (Old Response Structure)
```json
{
  "messages": [...],
  "supervisor_feedback": [...],
  "professor_resources": [...],
  "sessionDetails": {...}
}
```

### After (New Response Structure)
```json
{
  "activities": [
    {
      "type": "message",
      "created_at": "2024-01-15T10:05:00.000Z",
      "data": { /* message object */ }
    },
    {
      "type": "feedback",
      "created_at": "2024-01-15T10:30:00.000Z",
      "data": { /* feedback object */ }
    },
    {
      "type": "resource",
      "created_at": "2024-01-15T10:35:00.000Z",
      "data": { /* resource object */ }
    }
  ],
  "sessionDetails": { /* session details object - separate from activities */ },
  "total_count": 3,
  "messages_count": 1,
  "feedback_count": 1,
  "resources_count": 1
}
```

## Activity Types

| Type | Description | Data Structure |
|------|-------------|----------------|
| `message` | Chat messages between student and AI | `AIMessageResponseDto` |
| `feedback` | Supervisor analysis and feedback | `AIFeedbackResponseDto` |
| `resource` | Professor-recommended learning resources | `AIResourceResponseDto` |

**Note:** Session details are returned separately in the `sessionDetails` key, not as part of the activities array.

## Activity Data Structures

### Message Activity (`type: "message"`)
```typescript
{
  type: "message",
  created_at: "2024-01-15T10:05:00.000Z",
  data: {
    _id: "507f1f77bcf86cd799439011",
    session_id: "507f1f77bcf86cd799439011",
    module_id: "507f1f77bcf86cd799439011",
    student_id: "507f1f77bcf86cd799439011",
    sender: "student" | "ai_patient" | "ai_supervisor" | "ai_professor",
    message_type: "text" | "image" | "file" | "system",
    content: "Hello, I am a medical student here to practice",
    attachments: ["https://example.com/file1.pdf"],
    message_metadata: { confidence_score: 0.95 },
    is_error: false,
    error_message: null,
    created_at: "2024-01-15T10:05:00.000Z",
    updated_at: "2024-01-15T10:05:00.000Z"
  }
}
```

### Feedback Activity (`type: "feedback"`)
```typescript
{
  type: "feedback",
  created_at: "2024-01-15T10:30:00.000Z",
  data: {
    _id: "507f1f77bcf86cd799439011",
    session_id: "507f1f77bcf86cd799439011",
    module_id: "507f1f77bcf86cd799439011",
    student_id: "507f1f77bcf86cd799439011",
    feedback_type: "supervisor_analysis",
    rating: {
      overall_score: 7,
      communication_score: 8,
      clinical_score: 6,
      professionalism_score: 9
    },
    keywords_for_learning: ["diagnosis", "symptoms", "treatment"],
    suggestions: ["Improve clinical reasoning", "Ask more specific questions"],
    missed_opportunities: ["Could have asked about family history"],
    strengths: ["Good communication", "Professional demeanor"],
    areas_for_improvement: ["Clinical reasoning", "Differential diagnosis"],
    skill_gaps: ["Advanced diagnostic techniques"],
    created_at: "2024-01-15T10:30:00.000Z",
    updated_at: "2024-01-15T10:30:00.000Z"
  }
}
```

### Resource Activity (`type: "resource"`)
```typescript
{
  type: "resource",
  created_at: "2024-01-15T10:35:00.000Z",
  data: {
    _id: "507f1f77bcf86cd799439011",
    session_id: "507f1f77bcf86cd799439011",
    module_id: "507f1f77bcf86cd799439011",
    student_id: "507f1f77bcf86cd799439011",
    resources: [
      {
        title: "Cardiology Diagnosis Guidelines",
        description: "Comprehensive guide to cardiology diagnosis",
        type: "article",
        url: "https://example.com/cardiology",
        keywords: ["cardiology", "diagnosis"],
        related_mistakes: ["Incorrect diagnosis"]
      }
    ],
    recommendations: "Based on your session, focus on improving clinical reasoning skills...",
    total_found: 5,
    knowledge_available: true,
    supervisor_feedback_id: "507f1f77bcf86cd799439011",
    created_at: "2024-01-15T10:35:00.000Z",
    updated_at: "2024-01-15T10:35:00.000Z"
  }
}
```

### Session Details (separate `sessionDetails` key)
```typescript
sessionDetails: {
  _id: "507f1f77bcf86cd799439011",
  module_id: "507f1f77bcf86cd799439011",
  student_id: "507f1f77bcf86cd799439011",
  status: "active" | "completed" | "cancelled",
  session_title: "Cardiology Case Study",
  session_description: "Practice diagnosing cardiac conditions",
  scenario: "A 45-year-old patient presents with chest pain...",
  started_at: "2024-01-15T10:00:00.000Z",
  ended_at: null,
  total_messages: 10,
  student_messages: 5,
  ai_messages: 5,
  created_at: "2024-01-15T10:00:00.000Z",
  updated_at: "2024-01-15T10:00:00.000Z"
}
```

## Response Metadata

| Field | Type | Description |
|-------|------|-------------|
| `activities` | Array | Combined and sorted list of session activities (messages, feedback, resources only) |
| `sessionDetails` | Object | Session details object (separate from activities) |
| `total_count` | Number | Total count of activities (excludes session details) |
| `messages_count` | Number | Count of message activities |
| `feedback_count` | Number | Count of feedback activities |
| `resources_count` | Number | Count of resource activities |

## Sorting

All activities (messages, feedback, resources) are sorted by `created_at` in **ascending order** (oldest first), providing a chronological timeline of the session. Session details are provided separately and not included in the sorted activities.

## Frontend Implementation Guide

### TypeScript Interfaces

```typescript
// Activity Types Enum
export enum SessionActivityType {
  MESSAGE = 'message',
  FEEDBACK = 'feedback',
  RESOURCE = 'resource',
}

// Message Sender Types
export enum MessageSender {
  STUDENT = 'student',
  AI_PATIENT = 'ai_patient',
  AI_SUPERVISOR = 'ai_supervisor',
  AI_PROFESSOR = 'ai_professor',
}

// Message Types
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
}

// Session Status
export enum SessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Rating Object for Feedback
export interface RatingObject {
  overall_score: number;
  communication_score: number;
  clinical_score: number;
  professionalism_score: number;
}

// Message Data Structure
export interface MessageData {
  _id: string;
  session_id: string;
  module_id: string;
  student_id: string;
  sender: MessageSender;
  message_type: MessageType;
  content: string;
  attachments: string[];
  message_metadata?: Record<string, any>;
  is_error: boolean;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// Feedback Data Structure
export interface FeedbackData {
  _id: string;
  session_id: string;
  module_id: string;
  student_id: string;
  feedback_type: string;
  rating: RatingObject;
  keywords_for_learning: string[];
  suggestions: string[];
  missed_opportunities: string[];
  strengths: string[];
  areas_for_improvement: string[];
  skill_gaps: string[];
  created_at: string;
  updated_at: string;
}

// Resource Data Structure
export interface ResourceData {
  _id: string;
  session_id: string;
  module_id: string;
  student_id: string;
  resources: Array<{
    title: string;
    description: string;
    type: string;
    url: string;
    keywords: string[];
    related_mistakes: string[];
  }>;
  recommendations: string;
  total_found: number;
  knowledge_available: boolean;
  supervisor_feedback_id: string;
  created_at: string;
  updated_at: string;
}

// Session Details Structure
export interface SessionDetails {
  _id: string;
  module_id: string;
  student_id: string;
  status: SessionStatus;
  session_title: string;
  session_description: string;
  scenario: string;
  started_at: string;
  ended_at?: string;
  total_messages: number;
  student_messages: number;
  ai_messages: number;
  created_at: string;
  updated_at: string;
}

// Generic Activity Interface
export interface SessionActivity {
  type: SessionActivityType;
  created_at: string;
  data: MessageData | FeedbackData | ResourceData;
}

// Complete API Response Interface
export interface SessionActivitiesResponse {
  activities: SessionActivity[];
  sessionDetails: SessionDetails;
  total_count: number;
  messages_count: number;
  feedback_count: number;
  resources_count: number;
}
```

### React Hook for API Call

```typescript
// hooks/useSessionActivities.ts
import { useState, useEffect } from 'react';
import { SessionActivitiesResponse } from '../types/session-activities';

interface UseSessionActivitiesResult {
  data: SessionActivitiesResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useSessionActivities = (
  sessionId: string,
  token: string
): UseSessionActivitiesResult => {
  const [data, setData] = useState<SessionActivitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/ai-chat/sessions/${sessionId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result: SessionActivitiesResponse = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
      console.error('Failed to fetch session activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId && token) {
      fetchActivities();
    }
  }, [sessionId, token]);

  return {
    data,
    loading,
    error,
    refetch: fetchActivities
  };
};
```

### Complete React Component Example

```typescript
// components/SessionTimeline.tsx
import React from 'react';
import { 
  SessionActivity, 
  SessionActivityType, 
  MessageData, 
  FeedbackData, 
  ResourceData,
  MessageSender 
} from '../types/session-activities';
import { useSessionActivities } from '../hooks/useSessionActivities';

interface SessionTimelineProps {
  sessionId: string;
  token: string;
}

const SessionTimeline: React.FC<SessionTimelineProps> = ({ sessionId, token }) => {
  const { data: activities, loading, error, refetch } = useSessionActivities(sessionId, token);

  const renderMessage = (messageData: MessageData) => (
    <div className={`message ${messageData.sender}`}>
      <div className="message-header">
        <span className="sender-label">
          {messageData.sender === MessageSender.STUDENT ? 'You' : 'AI Patient'}
        </span>
        <span className="message-time">
          {new Date(messageData.created_at).toLocaleTimeString()}
        </span>
      </div>
      <div className="message-content">
        {messageData.content}
      </div>
      {messageData.attachments.length > 0 && (
        <div className="message-attachments">
          {messageData.attachments.map((attachment, idx) => (
            <a key={idx} href={attachment} target="_blank" rel="noopener noreferrer">
              Attachment {idx + 1}
            </a>
          ))}
        </div>
      )}
      {messageData.is_error && (
        <div className="message-error">
          Error: {messageData.error_message}
        </div>
      )}
    </div>
  );

  const renderFeedback = (feedbackData: FeedbackData) => (
    <div className="feedback-card">
      <div className="feedback-header">
        <h4>AI Supervisor Analysis</h4>
        <div className="feedback-scores">
          <span>Overall: {feedbackData.rating.overall_score}/10</span>
          <span>Communication: {feedbackData.rating.communication_score}/10</span>
          <span>Clinical: {feedbackData.rating.clinical_score}/10</span>
          <span>Professional: {feedbackData.rating.professionalism_score}/10</span>
        </div>
      </div>
      
      {feedbackData.strengths.length > 0 && (
        <div className="feedback-section">
          <h5>Strengths</h5>
          <ul>
            {feedbackData.strengths.map((strength, idx) => (
              <li key={idx}>{strength}</li>
            ))}
          </ul>
        </div>
      )}
      
      {feedbackData.areas_for_improvement.length > 0 && (
        <div className="feedback-section">
          <h5>Areas for Improvement</h5>
          <ul>
            {feedbackData.areas_for_improvement.map((area, idx) => (
              <li key={idx}>{area}</li>
            ))}
          </ul>
        </div>
      )}
      
      {feedbackData.suggestions.length > 0 && (
        <div className="feedback-section">
          <h5>Suggestions</h5>
          <ul>
            {feedbackData.suggestions.map((suggestion, idx) => (
              <li key={idx}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
      
      {feedbackData.keywords_for_learning.length > 0 && (
        <div className="feedback-section">
          <h5>Key Learning Topics</h5>
          <div className="keywords">
            {feedbackData.keywords_for_learning.map((keyword, idx) => (
              <span key={idx} className="keyword-tag">{keyword}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderResource = (resourceData: ResourceData) => (
    <div className="resource-card">
      <div className="resource-header">
        <h4>Learning Resources</h4>
        <span className="resource-count">
          {resourceData.total_found} resources found
        </span>
      </div>
      
      {resourceData.recommendations && (
        <div className="resource-recommendations">
          <p>{resourceData.recommendations}</p>
        </div>
      )}
      
      <div className="resource-list">
        {resourceData.resources.map((resource, idx) => (
          <div key={idx} className="resource-item">
            <h6>
              <a href={resource.url} target="_blank" rel="noopener noreferrer">
                {resource.title}
              </a>
            </h6>
            <p>{resource.description}</p>
            {resource.keywords.length > 0 && (
              <div className="resource-keywords">
                {resource.keywords.map((keyword, keyIdx) => (
                  <span key={keyIdx} className="keyword-tag">{keyword}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderActivity = (activity: SessionActivity) => {
    switch (activity.type) {
      case SessionActivityType.MESSAGE:
        return renderMessage(activity.data as MessageData);
      case SessionActivityType.FEEDBACK:
        return renderFeedback(activity.data as FeedbackData);
      case SessionActivityType.RESOURCE:
        return renderResource(activity.data as ResourceData);
      default:
        return <div>Unknown activity type</div>;
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading session activities...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <p>Error loading activities: {error}</p>
        <button onClick={refetch}>Retry</button>
      </div>
    );
  }

  if (!activities) {
    return <div>No activities found</div>;
  }

  return (
    <div className="session-timeline">
      <div className="timeline-header">
        <h3>Session: {activities.sessionDetails.session_title}</h3>
        <div className="session-status">
          Status: <span className={`status ${activities.sessionDetails.status}`}>
            {activities.sessionDetails.status}
          </span>
        </div>
        <div className="activity-counts">
          <span>Total Activities: {activities.total_count}</span>
          <span>Messages: {activities.messages_count}</span>
          <span>Feedback: {activities.feedback_count}</span>
          <span>Resources: {activities.resources_count}</span>
        </div>
      </div>
      
      {/* Session Details Section */}
      <div className="session-details">
        <div className="session-scenario">
          <h4>Scenario</h4>
          <p>{activities.sessionDetails.scenario}</p>
        </div>
        <div className="session-meta">
          <p><strong>Started:</strong> {new Date(activities.sessionDetails.started_at).toLocaleString()}</p>
          {activities.sessionDetails.ended_at && (
            <p><strong>Ended:</strong> {new Date(activities.sessionDetails.ended_at).toLocaleString()}</p>
          )}
          <p><strong>Description:</strong> {activities.sessionDetails.session_description}</p>
        </div>
      </div>
      
      {/* Activities Timeline */}
      <div className="timeline-items">
        {activities.activities.map((activity, index) => (
          <div key={`${activity.type}-${index}`} className={`timeline-item ${activity.type}`}>
            <div className="timeline-timestamp">
              {new Date(activity.created_at).toLocaleString()}
            </div>
            <div className="timeline-content">
              {renderActivity(activity)}
            </div>
          </div>
        ))}
      </div>
      
      {activities.activities.length === 0 && (
        <div className="no-activities">
          <p>No activities yet. Start by sending a message!</p>
        </div>
      )}
    </div>
  );
};

export default SessionTimeline;
```

### Filtering Activities

```typescript
// Filter by activity type
const messages = activities.activities.filter(
  activity => activity.type === SessionActivityType.MESSAGE
);

const feedback = activities.activities.filter(
  activity => activity.type === SessionActivityType.FEEDBACK
);

const resources = activities.activities.filter(
  activity => activity.type === SessionActivityType.RESOURCE
);

// Filter by date range
const todayActivities = activities.activities.filter(activity => {
  const activityDate = new Date(activity.created_at);
  const today = new Date();
  return activityDate.toDateString() === today.toDateString();
});

// Filter by sender (for messages)
const studentMessages = activities.activities.filter(activity => {
  return activity.type === SessionActivityType.MESSAGE && 
         activity.data.sender === 'student';
});

// Access session details separately
const sessionInfo = activities.sessionDetails;
```

### CSS Styles Example

```css
/* styles/session-timeline.css */
.session-timeline {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.timeline-header {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.timeline-header h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.session-status {
  margin: 10px 0;
}

.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9em;
  font-weight: bold;
  text-transform: uppercase;
}

.status.active { background-color: #e3f2fd; color: #1976d2; }
.status.completed { background-color: #e8f5e8; color: #388e3c; }
.status.cancelled { background-color: #ffebee; color: #d32f2f; }

.activity-counts {
  display: flex;
  gap: 20px;
  margin-top: 15px;
}

.activity-counts span {
  padding: 8px 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 0.9em;
}

.session-details {
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.session-scenario h4,
.session-meta strong {
  color: #555;
}

.timeline-items {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.timeline-item {
  display: flex;
  gap: 15px;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #e0e0e0;
}

.timeline-item.message {
  border-left-color: #2196f3;
  background-color: #f3f8ff;
}

.timeline-item.feedback {
  border-left-color: #ff9800;
  background-color: #fff8f0;
}

.timeline-item.resource {
  border-left-color: #4caf50;
  background-color: #f1f8e9;
}

.timeline-timestamp {
  min-width: 120px;
  font-size: 0.85em;
  color: #666;
  font-weight: 500;
}

.timeline-content {
  flex: 1;
}

/* Message Styles */
.message {
  border-radius: 8px;
  padding: 12px;
}

.message.student {
  background-color: #e3f2fd;
  margin-left: 20px;
}

.message.ai_patient {
  background-color: #fff;
  border: 1px solid #e0e0e0;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.9em;
}

.sender-label {
  font-weight: bold;
  color: #555;
}

.message-time {
  color: #888;
  font-size: 0.8em;
}

.message-content {
  line-height: 1.5;
  color: #333;
}

.message-attachments {
  margin-top: 10px;
  display: flex;
  gap: 10px;
}

.message-attachments a {
  color: #1976d2;
  text-decoration: none;
  font-size: 0.9em;
}

.message-error {
  margin-top: 10px;
  padding: 8px;
  background-color: #ffebee;
  color: #d32f2f;
  border-radius: 4px;
  font-size: 0.9em;
}

/* Feedback Styles */
.feedback-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e0e0e0;
}

.feedback-header {
  margin-bottom: 20px;
}

.feedback-header h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.feedback-scores {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.feedback-scores span {
  background-color: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9em;
}

.feedback-section {
  margin-bottom: 15px;
}

.feedback-section h5 {
  margin: 0 0 8px 0;
  color: #555;
  font-size: 1em;
}

.feedback-section ul {
  margin: 0;
  padding-left: 20px;
}

.feedback-section li {
  margin-bottom: 5px;
  line-height: 1.4;
}

.keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.keyword-tag {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8em;
}

/* Resource Styles */
.resource-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e0e0e0;
}

.resource-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.resource-header h4 {
  margin: 0;
  color: #333;
}

.resource-count {
  background-color: #e8f5e8;
  color: #388e3c;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9em;
}

.resource-recommendations {
  background-color: #f9f9f9;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 15px;
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.resource-item {
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background-color: #fafafa;
}

.resource-item h6 {
  margin: 0 0 8px 0;
}

.resource-item h6 a {
  color: #1976d2;
  text-decoration: none;
}

.resource-item h6 a:hover {
  text-decoration: underline;
}

.resource-item p {
  margin: 0 0 10px 0;
  color: #666;
  line-height: 1.4;
}

.resource-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* Utility Classes */
.loading-spinner {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error-container {
  text-align: center;
  padding: 40px;
  color: #d32f2f;
}

.error-container button {
  margin-top: 10px;
  padding: 8px 16px;
  background-color: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.no-activities {
  text-align: center;
  padding: 40px;
  color: #666;
  font-style: italic;
}

/* Responsive Design */
@media (max-width: 768px) {
  .session-timeline {
    padding: 15px;
  }
  
  .timeline-item {
    flex-direction: column;
    gap: 10px;
  }
  
  .timeline-timestamp {
    min-width: auto;
    font-size: 0.8em;
  }
  
  .activity-counts {
    flex-direction: column;
    gap: 10px;
  }
  
  .feedback-scores {
    flex-direction: column;
    gap: 8px;
  }
  
  .resource-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
```

## Migration Guide

### Step-by-Step Frontend Migration

1. **Update API Call Logic**
   ```typescript
   // OLD: Multiple separate API calls
   const messages = await fetchMessages(sessionId);
   const feedback = await fetchFeedback(sessionId);
   const resources = await fetchResources(sessionId);
   const sessionDetails = await fetchSessionDetails(sessionId);

   // NEW: Single unified API call
   const { activities, sessionDetails, ...counts } = await fetchSessionActivities(sessionId);
   ```

2. **Update Component Props and State**
   ```typescript
   // OLD
   interface ComponentProps {
     messages: Message[];
     feedback: Feedback[];
     resources: Resource[];
     sessionDetails: SessionDetails;
   }

   // NEW
   interface ComponentProps {
     activities: SessionActivity[];
     sessionDetails: SessionDetails;
     counts: {
       total_count: number;
       messages_count: number;
       feedback_count: number;
       resources_count: number;
     };
   }
   ```

3. **Update Rendering Logic**
   ```typescript
   // OLD: Separate rendering for each type
   {messages.map(msg => <Message key={msg.id} data={msg} />)}
   {feedback.map(fb => <Feedback key={fb.id} data={fb} />)}
   {resources.map(res => <Resource key={res.id} data={res} />)}

   // NEW: Unified rendering with type checking
   {activities.map((activity, index) => {
     const key = `${activity.type}-${index}`;
     switch (activity.type) {
       case 'message': return <Message key={key} data={activity.data} />;
       case 'feedback': return <Feedback key={key} data={activity.data} />;
       case 'resource': return <Resource key={key} data={activity.data} />;
     }
   })}
   ```

4. **Update Data Filtering**
   ```typescript
   // NEW: Filter from unified activities array
   const messages = activities.filter(a => a.type === 'message');
   const studentMessages = activities
     .filter(a => a.type === 'message')
     .filter(a => (a.data as MessageData).sender === 'student');
   ```

### Breaking Changes Checklist

- [ ] Update API endpoint calls to use new response structure
- [ ] Replace separate data arrays with unified `activities` array
- [ ] Update TypeScript interfaces to match new structure
- [ ] Modify component rendering logic to handle activity types
- [ ] Update filtering and sorting logic
- [ ] Test chronological ordering of activities
- [ ] Verify session details are accessed separately
- [ ] Update error handling for new response format

### Migration Notes

1. **Session Details Separation**: Session details are now returned in the `sessionDetails` key, separate from the activities array
2. **Activities Scope**: The `activities` array now only contains messages, feedback, and resources (no session details)
3. **Chronological Order**: Activities are sorted by creation date, providing a true timeline of session interactions
4. **Type Safety**: Each activity has a `type` field to help with TypeScript type guards
5. **Performance**: Data is fetched in parallel for better performance
6. **Cleaner Structure**: Session metadata is separated from session activities for better organization

## Authentication

All requests require a valid JWT Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Error Responses

| Status Code | Description |
|-------------|-------------|
| 401 | Unauthorized - Invalid or missing JWT token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Session not found |
| 500 | Internal Server Error |

## Rate Limiting

This endpoint is subject to standard API rate limiting. See the main API documentation for details.

---

## Quick Reference for Frontend Developers

### 🚀 Getting Started

1. **Install/Update Types**: Add the TypeScript interfaces from this document
2. **Update API Client**: Replace multiple API calls with single unified call
3. **Modify Components**: Update rendering logic to handle unified activities array
4. **Test Integration**: Verify chronological ordering and type safety

### 📋 Implementation Checklist

- [ ] Copy TypeScript interfaces to your types folder
- [ ] Create `useSessionActivities` hook
- [ ] Update existing components to use new data structure
- [ ] Add CSS styles for timeline display
- [ ] Test with different activity combinations
- [ ] Handle loading and error states
- [ ] Verify responsive design

### 🔧 Common Use Cases

**Display Messages Only:**
```typescript
const messages = activities.filter(a => a.type === 'message');
```

**Show Latest Feedback:**
```typescript
const latestFeedback = activities
  .filter(a => a.type === 'feedback')
  .pop()?.data as FeedbackData;
```

**Count by Type:**
```typescript
const counts = {
  messages: response.messages_count,
  feedback: response.feedback_count,
  resources: response.resources_count,
  total: response.total_count
};
```

**Timeline View:**
```typescript
// Activities are already sorted chronologically (oldest first)
activities.map((activity, index) => (
  <TimelineItem key={index} activity={activity} />
))
```

### 🎯 Key Benefits

- ✅ **Single API Call**: Reduced network requests
- ✅ **Chronological Order**: True timeline of session events  
- ✅ **Type Safety**: Strong TypeScript support
- ✅ **Better Performance**: Parallel data fetching
- ✅ **Cleaner Code**: Unified data structure
- ✅ **Easier Filtering**: All activities in one array

### ⚠️ Important Notes

- Session details are **separate** from activities array
- Activities are sorted in **ascending order** by creation date
- Use TypeScript type guards for proper type checking
- Handle empty states gracefully
- Consider implementing real-time updates for active sessions

---

**Need Help?** Contact the backend team if you encounter any issues during migration.
