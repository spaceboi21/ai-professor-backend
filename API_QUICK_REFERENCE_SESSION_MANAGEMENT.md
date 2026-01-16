# Session Management - API Quick Reference

## 🚀 Quick Start for Frontend Developers

### Check for Active Session Before Starting New One

```typescript
GET /api/internship/cases/{caseId}/sessions/active

// Response when session exists:
{
  "has_active_session": true,
  "session": {
    "session_id": "...",
    "status": "PAUSED", // or "ACTIVE"
    // ... other fields
  }
}

// Response when no session:
{
  "has_active_session": false,
  "session": null
}
```

**Use Case:** Before showing "Start Session" button, check if student already has an active/paused session they should continue.

---

### Pause Session

```typescript
POST /api/internship/sessions/{sessionId}/pause

// Optional body:
{
  "reason": "Taking a break"
}

// Response:
{
  "message": "Session paused successfully",
  "data": {
    "session_id": "...",
    "status": "PAUSED",
    "paused_at": "2025-01-01T10:30:00Z",
    "total_active_time_seconds": 1800,
    "pause_count": 1
  }
}
```

**Use Case:** Student clicks "Pause" button during session.

---

### Resume Session

```typescript
POST /api/internship/sessions/{sessionId}/resume

// Optional body:
{
  "note": "Ready to continue"
}

// Response:
{
  "message": "Session resumed successfully",
  "data": {
    "session_id": "...",
    "status": "ACTIVE",
    "resumed_at": "2025-01-01T10:45:00Z",
    "total_active_time_seconds": 1800,
    "pause_count": 1
  }
}
```

**Use Case:** Student clicks "Resume" button to continue paused session.

---

### Get Session Timer (For Real-Time Display)

```typescript
GET /api/internship/sessions/{sessionId}/timer

// Response:
{
  "status": "ACTIVE",
  "total_active_time_seconds": 2100,
  "remaining_time_seconds": 1500, // null if no limit
  "is_near_timeout": false,        // true when < 5 min remaining
  "started_at": "2025-01-01T10:00:00Z",
  "paused_at": null,
  "pause_count": 2
}
```

**Use Case:** Poll this every 10-30 seconds to update timer display and show warnings.

**Frontend Logic:**
```typescript
if (timerData.is_near_timeout) {
  showTimeoutWarning("⚠️ Less than 5 minutes remaining!");
}

if (timerData.remaining_time_seconds === 0) {
  showTimeExpiredDialog();
}
```

---

### Send Message with Non-Verbal Actions

```typescript
POST /api/internship/sessions/{sessionId}/message

// Body:
{
  "message": "I can see this is difficult for you.",
  "therapist_actions": [          // OPTIONAL - NEW FEATURE
    "offered tissue",
    "maintained eye contact",
    "nodded empathetically"
  ],
  "metadata": {}
}

// Response:
{
  "message": "Message sent successfully",
  "data": {
    "session_id": "...",
    "student_message": { /* ... */ },
    "ai_response": {
      "role": "ai_patient",
      "content": "Thank you... [patient acknowledges gesture]"
    },
    "realtime_tip": { /* supervisor tip if triggered */ }
  }
}
```

**Use Case:** Student sends message, optionally with non-verbal actions selected.

---

### Get Session History

```typescript
GET /api/internship/cases/{caseId}/sessions/history

// Response:
{
  "case_id": "...",
  "case_title": "Anxiety Disorder Case",
  "student_id": "...",
  "statistics": {
    "total_sessions": 3,
    "completed_sessions": 2,
    "active_sessions": 1,
    "total_time_seconds": 5400,
    "max_sessions_allowed": 5,        // null if unlimited
    "sessions_remaining": 3            // null if unlimited
  },
  "sessions": [
    {
      "session_id": "...",
      "session_number": 3,
      "session_type": "patient_interview",
      "status": "ACTIVE",
      "started_at": "2025-01-03T10:00:00Z",
      "ended_at": null,
      "paused_at": null,
      "total_active_time_seconds": 900,
      "message_count": 12,
      "tips_received": 3,
      "pause_count": 1
    },
    // ... more sessions
  ]
}
```

**Use Case:** Display student's practice history and statistics.

---

## 🎯 Common Frontend Flows

