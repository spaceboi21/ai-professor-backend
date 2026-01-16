# Frontend Bug Fix - Session History Retrieval

## Error You're Seeing

```
api.psysphereai.com/api/internship/sessions/undefined:1
Failed to load resource: the server responded with a status of 400 (Bad Request)
```

## Root Cause

The frontend is trying to call:
```
GET /api/internship/sessions/undefined
```

This happens when `sessionId` is `undefined`. You need to use the correct endpoint and ensure the session ID is passed properly.

---

## Solution: Use the Correct Endpoint

### For Session History (List View)

**Endpoint:**
```
GET /api/internship/cases/{caseId}/sessions/history
```

**Frontend Code:**
```typescript
// ✅ CORRECT - Get all sessions for a case
async function loadSessionHistory(caseId: string) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/internship/cases/${caseId}/sessions/history`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to load session history: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      caseTitle: data.case_title,
      statistics: data.statistics,
      sessions: data.sessions
    };
    
  } catch (error) {
    console.error('Error loading session history:', error);
    throw error;
  }
}

// Example usage:
const history = await loadSessionHistory('your-case-id');
console.log('Total sessions:', history.statistics.total_sessions);
console.log('Sessions:', history.sessions);
```

**Response Structure:**
```typescript
{
  "case_id": "case123",
  "case_title": "Anxiety Disorder Case",
  "student_id": "student456",
  "statistics": {
    "total_sessions": 3,
    "completed_sessions": 2,
    "active_sessions": 0,
    "total_time_seconds": 5400,
    "max_sessions_allowed": null,
    "sessions_remaining": null
  },
  "sessions": [
    {
      "session_id": "session_abc123",  // ← Use this for details
      "session_number": 3,
      "session_type": "patient_interview",
      "status": "COMPLETED",
      "started_at": "2025-01-03T10:00:00.000Z",
      "ended_at": "2025-01-03T11:30:00.000Z",
      "total_active_time_seconds": 5400,
      "message_count": 45,
      "tips_received": 8,
      "pause_count": 2
    },
    // ... more sessions
  ]
}
```

---

### For Single Session Details

**Endpoint:**
```
GET /api/internship/sessions/{sessionId}
```

**Frontend Code:**
```typescript
// ✅ CORRECT - Get details of ONE specific session
async function loadSessionDetails(sessionId: string) {
  // IMPORTANT: Check sessionId is not undefined
  if (!sessionId || sessionId === 'undefined') {
    throw new Error('Valid session ID is required');
  }
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/internship/sessions/${sessionId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to load session: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data; // Session details with full messages
    
  } catch (error) {
    console.error('Error loading session details:', error);
    throw error;
  }
}
```

---

## Complete Example: Session History Component

```typescript
import React, { useEffect, useState } from 'react';

interface SessionHistoryProps {
  caseId: string;
}

