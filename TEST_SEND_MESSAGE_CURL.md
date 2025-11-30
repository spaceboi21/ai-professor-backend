# 🧪 Test Send Message - Curl Command

## Quick Test Command

After creating a session successfully, test sending a message:

```bash
curl -X POST https://api.psysphereai.com/api/internship/sessions/692c41b73850a8057fa21684/message \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello John, thank you for coming in today. Can you tell me what brings you here?"
  }'
```

## Expected Success Response

```json
{
  "message": "Message sent successfully",
  "data": {
    "session_id": "692c41b73850a8057fa21684",
    "student_message": {
      "role": "STUDENT",
      "content": "Hello John, thank you for coming in today...",
      "timestamp": "2025-11-30T13:10:14.000Z"
    },
    "ai_response": {
      "role": "AI_PATIENT",
      "content": "Hi doctor... (patient's response from AI)"
    },
    "realtime_tip": {
      "message": "Good opening! Consider asking about...",
      "context": "communication",
      "timestamp": "2025-11-30T13:10:14.000Z"
    }
  }
}
```

## What Was Fixed

### Issue 1: Missing Context Fields ✅
**Problem**: Python API required `context.message_number` and `context.elapsed_time_minutes` but we were sending empty `{}`

**Fix**: Now automatically calculates:
- `message_number`: Count of messages in the session
- `elapsed_time_minutes`: Time since session started (in minutes)

### Issue 2: ObjectId Validation ✅
**Problem**: BSONError when sessionId format was invalid

**Fix**: Added validation to check if sessionId is a valid ObjectId before using it

## Context Fields Automatically Added

The code now automatically builds the context:

```javascript
{
  message_number: 1,  // First message = 1, second = 2, etc.
  elapsed_time_minutes: 2,  // Minutes since session started
  // ... any additional metadata you send
}
```

## Test Multiple Messages

Send a second message to see message_number increment:

```bash
curl -X POST https://api.psysphereai.com/api/internship/sessions/692c41b73850a8057fa21684/message \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I understand. Can you tell me more about when these feelings first started?"
  }'
```

This will have `message_number: 2` and updated `elapsed_time_minutes`.

## Optional Metadata

You can also include additional metadata:

```bash
curl -X POST https://api.psysphereai.com/api/internship/sessions/692c41b73850a8057fa21684/message \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How are you feeling today?",
    "metadata": {
      "question_type": "open_ended",
      "focus_area": "current_state"
    }
  }'
```

The metadata will be merged with the automatic context fields.

## Troubleshooting

### Error: "Invalid session ID format"
- Check that the session ID is a valid 24-character hex string
- Make sure you're using the `_id` from the session creation response

### Error: "Session not found"
- Session might be deleted or belong to a different user
- Check that you're using the correct student token

### Error: "Session is not active"
- Session might have been completed
- Create a new session

### Error: Still getting 422 about context fields
- Make sure PM2 was restarted after the fix
- Check server logs to see what context is being sent

---

**The fix is now live! Try sending a message and it should work!** 🎉