### Flow 1: Starting a Session (Recommended)

```typescript
async function startSession(caseId: string) {
  // 1. Check for existing active/paused session
  const checkResponse = await fetch(`/api/internship/cases/${caseId}/sessions/active`);
  const { has_active_session, session } = await checkResponse.json();
  
  if (has_active_session) {
    if (session.status === 'PAUSED') {
      // Show resume dialog
      if (confirm(`You have a paused session. Resume?`)) {
        await fetch(`/api/internship/sessions/${session.session_id}/resume`, {
          method: 'POST'
        });
        navigateToSession(session.session_id);
      }
    } else {
      // Continue active session
      navigateToSession(session.session_id);
    }
  } else {
    // 2. Create new session
    const createResponse = await fetch('/api/internship/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        case_id: caseId,
        session_type: 'patient_interview'
      })
    });
    
    const { data } = await createResponse.json();
    navigateToSession(data._id);
  }
}
```

### Flow 2: Session Timer Component

```typescript
function SessionTimer({ sessionId }) {
  const [timer, setTimer] = useState(null);
  
  useEffect(() => {
    const fetchTimer = async () => {
      const response = await fetch(`/api/internship/sessions/${sessionId}/timer`);
      const data = await response.json();
      setTimer(data);
    };
    
    fetchTimer();
    const interval = setInterval(fetchTimer, 15000); // Poll every 15 seconds
    
    return () => clearInterval(interval);
  }, [sessionId]);
  
  if (!timer) return null;
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="session-timer">
      <div className="active-time">
        ⏱️ {formatTime(timer.total_active_time_seconds)}
      </div>
      
      {timer.remaining_time_seconds !== null && (
        <div className={timer.is_near_timeout ? 'warning' : ''}>
          ⏰ {formatTime(timer.remaining_time_seconds)} remaining
        </div>
      )}
      
      {timer.is_near_timeout && (
        <div className="alert">⚠️ Time running out!</div>
      )}
    </div>
  );
}
```

### Flow 3: Pause/Resume Controls

```typescript
function SessionControls({ sessionId, status, onStatusChange }) {
  const [loading, setLoading] = useState(false);
  
  const handlePause = async () => {
    setLoading(true);
    try {
      await fetch(`/api/internship/sessions/${sessionId}/pause`, {
        method: 'POST'
      });
      onStatusChange('PAUSED');
    } catch (error) {
      alert('Failed to pause session');
    } finally {
      setLoading(false);
    }
  };
  
  const handleResume = async () => {
    setLoading(true);
    try {
      await fetch(`/api/internship/sessions/${sessionId}/resume`, {
        method: 'POST'
      });
      onStatusChange('ACTIVE');
    } catch (error) {
      alert('Failed to resume session');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      {status === 'ACTIVE' && (
        <button onClick={handlePause} disabled={loading}>
          ⏸️ Pause
        </button>
      )}
      {status === 'PAUSED' && (
        <button onClick={handleResume} disabled={loading}>
          ▶️ Resume
        </button>
      )}
    </div>
  );
}
```

### Flow 4: Non-Verbal Actions

