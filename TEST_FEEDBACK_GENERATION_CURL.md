# 🧪 Test Feedback Generation - Curl Command

## Quick Test Command

After completing a session, generate feedback:

```bash
curl -X POST https://api.psysphereai.com/api/internship/sessions/692c41b73850a8057fa21684/feedback \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN" \
  -H "Content-Type: application/json"
```

**Note**: No body required - the endpoint uses the session ID to get all data.

## Expected Success Response

```json
{
  "message": "Feedback generated successfully",
  "data": {
    "_id": "feedback_id_here",
    "session_id": "692c41b73850a8057fa21684",
    "student_id": "69028466b8bc3f208a16fc02",
    "case_id": "692c3bf7c5f86634a80c6978",
    "overall_score": 85,
    "status": "PENDING_VALIDATION",
    "rubric_scores": [
      {
        "criterion": "Clinical Reasoning",
        "score": 28,
        "max_score": 30,
        "weight": 30
      },
      {
        "criterion": "Communication Skills & Empathy",
        "score": 22,
        "max_score": 25,
        "weight": 25
      }
    ],
    "strengths": [
      "Excellent rapport building",
      "Good use of open-ended questions"
    ],
    "improvement_areas": [
      "Could explore symptoms more systematically",
      "Consider using standardized assessment tools"
    ],
    "created_at": "2025-11-30T13:21:03.000Z"
  }
}
```

## What Was Fixed

### Issue: Missing `session_duration_minutes` ✅
**Problem**: Python API required `session_data.session_duration_minutes` but it was missing

**Fix**: Now automatically calculates duration from `started_at` and `ended_at`:

```typescript
const sessionDurationMinutes = Math.floor(
  (session.ended_at - session.started_at) / 60000
);
```

## Prerequisites

Before generating feedback, make sure:

1. ✅ **Session is completed** - Call `POST /api/internship/sessions/:sessionId/complete` first
2. ✅ **Session has messages** - At least one student message and one AI response
3. ✅ **Case has evaluation_criteria** - For proper scoring

## Complete Workflow

### Step 1: Create Session
```bash
POST /api/internship/sessions
{
  "internship_id": "...",
  "case_id": "...",
  "session_type": "patient_interview"
}
```

### Step 2: Send Messages
```bash
POST /api/internship/sessions/:sessionId/message
{
  "message": "Hello John, how are you feeling today?"
}
```

### Step 3: Complete Session
```bash
POST /api/internship/sessions/:sessionId/complete
```

### Step 4: Generate Feedback
```bash
POST /api/internship/sessions/:sessionId/feedback
```

## Troubleshooting

### Error: "Session must be completed before generating feedback"
**Fix**: Complete the session first using `POST /api/internship/sessions/:sessionId/complete`

### Error: "Session not found"
- Check session ID is correct
- Verify session belongs to the logged-in student

### Error: Still getting 422 about `session_duration_minutes`
- Make sure PM2 was restarted after the fix
- Check server logs to see what's being sent

### Error: "Feedback already exists"
- Feedback was already generated for this session
- Use GET endpoint to retrieve existing feedback

---

**The fix is now live! Try generating feedback and it should work!** 🎉