export function SessionHistory({ caseId }: SessionHistoryProps) {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  // Load session history
  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/internship/cases/${caseId}/sessions/history`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            }
          }
        );
        
        if (!response.ok) {
          throw new Error('Failed to load session history');
        }
        
        const data = await response.json();
        setHistory(data);
        
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    if (caseId) {
      fetchHistory();
    }
  }, [caseId]);

  // Load specific session details
  async function viewSessionDetails(sessionId: string) {
    try {
      const response = await fetch(
        `/api/internship/sessions/${sessionId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to load session details');
      }
      
      const data = await response.json();
      setSelectedSession(data.data);
      
    } catch (err) {
      console.error('Error loading session:', err);
      alert('Failed to load session details');
    }
  }

  if (loading) return <div>Loading session history...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!history) return <div>No history available</div>;

  return (
    <div className="session-history">
      <h2>{history.case_title}</h2>
      
      {/* Statistics */}
      <div className="statistics">
        <div className="stat">
          <span>Total Sessions:</span>
          <span>{history.statistics.total_sessions}</span>
        </div>
        <div className="stat">
          <span>Completed:</span>
          <span>{history.statistics.completed_sessions}</span>
        </div>
        <div className="stat">
          <span>Total Time:</span>
          <span>{Math.floor(history.statistics.total_time_seconds / 60)} min</span>
        </div>
        {history.statistics.max_sessions_allowed && (
          <div className="stat">
            <span>Remaining Attempts:</span>
            <span>{history.statistics.sessions_remaining}</span>
          </div>
        )}
      </div>

      {/* Session List */}
      <div className="sessions-list">
        <h3>Your Sessions</h3>
        {history.sessions.map(session => (
          <div key={session.session_id} className="session-card">
            <div className="session-header">
              <span className="session-number">
                Session #{session.session_number}
              </span>
              <span className={`status ${session.status.toLowerCase()}`}>
                {session.status}
              </span>
            </div>
            
            <div className="session-info">
              <div>Started: {new Date(session.started_at).toLocaleString()}</div>
              <div>Duration: {Math.floor(session.total_active_time_seconds / 60)} min</div>
              <div>Messages: {session.message_count}</div>
              <div>Tips: {session.tips_received}</div>
            </div>
            
            <div className="session-actions">
              <button 
                onClick={() => viewSessionDetails(session.session_id)}
                className="view-details-btn"
              >
                View Full Transcript
              </button>
              
              {session.status === 'PAUSED' && (
                <button 
                  onClick={() => resumeSession(session.session_id)}
                  className="resume-btn"
                >
                  Resume Session
                </button>
              )}
              
              {session.status === 'COMPLETED' && (
                <button 
                  onClick={() => viewFeedback(session.session_id)}
                  className="feedback-btn"
                >
                  View Feedback
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Session Details Modal (if selected) */}
      {selectedSession && (
        <div className="session-details-modal">
          <h3>Session Details</h3>
          <button onClick={() => setSelectedSession(null)}>Close</button>
          
          <div className="messages">
            {selectedSession.messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <strong>{msg.role}:</strong> {msg.content}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Common Mistakes to Avoid

### ❌ WRONG - Calling with undefined
```typescript
// This causes the error you're seeing
const sessionId = undefined;
fetch(`/api/internship/sessions/${sessionId}`);
// Results in: /api/internship/sessions/undefined
```

### ✅ CORRECT - Check before calling
```typescript
// Always validate sessionId first
if (!sessionId) {
  console.error('Session ID is required');
  return;
}

fetch(`/api/internship/sessions/${sessionId}`);
```

### ❌ WRONG - Using wrong endpoint for history
```typescript
// Don't use session details endpoint for history
sessions.map(s => fetch(`/api/internship/sessions/${s.id}`));
```

### ✅ CORRECT - Use history endpoint
```typescript
// Get all sessions at once
const response = await fetch(`/api/internship/cases/${caseId}/sessions/history`);
const { sessions } = await response.json();
```

---

## Debugging Steps

1. **Check the session ID before making the request:**
```typescript
console.log('Session ID:', sessionId);
if (!sessionId || sessionId === 'undefined') {
  console.error('Invalid session ID!');
  return;
}
```

2. **Log the full URL:**
```typescript
const url = `/api/internship/sessions/${sessionId}`;
console.log('Requesting URL:', url);
```

3. **Check the session history response:**
```typescript
const history = await fetch(`/api/internship/cases/${caseId}/sessions/history`);
const data = await history.json();
console.log('Available sessions:', data.sessions);
// Each session should have a session_id field
```

4. **Verify authentication:**
```typescript
const token = localStorage.getItem('token');
console.log('Auth token present:', !!token);
```

---

## Quick Test

Test in browser console:

```javascript
// 1. Test session history endpoint
fetch('/api/internship/cases/YOUR_CASE_ID/sessions/history', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(r => r.json())
.then(data => console.log('History:', data));

// 2. Test specific session (use a real session_id from history)
fetch('/api/internship/sessions/REAL_SESSION_ID', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(r => r.json())
.then(data => console.log('Session details:', data));
```

---

## Summary

**The Issue:**
You're calling `/api/internship/sessions/undefined` because `sessionId` is undefined.

**The Fix:**
1. Use `/api/internship/cases/{caseId}/sessions/history` to get the list of sessions
2. Extract `session_id` from the history response
3. Use that `session_id` when calling `/api/internship/sessions/{sessionId}` for details
4. Always validate `sessionId` is not undefined before making the request

**Key Point:**
```typescript
// Get list of sessions
GET /api/internship/cases/{caseId}/sessions/history

// Then use session_id from response to get details
GET /api/internship/sessions/{session.session_id}
```

