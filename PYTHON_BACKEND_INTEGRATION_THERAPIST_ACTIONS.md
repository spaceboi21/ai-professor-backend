# Python AI Backend - Therapist Actions Integration

## Overview

The NestJS backend now supports **non-verbal therapist actions** that students can indicate during patient interactions. Your Python AI backend needs to process these actions to make the patient simulation more realistic.

---

## 🔧 Changes Required

### API Endpoint Update

**Endpoint:** `POST /api/v1/internship/patient/message`

**Current Request:**
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

**NEW Request (with therapist_actions):**
```python
{
  "session_id": "uuid-string",
  "student_message": "I can see this is very difficult for you.",
  "context": {
    "message_number": 12,
    "elapsed_time_minutes": 15
  },
  "therapist_actions": [           # NEW FIELD - Optional
    "offered tissue",
    "maintained eye contact",
    "nodded empathetically"
  ]
}
```

---

## 📝 Implementation Example

### Updated Pydantic Model

```python
from typing import List, Optional
from pydantic import BaseModel

class PatientMessageRequest(BaseModel):
    session_id: str
    student_message: str
    context: dict
    therapist_actions: Optional[List[str]] = []  # NEW FIELD

class PatientMessageResponse(BaseModel):
    patient_response: str
    non_verbal_cues: List[str]
    somatic_sensations: List[str]
    behavioral_observations: List[str]
    emotional_state: str
    rapport_level: int
    success: bool = True
```

### Updated Router/Endpoint

```python
@router.post("/internship/patient/message")
async def send_patient_message(
    request: PatientMessageRequest
) -> PatientMessageResponse:
    """
    Process student message and return patient response.
    Now includes support for non-verbal therapist actions.
    """
    
    # Extract data
    session_id = request.session_id
    student_message = request.student_message
    context = request.context
    therapist_actions = request.therapist_actions or []
    
    # Get session state
    session = get_session(session_id)
    
    # Build enhanced context including therapist actions
    action_context = build_action_context(therapist_actions)
    
    # Generate patient response
    patient_response = generate_patient_response(
        session=session,
        student_message=student_message,
        context=context,
        action_context=action_context
    )
    
    # Calculate rapport adjustment based on actions
    rapport_adjustment = calculate_rapport_adjustment(
        therapist_actions, 
        session.current_emotional_state
    )
    
    session.rapport_level = min(10, session.rapport_level + rapport_adjustment)
    
    return PatientMessageResponse(
        patient_response=patient_response,
        non_verbal_cues=session.current_non_verbal_cues,
        somatic_sensations=session.somatic_symptoms,
        behavioral_observations=session.behavioral_observations,
        emotional_state=session.emotional_state,
        rapport_level=session.rapport_level
    )
```

---

## 🧠 AI Prompt Integration

### How to Use Therapist Actions in Prompts

```python
def build_action_context(therapist_actions: List[str]) -> str:
    """
    Build context string for AI prompt based on therapist actions.
    """
    if not therapist_actions:
        return ""
    
    # Map actions to their therapeutic significance
    action_meanings = {
        "offered tissue": "showing empathy and practical support",
        "offered water": "showing care and attending to comfort",
        "maintained eye contact": "demonstrating engagement and presence",
        "maintained supportive eye contact": "showing empathy through gaze",
        "nodded empathetically": "validating emotions non-verbally",
        "nodded supportively": "showing understanding and encouragement",
        "leaned forward": "expressing interest and engagement",
        "gentle hand on shoulder": "providing physical comfort (if appropriate)",
        "adjusted body language": "mirroring or showing openness",
    }
    
    context_parts = []
    for action in therapist_actions:
        action_lower = action.lower()
        meaning = action_meanings.get(action_lower, "showing attentiveness")
        context_parts.append(f"- {action} ({meaning})")
    
    return "\n".join([
        "\nTherapist non-verbal actions:",
        *context_parts,
        "\nThe patient should acknowledge these actions appropriately based on their current emotional state."
    ])


def generate_patient_response(
    session: Session,
    student_message: str,
    context: dict,
    action_context: str
) -> str:
    """
    Generate patient response using AI, considering therapist actions.
    """
    
    # Build the prompt
    prompt = f"""
You are simulating a patient with {session.diagnosis}.

Current emotional state: {session.emotional_state}
Rapport level: {session.rapport_level}/10
Session minute: {context.get('elapsed_time_minutes', 0)}

Student therapist said: "{student_message}"

{action_context}

Generate a realistic patient response that:
1. Responds to the verbal message
2. Acknowledges the non-verbal actions appropriately
3. Reflects the current emotional state
4. Adjusts based on rapport level

Patient response:"""

    response = call_ai_model(prompt, session)
    
    return response
```

