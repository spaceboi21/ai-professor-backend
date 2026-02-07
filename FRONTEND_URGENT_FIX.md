# 🚨 URGENT: Frontend Session Completion Flow Fix

**Issue**: Frontend is calling `GET /sessions/{id}/feedback` without completing the session first.

---

## ❌ Current Broken Flow

```javascript
// Frontend is doing this:
const session = await createSession(caseId);
const assessment = await getSessionFeedback(session.id); // ❌ FAILS - No feedback yet!
```

---

## ✅ Correct Flow

```javascript
// Step 1: Create session
const session = await createSession({
  case_id: caseId,
  session_type: 'patient_interview'
});

// Step 2: Have conversation (student sends messages)
await sendMessage(session.id, { message: "Bonjour..." });
// ... more messages ...

// Step 3: COMPLETE the session (this triggers assessment generation)
const completionResponse = await completeSession(session.id);
// Backend will:
// - Mark session as COMPLETED
// - Auto-generate comprehensive assessment (30-90 seconds)
// - Track attempt
// - Update cross-session memory

// Step 4: NOW you can get the assessment
const assessment = await getSessionFeedback(session.id);
```

---

## API Calls Needed

### 1. Complete Session (REQUIRED FIRST)

```typescript
POST /api/internship/sessions/{sessionId}/complete
Authorization: Bearer {token}

// Backend automatically generates assessment
// Response:
{
  "message": "Session completed successfully",
  "data": {
    "session": {
      "_id": "69869b4d85752ef0f192e3e6",
      "status": "COMPLETED", // or "PENDING_VALIDATION"
      "ended_at": "2026-02-07T02:00:00Z"
    },
    "feedback_generated": true, // Indicates if assessment was created
    "feedback_id": "..."
  }
}
```

### 2. Get Assessment (AFTER COMPLETION)

```typescript
GET /api/internship/sessions/{sessionId}/feedback
Authorization: Bearer {token}

// Response:
{
  "message": "Feedback retrieved successfully",
  "data": {
    "ai_feedback": {
      "overall_score": 82,
      "grade": "B",
      "pass_fail": "PASS",
      "criteria_scores": [...],
      "strengths": [...],
      "areas_for_improvement": [...],
      "recommendations_next_session": [...],
      "evolution_vs_previous_attempts": "..."
    }
  }
}
```

---

## Frontend Code Example

### Session Completion Handler

```typescript
// In your SessionPage or similar component

const handleCompleteSession = async () => {
  try {
    setLoading(true);
    setStatus('Completing session...');
    
    // Step 1: Complete the session (triggers backend assessment generation)
    const completionResponse = await api.post(
      `/internship/sessions/${sessionId}/complete`
    );
    
    setStatus('Generating comprehensive assessment...');
    
    // Step 2: Wait a moment for backend to generate (or poll)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Get the assessment
    const assessmentResponse = await api.get(
      `/internship/sessions/${sessionId}/feedback`
    );
    
    // Step 4: Navigate to assessment page
    router.push(`/sessions/${sessionId}/assessment`);
    
  } catch (error) {
    if (error.status === 404) {
      // Assessment not ready yet - implement polling
      setStatus('Assessment generation in progress...');
      await pollForAssessment(sessionId);
    } else {
      console.error('Failed to complete session:', error);
      toast.error(error.message);
    }
  } finally {
    setLoading(false);
  }
};
```

### Polling for Assessment (if needed)

```typescript
const pollForAssessment = async (sessionId: string, maxAttempts = 30) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await api.get(
        `/internship/sessions/${sessionId}/feedback`
      );
      
      // Success! Assessment is ready
      return response.data;
      
    } catch (error) {
      if (error.status === 404 && attempt < maxAttempts) {
        // Not ready yet, wait 3 seconds and try again
        setStatus(`Generating assessment... (${attempt * 3}s)`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('Assessment generation timed out after 90 seconds');
};
```

---

## Assessment Page Component

```typescript
// pages/sessions/[sessionId]/assessment.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function AssessmentPage() {
  const router = useRouter();
  const { sessionId } = router.query;
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        setLoading(true);
        
        const response = await api.get(
          `/internship/sessions/${sessionId}/feedback`
        );
        
        setAssessment(response.data.data);
      } catch (err) {
        if (err.status === 404) {
          // Assessment not generated yet - try polling
          try {
            const result = await pollForAssessment(sessionId);
            setAssessment(result.data);
          } catch (pollError) {
            setError('Failed to load assessment. Please try again.');
          }
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchAssessment();
    }
  }, [sessionId]);

  if (loading) {
    return (
      <LoadingState>
        <Spinner />
        <Text>Loading your assessment...</Text>
      </LoadingState>
    );
  }

  if (error) {
    return (
      <ErrorState>
        <Text>{error}</Text>
        <RetryButton onClick={() => router.reload()}>
          Retry
        </RetryButton>
      </ErrorState>
    );
  }

  if (!assessment?.ai_feedback) {
    return (
      <ErrorState>
        <Text>Assessment data is incomplete</Text>
      </ErrorState>
    );
  }

  return (
    <AssessmentResults>
      {/* Display assessment as per FRONTEND_STUDENT_INTERFACE_GUIDE.md */}
      <ScoreDisplay 
        score={assessment.ai_feedback.overall_score}
        grade={assessment.ai_feedback.grade}
        passFail={assessment.ai_feedback.pass_fail}
      />
      
      <CriteriaBreakdown 
        criteria={assessment.ai_feedback.criteria_scores}
      />
      
      {/* ... rest of components */}
    </AssessmentResults>
  );
}
```

---

## Old Session Issue

The old session `698697fc1ade2a403d668123` has status `PENDING_VALIDATION`. This means:
- It was completed with the OLD system
- It has NO comprehensive assessment (old feedback format)
- Cannot be resumed or completed again
- Frontend should show "Session already completed" message

### Handle Old Sessions

```typescript
const handleResumeSession = async (sessionId: string) => {
  try {
    await api.post(`/internship/sessions/${sessionId}/resume`);
  } catch (error) {
    if (error.message.includes('PENDING_VALIDATION')) {
      // Old session - redirect to results or show message
      toast.info('This session is already completed. Viewing results...');
      router.push(`/sessions/${sessionId}/results`);
    }
  }
};
```

---

## Complete Button State

```typescript
<CompleteSessionButton
  onClick={handleCompleteSession}
  disabled={session.status !== 'IN_PROGRESS'}
>
  {session.status === 'COMPLETED' 
    ? '✅ Session Completed'
    : session.status === 'PENDING_VALIDATION'
    ? '⏳ Awaiting Validation'
    : 'Complete Session'
  }
</CompleteSessionButton>
```

---

## Summary

### ✅ DO THIS:
1. **Complete session first** → `POST /sessions/{id}/complete`
2. **Wait 2-3 seconds** (or poll if 404)
3. **Get assessment** → `GET /sessions/{id}/feedback`
4. **Display results**

### ❌ DON'T DO THIS:
- Don't call GET feedback without completing session first
- Don't try to resume/complete sessions with status PENDING_VALIDATION
- Don't expect immediate assessment (takes 30-90s to generate)

---

**Updated**: February 7, 2026  
**Status**: CRITICAL FIX REQUIRED