```typescript
const ACTIONS = [
  { id: 'tissue', label: 'Offer tissue', icon: '🧻' },
  { id: 'water', label: 'Offer water', icon: '💧' },
  { id: 'eye_contact', label: 'Eye contact', icon: '👁️' },
  { id: 'nod', label: 'Nod', icon: '👍' },
];

function MessageInput({ sessionId, onSent }) {
  const [message, setMessage] = useState('');
  const [selectedActions, setSelectedActions] = useState([]);
  
  const sendMessage = async () => {
    const response = await fetch(`/api/internship/sessions/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        therapist_actions: selectedActions
      })
    });
    
    const data = await response.json();
    onSent(data.data);
    setMessage('');
    setSelectedActions([]);
  };
  
  return (
    <div>
      <textarea 
        value={message} 
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
      />
      
      <div className="actions">
        <label>Non-verbal actions (optional):</label>
        {ACTIONS.map(action => (
          <button
            key={action.id}
            className={selectedActions.includes(action.label) ? 'selected' : ''}
            onClick={() => {
              setSelectedActions(prev => 
                prev.includes(action.label)
                  ? prev.filter(a => a !== action.label)
                  : [...prev, action.label]
              );
            }}
          >
            {action.icon} {action.label}
          </button>
        ))}
      </div>
      
      <button onClick={sendMessage} disabled={!message.trim()}>
        Send Message
      </button>
    </div>
  );
}
```

---

## ⚠️ Important Notes

### 1. Session Status Flow

```
NOT_STARTED → ACTIVE ⇄ PAUSED → COMPLETED → PENDING_VALIDATION
```

- Cannot pause a COMPLETED session
- Cannot send messages when PAUSED
- Must resume before sending messages

### 2. Error Handling

**Common Error: Session Limit Reached**
```json
{
  "statusCode": 400,
  "message": "Maximum number of sessions (3) reached for this case"
}
```

**Frontend Response:**
```typescript
if (error.message.includes('Maximum number of sessions')) {
  showAlert('You have reached the maximum attempts for this case.');
}
```

**Common Error: Pause Not Allowed**
```json
{
  "statusCode": 400,
  "message": "Pausing is not allowed for this session"
}
```

**Frontend Response:**
```typescript
if (error.message.includes('Pausing is not allowed')) {
  hidePauseButton();
}
```

### 3. Timer Accuracy

- `total_active_time_seconds` = time excluding pauses
- Frontend should poll `/timer` endpoint regularly
- Don't calculate time on frontend alone (unreliable with browser/network issues)

### 4. WebSocket Alternative (Future)

Currently using polling for timer updates. For better real-time experience, consider WebSocket connection:

```typescript
// Future enhancement
const ws = new WebSocket(`ws://api/internship/sessions/${sessionId}/timer-stream`);
ws.onmessage = (event) => {
  const timerData = JSON.parse(event.data);
  updateTimerDisplay(timerData);
};
```

---

## 🎨 UI/UX Recommendations

### Session Timer Display
```
┌─────────────────────────┐
│  ⏱️ Active Time: 35:42  │
│  ⏰ Remaining: 24:18    │
│  ⚠️ Time running out!   │  ← Show when < 5 min
└─────────────────────────┘
```

### Pause/Resume Button States
```
Active Session:   [⏸️ Pause Session]
Paused Session:   [▶️ Resume Session] [❌ End Session]
```

### Session Limits Display
```
┌──────────────────────────────┐
│  Session Attempt: 2 of 3     │
│  ⚠️ 1 attempt remaining       │
└──────────────────────────────┘
```

### Non-Verbal Actions (Optional)
```
Non-verbal actions (optional):
[🧻 Tissue] [💧 Water] [👁️ Eye Contact] [👍 Nod]
 ✓ selected  unselected  unselected     unselected
```

---

## 🔧 Testing Tips

### Test Pause/Resume
```typescript
// 1. Start session
const session = await createSession(caseId);

// 2. Send a few messages
await sendMessage(session._id, "Hello");

// 3. Pause
await fetch(`/api/internship/sessions/${session._id}/pause`, { method: 'POST' });

// 4. Wait 10 seconds
await new Promise(resolve => setTimeout(resolve, 10000));

// 5. Resume
await fetch(`/api/internship/sessions/${session._id}/resume`, { method: 'POST' });

// 6. Check timer - pause time should NOT be included in total_active_time_seconds
const timer = await fetch(`/api/internship/sessions/${session._id}/timer`).then(r => r.json());
console.log('Active time:', timer.total_active_time_seconds);
```

### Test Session Limits
```typescript
// Configure case with max 2 sessions
// Complete 2 sessions
// Try to create 3rd - should fail

for (let i = 0; i < 3; i++) {
  try {
    const session = await createSession(caseId);
    console.log(`Session ${i + 1} created`);
    await completeSession(session._id);
  } catch (error) {
    console.log(`Session ${i + 1} failed:`, error.message);
    // Should fail on 3rd attempt
  }
}
```

---

## 📞 Need Help?

- **API Documentation:** `/api/docs`
- **Full Implementation Guide:** `SESSION_MANAGEMENT_IMPLEMENTATION.md`
- **Test Examples:** `src/modules/internship/__tests__/`

---

**Quick Reference Version:** 1.0  
**Last Updated:** December 31, 2025