---

## 📊 Rapport Adjustment Logic

### Example: How Actions Affect Rapport

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
    
    # Define action impacts by emotional state
    action_impacts = {
        "anxious": {
            "offered tissue": 1,
            "maintained eye contact": 1,
            "nodded supportively": 1,
            "gentle hand on shoulder": 2,  # High impact when anxious
        },
        "angry": {
            "maintained eye contact": 0,    # Neutral when angry
            "leaned forward": -1,           # Might feel confrontational
            "nodded supportively": 1,
            "gentle hand on shoulder": -1,  # Unwanted touch
        },
        "sad": {
            "offered tissue": 2,            # Very helpful when crying
            "nodded empathetically": 2,
            "gentle hand on shoulder": 1,
            "maintained eye contact": 1,
        },
        "guarded": {
            "maintained eye contact": -1,   # Might feel intrusive
            "gentle hand on shoulder": -2,  # Definitely unwanted
            "nodded supportively": 1,
            "offered water": 1,             # Non-threatening
        },
    }
    
    state_impacts = action_impacts.get(emotional_state, {})
    
    for action in therapist_actions:
        action_lower = action.lower()
        # Find matching action (partial match)
        for key, impact in state_impacts.items():
            if key in action_lower:
                adjustment += impact
                break
    
    # Cap adjustment at +3/-2 per turn
    return max(-2, min(3, adjustment))
```

---

## 💡 Example Scenarios

### Scenario 1: Offering Tissue When Patient Is Crying

**Request:**
```json
{
  "session_id": "abc123",
  "student_message": "I can see this is very difficult for you.",
  "therapist_actions": ["offered tissue"],
  "context": {
    "message_number": 8,
    "elapsed_time_minutes": 12
  }
}
```

**Expected Response:**
```json
{
  "patient_response": "Thank you... [takes tissue and wipes eyes] I'm sorry, I didn't mean to get so emotional. It's just... talking about it brings it all back.",
  "non_verbal_cues": [
    "accepts tissue gratefully",
    "wipes tears",
    "looks down briefly then back at therapist"
  ],
  "somatic_sensations": [
    "chest tightness easing slightly",
    "breathing becoming steadier"
  ],
  "behavioral_observations": [
    "Eye Contact: maintains more steady eye contact after accepting tissue",
    "Vocal Quality: voice still shaky but calmer",
    "Body Language: posture slightly more relaxed"
  ],
  "emotional_state": "sad_but_opening_up",
  "rapport_level": 7,
  "success": true
}
```

### Scenario 2: Maintaining Eye Contact With Anxious Patient

**Request:**
```json
{
  "session_id": "abc123",
  "student_message": "Can you tell me more about what happened?",
  "therapist_actions": ["maintained supportive eye contact", "nodded empathetically"],
  "context": {
    "message_number": 5,
    "elapsed_time_minutes": 8
  }
}
```

**Expected Response:**
```json
{
  "patient_response": "Well... [pauses, noticing therapist's attentive gaze] it started about three months ago. I appreciate you listening... it helps to feel like someone actually cares.",
  "non_verbal_cues": [
    "initially avoids eye contact",
    "gradually makes brief eye contact",
    "fingers stop fidgeting"
  ],
  "somatic_sensations": [
    "slight decrease in heart rate",
    "shoulders relax a bit"
  ],
  "behavioral_observations": [
    "Eye Contact: increasing but still intermittent",
    "Vocal Quality: less trembling",
    "Hand Movement: reduced nervous fidgeting"
  ],
  "emotional_state": "anxious_but_trusting",
  "rapport_level": 6,
  "success": true
}
```

### Scenario 3: Inappropriate Touch With Guarded Patient

**Request:**
```json
{
  "session_id": "abc123",
  "student_message": "It's okay, you're safe here.",
  "therapist_actions": ["gentle hand on shoulder"],
  "context": {
    "message_number": 3,
    "elapsed_time_minutes": 5
  }
}
```

**Expected Response:**
```json
{
  "patient_response": "[pulls away slightly] I... I don't like being touched. Please don't do that.",
  "non_verbal_cues": [
    "tenses up visibly",
    "leans away from therapist",
    "crosses arms protectively"
  ],
  "somatic_sensations": [
    "heart rate increases",
    "muscles tense",
    "feeling of discomfort"
  ],
  "behavioral_observations": [
    "Eye Contact: breaks eye contact completely",
    "Body Language: defensive posture",
    "Proximity: creates physical distance"
  ],
  "emotional_state": "guarded_uncomfortable",
  "rapport_level": 3,
  "success": true
}
```

---

## 🎯 Best Practices

### 1. Context-Aware Responses

Always consider:
- **Current emotional state** - Same action has different impacts
- **Rapport level** - Low rapport makes actions feel intrusive
- **Cultural factors** - Some patients might not be comfortable with touch
- **Diagnosis** - PTSD patients might react differently to touch

### 2. Realistic Reactions

Patients should:
- **Acknowledge** the action when significant (offered tissue)
- **Show subtle changes** for smaller actions (maintained eye contact)
- **React negatively** if action is inappropriate for the context
- **Build rapport** gradually, not immediately

### 3. Teaching Opportunities

Use reactions to teach students:
- **Positive feedback** - Patient opens up more after appropriate action
- **Gentle correction** - Patient pulls away if action inappropriate
- **Cultural awareness** - Mention cultural preferences when relevant

---

## 🧪 Testing Recommendations

### Test Cases

1. **No Actions (Baseline)**
   ```python
   therapist_actions = []
   # Response should be normal, rapport unchanged
   ```

2. **Appropriate Comforting Action**
   ```python
   therapist_actions = ["offered tissue"]
   emotional_state = "sad"
   # Rapport should increase, patient should acknowledge
   ```

3. **Multiple Actions**
   ```python
   therapist_actions = ["maintained eye contact", "nodded supportively", "leaned forward"]
   # Patient should feel engaged and listened to
   ```

4. **Inappropriate Action**
   ```python
   therapist_actions = ["gentle hand on shoulder"]
   emotional_state = "guarded"
   rapport_level = 2
   # Patient should pull away, rapport might decrease
   ```

5. **Empty Array (Default)**
   ```python
   therapist_actions = []
   # Should work exactly as before (backward compatible)
   ```

---

## 📦 Backward Compatibility

**Important:** This field is **optional** for backward compatibility.

```python
# Old requests (without therapist_actions) still work
{
  "session_id": "abc123",
  "student_message": "Hello",
  "context": {}
  # No therapist_actions field
}

