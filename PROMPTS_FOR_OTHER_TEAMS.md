# Prompts for Other Development Teams

## Overview
The NestJS backend has been updated with comprehensive session management features. Below are ready-to-use prompts for your other development teams.

---

## 📱 PROMPT FOR FRONTEND TEAM

Copy and paste this into your frontend Cursor/AI:

---

### PROMPT START:

```
# Session Management - Frontend Implementation

## Context
Our NestJS backend has been updated with comprehensive session management features for student internship/practice sessions. I need to implement the frontend for two interfaces:

1. **Student Interface** - For students practicing with AI patients
2. **School Admin/Professor Interface** - For configuring cases and monitoring students

## Backend API Updates

### New Endpoints Available:

1. **Check for Active/Paused Session**
   ```
   GET /api/internship/cases/{caseId}/sessions/active
   ```
   Returns: `{ has_active_session: boolean, session: SessionData | null }`

2. **Pause Session**
   ```
   POST /api/internship/sessions/{sessionId}/pause
   Body: { reason?: string }
   ```

3. **Resume Session**
   ```
   POST /api/internship/sessions/{sessionId}/resume
   Body: { note?: string }
   ```

4. **Get Session Timer (Real-time)**
   ```
   GET /api/internship/sessions/{sessionId}/timer
   ```
   Returns: `{ status, total_active_time_seconds, remaining_time_seconds, is_near_timeout, ... }`

5. **Get Session History**
   ```
   GET /api/internship/cases/{caseId}/sessions/history
   ```
   Returns: Complete history with statistics

6. **Send Message (Updated)**
   ```
   POST /api/internship/sessions/{sessionId}/message
   Body: {
     message: string,
     therapist_actions?: string[],  // NEW - optional non-verbal actions
     metadata?: object
   }
   ```

## Student Interface - Features to Implement

### 1. Session Start Flow (IMPORTANT - Check Before Starting)

**Before starting a new session, ALWAYS check for existing active/paused sessions:**

```typescript
// Example implementation needed:
async function handleStartSession(caseId: string) {
  // 1. Check for active/paused session first
  const response = await fetch(`/api/internship/cases/${caseId}/sessions/active`);
  const { has_active_session, session } = await response.json();
  
  if (has_active_session) {
    if (session.status === 'PAUSED') {
      // Show resume dialog
      const resume = confirm('You have a paused session. Would you like to resume it?');
      if (resume) {
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
    // No active session, create new one
    const createResponse = await fetch('/api/internship/sessions', {
      method: 'POST',
      body: JSON.stringify({ case_id: caseId, session_type: 'patient_interview' })
    });
    const { data } = await createResponse.json();
    navigateToSession(data._id);
  }
}
```

### 2. Session Timer Component (Real-time Display)

**Create a component that polls the timer endpoint every 10-30 seconds:**

Features needed:
- Display active time (excluding paused periods)
- Display remaining time if session has duration limit
- Show warning when < 5 minutes remaining (is_near_timeout: true)
- Visual indicator for time running out

```typescript
// Component structure needed:
interface SessionTimerProps {
  sessionId: string;
}

function SessionTimer({ sessionId }: SessionTimerProps) {
  // Poll /api/internship/sessions/{sessionId}/timer every 15 seconds
  // Display: "Active Time: 35:42" and "Remaining: 24:18"
  // Show warning if is_near_timeout === true
}
```

### 3. Pause/Resume Controls

**Add pause and resume buttons to the session interface:**

- Show "⏸️ Pause Session" button when session status is ACTIVE
- Show "▶️ Resume Session" button when session status is PAUSED
- Update UI immediately after pause/resume
- Disable message sending when PAUSED

```typescript
// Component needed:
function SessionControls({ sessionId, currentStatus, onStatusChange }) {
  const handlePause = async () => {
    await fetch(`/api/internship/sessions/${sessionId}/pause`, { method: 'POST' });
    onStatusChange('PAUSED');
  };
  
  const handleResume = async () => {
    await fetch(`/api/internship/sessions/${sessionId}/resume`, { method: 'POST' });
    onStatusChange('ACTIVE');
  };
  
  // Render appropriate button based on currentStatus
}
```

### 4. Non-Verbal Actions Component

**Add buttons for students to indicate non-verbal therapeutic actions:**

Actions to support:
- "Offered tissue" 🧻
- "Offered water" 💧
- "Maintained eye contact" 👁️
- "Nodded supportively" 👍
- "Leaned forward (engaged)" ↗️
- "Gentle hand on shoulder" 🤝

These should be:
- Optional (student can select 0 or more before sending message)
- Multi-select buttons (can toggle on/off)
- Clear after message is sent
- Sent as array in therapist_actions field

```typescript
// Component needed:
function NonVerbalActions({ onActionsChange }) {
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  
  // When student sends message:
  const messageData = {
    message: messageText,
    therapist_actions: selectedActions  // Send selected actions
  };
}
```

### 5. Session History Page

**Create a page showing all student's attempts at a case:**

Display:
- Statistics: total sessions, completed sessions, total time spent
- Sessions remaining (if limited by professor)
- List of all sessions with details:
  - Session number (#1, #2, #3)
  - Status (ACTIVE, PAUSED, COMPLETED)
  - Start/end times
  - Duration (active time)
  - Message count
  - Tips received
- Ability to resume paused sessions from history
- Ability to view feedback for completed sessions

### 6. Message Input (Update Existing)

**Update the message sending to include therapist_actions:**

```typescript
// Update existing message send function:
const sendMessage = async (message: string, actions: string[]) => {
  const response = await fetch(`/api/internship/sessions/${sessionId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message,
      therapist_actions: actions  // ADD THIS
    })
  });
  
  const data = await response.json();
  // Handle response
};
```

## School Admin/Professor Interface - Features to Implement

### 1. Session Configuration Form (Case Creation/Editing)

**Add session configuration fields when professors create or edit cases:**

Fields needed:
```typescript
session_config: {
  session_duration_minutes: number;      // Default: 60
  max_sessions_allowed: number | null;   // null = unlimited
  allow_pause: boolean;                  // Default: true
  auto_end_on_timeout: boolean;          // Default: false
  warning_before_timeout_minutes: number; // Default: 5
}
```

UI Form:
```html
<form>
  <!-- Existing case fields... -->
  
  <section>
    <h3>Session Configuration</h3>
    
    <label>
      Session Duration (minutes)
      <input 
        type="number" 
        name="session_config.session_duration_minutes"
        defaultValue={60}
        min={15}
        max={300}
      />
      <small>How long should each session be? (15-300 minutes)</small>
    </label>
    
    <label>
      Maximum Sessions Allowed
      <input 
        type="number" 
        name="session_config.max_sessions_allowed"
        placeholder="Leave empty for unlimited"
        min={1}
      />
      <small>How many attempts can students make? (Leave empty for unlimited)</small>
    </label>
    
    <label>
      <input 
        type="checkbox" 
        name="session_config.allow_pause"
        defaultChecked={true}
      />
      Allow students to pause sessions
    </label>
    
    <label>
      <input 
        type="checkbox" 
        name="session_config.auto_end_on_timeout"
        defaultChecked={false}
      />
      Automatically end session when time expires
    </label>
    
    <label>
      Warning Before Timeout (minutes)
      <input 
        type="number" 
        name="session_config.warning_before_timeout_minutes"
        defaultValue={5}
        min={1}
        max={30}
      />
      <small>When to warn students before time expires</small>
    </label>
  </section>
</form>
```

### 2. Student Progress Monitoring (Optional Enhancement)

**Show professors student session patterns:**

- Number of sessions per student
- Average session duration
- Pause frequency
- Completion rates

This data is available from the session history endpoint.

## TypeScript Types/Interfaces Needed

```typescript
interface SessionTimer {
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'PENDING_VALIDATION';
  total_active_time_seconds: number;
  remaining_time_seconds: number | null;
  is_near_timeout: boolean;
  started_at: string;
  paused_at: string | null;
  pause_count: number;
}

interface SessionHistory {
  case_id: string;
  case_title: string;
  student_id: string;
  statistics: {
    total_sessions: number;
    completed_sessions: number;
    active_sessions: number;
    total_time_seconds: number;
    max_sessions_allowed: number | null;
    sessions_remaining: number | null;
  };
  sessions: SessionSummary[];
}

interface SessionSummary {
  session_id: string;
  session_number: number;
  session_type: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  paused_at: string | null;
  total_active_time_seconds: number;
  message_count: number;
  tips_received: number;
  pause_count: number;
}

interface SessionConfig {
  session_duration_minutes: number;
  max_sessions_allowed: number | null;
  allow_pause: boolean;
  auto_end_on_timeout: boolean;
  warning_before_timeout_minutes: number;
}
```

## Important Implementation Notes

1. **Always check for active sessions before starting new ones** - This prevents students from accidentally creating multiple sessions
2. **Poll timer endpoint regularly** - Every 10-30 seconds to keep display updated
3. **Disable message input when PAUSED** - Students must resume before sending messages
4. **Clear non-verbal actions after sending** - Don't carry actions over to next message
5. **Show appropriate error messages** - When session limit reached, pause not allowed, etc.

## Testing Checklist

- [ ] Can check for active/paused session before starting
- [ ] Can pause active session
- [ ] Can resume paused session
- [ ] Timer updates correctly (polls every 10-30 seconds)
- [ ] Warning shows when time running out
- [ ] Non-verbal actions buttons work (multi-select)
- [ ] Actions sent with message
- [ ] Session history displays correctly
- [ ] Can resume session from history
- [ ] Professor can configure session settings
- [ ] Configuration saves and loads correctly

## Questions or Issues?

Contact the backend team or refer to:
- API Documentation: /api/docs
- Full Implementation Guide: SESSION_MANAGEMENT_IMPLEMENTATION.md
- API Quick Reference: API_QUICK_REFERENCE_SESSION_MANAGEMENT.md

Please implement these features for both student and admin interfaces. Focus on the student interface first as it has the most user-facing changes.
```

### PROMPT END

---

## 🐍 PROMPT FOR PYTHON AI BACKEND TEAM

Copy and paste this into your Python AI backend Cursor/AI:

---

### PROMPT START:

```
# Python AI Backend - Therapist Actions Integration

## Context
The NestJS backend now supports non-verbal therapist actions that students can indicate during patient interactions. I need to update our patient message endpoint to accept and process these actions.

## API Change Required

**Endpoint:** `POST /api/v1/internship/patient/message`

### Current Request Model:
```python
{
  "session_id": "uuid-string",
  "student_message": "Can you tell me about your symptoms?",
  "context": {
    "message_number": 12,
    "elapsed_time_minutes": 15
  }
}
```

### NEW Request Model (with therapist_actions):
```python
{
  "session_id": "uuid-string",
  "student_message": "I can see this is very difficult for you.",
  "context": {
    "message_number": 12,
    "elapsed_time_minutes": 15
  },
  "therapist_actions": [           # NEW FIELD - OPTIONAL
    "offered tissue",
    "maintained eye contact",
    "nodded empathetically"
  ]
}
```

## Implementation Required

### 1. Update Pydantic Model

```python
from typing import List, Optional
from pydantic import BaseModel

class PatientMessageRequest(BaseModel):
    session_id: str
    student_message: str
    context: dict
    therapist_actions: Optional[List[str]] = []  # NEW FIELD - defaults to empty list
```

### 2. Update Endpoint Handler

```python
@router.post("/internship/patient/message")
async def send_patient_message(
    request: PatientMessageRequest
) -> PatientMessageResponse:
    """
    Process student message and return patient response.
    Now includes support for non-verbal therapist actions.
    """
    
    session_id = request.session_id
    student_message = request.student_message
    context = request.context
    therapist_actions = request.therapist_actions or []  # Handle None or empty
    
    # Get session
    session = get_session(session_id)
    
    # Build action context for AI prompt
    action_context = ""
    if therapist_actions:
        action_context = build_action_context(therapist_actions)
    
    # Generate patient response with action awareness
    patient_response = generate_patient_response(
        session=session,
        student_message=student_message,
        context=context,
        action_context=action_context
    )
    
    # Adjust rapport based on actions
    rapport_adjustment = calculate_rapport_adjustment(
        therapist_actions,
        session.emotional_state
    )
    session.rapport_level = min(10, session.rapport_level + rapport_adjustment)
    
    return PatientMessageResponse(
        patient_response=patient_response,
        non_verbal_cues=session.current_non_verbal_cues,
        emotional_state=session.emotional_state,
        rapport_level=session.rapport_level
    )
```

### 3. Build Action Context for AI

```python
def build_action_context(therapist_actions: List[str]) -> str:
    """
    Build context string to include in AI prompt.
    """
    if not therapist_actions:
        return ""
    
    action_meanings = {
        "offered tissue": "showing empathy and practical support",
        "offered water": "showing care and attending to comfort",
        "maintained eye contact": "demonstrating engagement and presence",
        "maintained supportive eye contact": "showing empathy through gaze",
        "nodded empathetically": "validating emotions non-verbally",
        "nodded supportively": "showing understanding",
        "leaned forward": "expressing interest and engagement",
        "gentle hand on shoulder": "providing physical comfort",
    }
    
    context_parts = []
    for action in therapist_actions:
        meaning = action_meanings.get(action.lower(), "showing attentiveness")
        context_parts.append(f"- {action} ({meaning})")
    
    return "\n".join([
        "\nTherapist non-verbal actions:",
        *context_parts,
        "\nThe patient should acknowledge these actions appropriately based on their emotional state and rapport level."
    ])
```

### 4. Calculate Rapport Adjustment

```python
def calculate_rapport_adjustment(
    therapist_actions: List[str],
    emotional_state: str
) -> int:
    """
    Calculate how therapist actions affect rapport.
    Different actions have different impacts based on emotional state.
    """
    
    adjustment = 0
    
    # Action impacts vary by emotional state
    action_impacts = {
        "anxious": {
            "offered tissue": 1,
            "maintained eye contact": 1,
            "nodded supportively": 1,
            "gentle hand on shoulder": 2,  # Very helpful when anxious
        },
        "angry": {
            "maintained eye contact": 0,    # Neutral when angry
            "leaned forward": -1,           # Might feel confrontational
            "gentle hand on shoulder": -1,  # Unwanted touch
        },
        "sad": {
            "offered tissue": 2,            # Very helpful when crying
            "nodded empathetically": 2,
            "gentle hand on shoulder": 1,
        },
        "guarded": {
            "maintained eye contact": -1,   # Might feel intrusive
            "gentle hand on shoulder": -2,  # Definitely unwanted
            "offered water": 1,             # Non-threatening
        },
    }
    
    state_impacts = action_impacts.get(emotional_state, {})
    
    for action in therapist_actions:
        action_lower = action.lower()
        for key, impact in state_impacts.items():
            if key in action_lower:
                adjustment += impact
                break
    
    # Cap adjustment at +3/-2 per turn
    return max(-2, min(3, adjustment))
```

### 5. Include in AI Prompt

```python
def generate_patient_response(
    session: Session,
    student_message: str,
    context: dict,
    action_context: str
) -> str:
    """
    Generate patient response using AI.
    """
    
    prompt = f"""
You are simulating a patient with {session.diagnosis}.

Current emotional state: {session.emotional_state}
Rapport level: {session.rapport_level}/10

Student therapist said: "{student_message}"

{action_context}

Generate a realistic patient response that:
1. Responds to the verbal message
2. Acknowledges the non-verbal actions if appropriate
3. Reflects the current emotional state
4. Adjusts openness based on rapport level

Response:"""

    response = call_ai_model(prompt)
    return response
```

## Example Scenarios to Test

### Scenario 1: Offering Tissue (Appropriate)
**Input:**
```json
{
  "student_message": "I can see this is very difficult for you.",
  "therapist_actions": ["offered tissue"],
  "emotional_state": "sad"
}
```

**Expected Response:**
```json
{
  "patient_response": "Thank you... [takes tissue and wipes eyes] I'm sorry, I didn't mean to get so emotional.",
  "rapport_level": 7  // Increased from 5
}
```

### Scenario 2: Inappropriate Touch
**Input:**
```json
{
  "student_message": "It's okay, you're safe here.",
  "therapist_actions": ["gentle hand on shoulder"],
  "emotional_state": "guarded",
  "rapport_level": 2
}
```

**Expected Response:**
```json
{
  "patient_response": "[pulls away slightly] I... I don't like being touched. Please don't do that.",
  "rapport_level": 1  // Decreased
}
```

### Scenario 3: No Actions (Backward Compatible)
**Input:**
```json
{
  "student_message": "Can you tell me more?",
  "therapist_actions": []  // Or field not present
}
```

**Expected Response:**
```json
{
  "patient_response": "[Normal response without acknowledging any actions]",
  "rapport_level": 5  // Unchanged
}
```

## Important Notes

1. **Field is OPTIONAL** - Must work with or without therapist_actions
2. **Backward Compatible** - Old requests (without this field) must still work
3. **Context-Aware** - Same action can be positive or negative depending on:
   - Current emotional state
   - Rapport level
   - Patient diagnosis
   - Cultural context
4. **Teaching Tool** - Use reactions to teach appropriate therapeutic behavior

## Testing Checklist

- [ ] Endpoint accepts therapist_actions field (optional)
- [ ] Works without therapist_actions (backward compatible)
- [ ] Works with empty therapist_actions array
- [ ] Patient acknowledges appropriate actions
- [ ] Patient reacts negatively to inappropriate actions
- [ ] Rapport adjusts correctly based on actions
- [ ] Multiple actions in one message handled correctly

## Deployment

1. Update Pydantic model
2. Update endpoint handler
3. Implement action context builder
4. Implement rapport adjustment
5. Test thoroughly
6. Deploy to development environment
7. Coordinate with NestJS backend team for integration testing

The NestJS backend is already updated and ready to send therapist_actions. Once you implement this, the full feature will be functional.
```

### PROMPT END

---

## 🔄 COORDINATION CHECKLIST

Use this to ensure all teams are aligned:

### Backend (NestJS) ✅
- [x] Session management implemented
- [x] Pause/resume endpoints created
- [x] Timer endpoint created
- [x] Session history endpoint created
- [x] therapist_actions field added to message DTO
- [x] All schemas updated
- [x] No linter errors
- [x] Documentation complete

### Frontend 📱
- [ ] Check active session before starting (CRITICAL)
- [ ] Pause/resume buttons implemented
- [ ] Session timer component (polls every 10-30s)
- [ ] Non-verbal actions component
- [ ] Session history page
- [ ] Message sending updated with therapist_actions
- [ ] Professor session config form
- [ ] TypeScript types created

### Python AI Backend 🐍
- [ ] PatientMessageRequest model updated
- [ ] therapist_actions field added (optional)
- [ ] Action context builder implemented
- [ ] Rapport adjustment logic implemented
- [ ] AI prompt updated to include actions
- [ ] Backward compatibility tested
- [ ] Integration tested with NestJS

### Testing 🧪
- [ ] Backend → Frontend integration tested
- [ ] Backend → Python AI integration tested
- [ ] Full end-to-end flow tested
- [ ] Edge cases tested (pause limits, session limits, etc.)
- [ ] User acceptance testing

---

## 📊 API Endpoints Summary for Frontend

**Base URL:** Your NestJS backend URL

### Student Session Management
```
GET    /api/internship/cases/:caseId/sessions/active
POST   /api/internship/sessions
POST   /api/internship/sessions/:sessionId/message
POST   /api/internship/sessions/:sessionId/pause
POST   /api/internship/sessions/:sessionId/resume
POST   /api/internship/sessions/:sessionId/complete
GET    /api/internship/sessions/:sessionId
GET    /api/internship/sessions/:sessionId/timer
GET    /api/internship/cases/:caseId/sessions/history
```

### Professor/Admin
```
POST   /api/internship/cases          (with session_config)
PATCH  /api/internship/cases/:caseId  (with session_config)
```

---

## 🔗 Additional Resources

For complete implementation details, see:
- `SESSION_MANAGEMENT_IMPLEMENTATION.md` - Complete guide
- `API_QUICK_REFERENCE_SESSION_MANAGEMENT.md` - Quick reference with examples
- `DEPLOYMENT_SUMMARY_SESSION_MANAGEMENT.md` - Deployment guide
- `PYTHON_BACKEND_INTEGRATION_THERAPIST_ACTIONS.md` - Python detailed guide

---

**Created:** December 31, 2025  
**Status:** Ready for distribution to teams