# New requests can include it
{
  "session_id": "abc123",
  "student_message": "Hello",
  "context": {},
  "therapist_actions": ["maintained eye contact"]
}
```

Your implementation should handle both:

```python
therapist_actions = request.therapist_actions or []
if therapist_actions:
    # Include in AI context
    action_context = build_action_context(therapist_actions)
else:
    # Normal processing without actions
    action_context = ""
```

---

## 📋 Implementation Checklist

- [ ] Update Pydantic model to accept `therapist_actions`
- [ ] Make field optional with default empty list
- [ ] Build action context for AI prompts
- [ ] Implement rapport adjustment logic
- [ ] Update patient response generation
- [ ] Test with various emotional states
- [ ] Test backward compatibility (no actions)
- [ ] Test with inappropriate actions
- [ ] Document action meanings
- [ ] Deploy to development environment
- [ ] Coordinate with NestJS backend team for testing

---

## 🤝 Coordination with Backend Team

### Integration Testing

Once both backends are updated:

```bash
# NestJS sends:
POST /api/v1/internship/patient/message
{
  "session_id": "test123",
  "student_message": "I can see you're upset.",
  "therapist_actions": ["offered tissue"],
  "context": {"message_number": 5, "elapsed_time_minutes": 10}
}

# Python should return:
{
  "patient_response": "[takes tissue] Thank you...",
  "non_verbal_cues": ["accepts tissue"],
  "emotional_state": "sad_but_trusting",
  "rapport_level": 6,
  "success": true
}
```

---

## 📞 Questions?

**Contact:**
- NestJS Backend Team: [Contact Info]
- Integration Support: [Contact Info]

**Documentation:**
- NestJS Side: `SESSION_MANAGEMENT_IMPLEMENTATION.md`
- API Reference: `API_QUICK_REFERENCE_SESSION_MANAGEMENT.md`

---

**Last Updated:** December 31, 2025  
**Version:** 1.0  
**Status:** Ready for Implementation

