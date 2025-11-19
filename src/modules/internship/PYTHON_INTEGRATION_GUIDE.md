# Python AI Backend Integration Guide for Internship Feature

## 🎯 **Overview**

This document provides complete specifications for implementing the AI functionality required by the internship feature. Copy this guide to your Python/AI backend team or use it with Cursor AI to implement the endpoints.

---

## 🏗️ **Architecture**

```
┌─────────────────┐         HTTP REST API          ┌──────────────────┐
│   NestJS        │ ◄──────────────────────────────► │ Python FastAPI   │
│   Backend       │   JSON Request/Response         │ AI Backend       │
│   (Port 3000)   │                                 │ (Port 8000)      │
└─────────────────┘                                 └──────────────────┘
        │                                                     │
        │                                                     │
        ▼                                                     ▼
  ┌──────────┐                                         ┌──────────┐
  │ MongoDB  │                                         │  OpenAI  │
  │ (Tenant) │                                         │   API    │
  └──────────┘                                         └──────────┘
```

---

## 📦 **Python Implementation Prompt for Cursor AI**

Copy the following prompt to Cursor AI or your Python development environment:

```
Create a FastAPI application for the Internship AI Backend with the following specifications:

### Project Structure:
```
python-internship-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI application entry
│   ├── config.py                  # Configuration and env vars
│   ├── models/
│   │   ├── __init__.py
│   │   ├── requests.py            # Pydantic request models
│   │   └── responses.py           # Pydantic response models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── patient_simulator.py  # Patient simulation logic
│   │   ├── therapist_simulator.py # Therapist simulation logic
│   │   ├── supervisor_service.py  # Supervisor feedback logic
│   │   └── session_manager.py     # Session state management
│   ├── routers/
│   │   ├── __init__.py
│   │   └── internship.py          # All internship endpoints
│   └── utils/
│       ├── __init__.py
│       ├── openai_client.py       # OpenAI API wrapper
│       └── prompts.py             # GPT system prompts
├── requirements.txt
├── .env.example
└── README.md
```

### Requirements (requirements.txt):
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
openai==1.3.5
python-dotenv==1.0.0
redis==5.0.1
httpx==0.25.1
```

### Environment Variables (.env.example):
```
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4-turbo-preview
REDIS_HOST=localhost
REDIS_PORT=6379
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=INFO
```

### Implementation Requirements:

1. **Patient Simulation** (patient_simulator.py):
   - Initialize patient persona based on case profile
   - Generate contextually appropriate responses
   - Track emotional state throughout conversation
   - Identify clinical signals in student questions
   - Maintain consistent patient behavior

2. **Therapist Simulation** (therapist_simulator.py):
   - Provide pedagogical guidance
   - Analyze student's approach from patient session
   - Suggest appropriate therapeutic techniques
   - Give constructive feedback on student performance

3. **Supervisor Service** (supervisor_service.py):
   - Real-time tips during student-patient interaction
   - Comprehensive feedback generation after session
   - Rubric-based evaluation
   - Identify strengths and improvement areas

4. **Session Manager** (session_manager.py):
   - Store session state in Redis
   - Track conversation history
   - Handle session timeouts (24 hours)
   - Clean up expired sessions

5. **API Endpoints** - Implement all endpoints specified below.

Use OpenAI's GPT-4 for generating responses. Structure prompts to maintain context and persona consistency.
```

---

## 🔌 **API Endpoint Specifications**

### Base URL: `http://localhost:8000/api/v1`

---

### 1. Patient Initialization

**Endpoint**: `POST /internship/patient/initialize`

**Purpose**: Initialize a new patient simulation session with specific characteristics

**Request Body**:
```json
{
  "case_id": "507f1f77bcf86cd799439011",
  "patient_profile": {
    "age": 35,
    "gender": "female",
    "name": "Maria",
    "condition": "generalized_anxiety_disorder",
    "severity": "moderate",
    "duration": "6 months",
    "triggers": ["work stress", "family concerns"],
    "symptoms": [
      "persistent worry",
      "difficulty concentrating",
      "sleep disturbances",
      "muscle tension"
    ],
    "history": "No previous mental health treatment",
    "medication": "None currently",
    "social_context": "Married, works full-time, two children"
  },
  "scenario_config": {
    "scenario_type": "initial_clinical_interview",
    "difficulty_level": "intermediate",
    "interview_focus": "assessment_and_diagnosis",
    "patient_openness": "moderately_forthcoming"
  }
}
```

**Response**:
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "initial_context": {
    "patient_state": "anxious_but_cooperative",
    "opening_statement": "Hi, doctor. I'm here because I've been feeling really overwhelmed lately...",
    "key_symptoms_to_explore": [
      "anxiety_symptoms",
      "impact_on_daily_life",
      "onset_and_duration",
      "coping_mechanisms"
    ],
    "suggested_approach": "Start with open-ended questions, build rapport first"
  },
  "success": true,
  "message": "Patient simulation initialized successfully"
}
```

**Implementation Logic**:
```python
# Pseudocode for patient initialization
def initialize_patient_session(request):
    # 1. Generate unique session_id
    session_id = generate_uuid()
    
    # 2. Create system prompt for GPT
    system_prompt = f"""
    You are simulating a patient with the following characteristics:
    - Age: {request.patient_profile.age}
    - Condition: {request.patient_profile.condition}
    - Severity: {request.patient_profile.severity}
    
    Respond as this patient would in a clinical interview.
    Be realistic, show appropriate emotional responses.
    Reveal information gradually as rapport is built.
    Include non-verbal cues in parentheses like (appears nervous).
    """
    
    # 3. Store session context in Redis
    redis_client.set(
        f"session:{session_id}",
        json.dumps({
            "case_id": request.case_id,
            "patient_profile": request.patient_profile,
            "scenario_config": request.scenario_config,
            "system_prompt": system_prompt,
            "conversation_history": [],
            "emotional_state": "anxious",
            "created_at": datetime.now()
        }),
        ex=86400  # 24 hour expiry
    )
    
    # 4. Generate opening statement
    opening_response = await call_openai(
        system_prompt=system_prompt,
        user_prompt="Generate an opening statement for this patient entering the clinical interview"
    )
    
    return response
```

---

### 2. Patient Message Exchange

**Endpoint**: `POST /internship/patient/message`

**Purpose**: Send student message to patient and get response

**Request Body**:
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "student_message": "Can you tell me more about when you first started feeling this way?",
  "context": {
    "message_number": 5,
    "elapsed_time_minutes": 12
  }
}
```

**Response**:
```json
{
  "patient_response": "Well, it really started about six months ago. I got a promotion at work, which should have been great, but suddenly I felt this overwhelming pressure. (fidgets with hands) I started worrying about everything - whether I could handle the new responsibilities, if my colleagues thought I deserved it...",
  "clinical_signals": [
    {
      "signal_type": "anxiety_trigger",
      "description": "Work-related stressor identified as onset trigger",
      "severity": "moderate",
      "dsm5_relevance": "Potential anxiety disorder criterion"
    },
    {
      "signal_type": "cognitive_distortion",
      "description": "Catastrophic thinking patterns evident",
      "severity": "moderate",
      "dsm5_relevance": "Supports GAD diagnosis"
    }
  ],
  "emotional_state": "anxious_but_trusting",
  "non_verbal_cues": ["fidgeting", "increased speech rate when discussing work"],
  "rapport_level": 7,
  "success": true,
  "message": "Response generated successfully"
}
```

**Implementation Logic**:
```python
async def send_patient_message(request):
    # 1. Retrieve session from Redis
    session_data = redis_client.get(f"session:{request.session_id}")
    if not session_data:
        raise HTTPException(404, "Session not found or expired")
    
    session = json.loads(session_data)
    
    # 2. Add student message to conversation history
    session['conversation_history'].append({
        "role": "student",
        "content": request.student_message,
        "timestamp": datetime.now()
    })
    
    # 3. Analyze student's question quality
    question_analysis = await analyze_question_quality(request.student_message)
    
    # 4. Generate patient response using GPT
    patient_response = await generate_patient_response(
        system_prompt=session['system_prompt'],
        conversation_history=session['conversation_history'],
        patient_profile=session['patient_profile'],
        question_quality=question_analysis
    )
    
    # 5. Extract clinical signals from response
    clinical_signals = extract_clinical_signals(
        patient_response,
        session['patient_profile']
    )
    
    # 6. Update emotional state
    session['emotional_state'] = determine_emotional_state(
        session['conversation_history'],
        rapport_building=question_analysis.get('rapport_building', False)
    )
    
    # 7. Save updated session
    session['conversation_history'].append({
        "role": "patient",
        "content": patient_response,
        "timestamp": datetime.now()
    })
    redis_client.set(f"session:{request.session_id}", json.dumps(session), ex=86400)
    
    return response
```

---

### 3. Therapist Initialization

**Endpoint**: `POST /internship/therapist/initialize`

**Purpose**: Initialize therapist consultation session

**Request Body**:
```json
{
  "case_id": "507f1f77bcf86cd799439011",
  "session_history": [
    {
      "role": "student",
      "content": "Can you tell me about your symptoms?",
      "timestamp": "2025-11-16T10:00:00Z"
    },
    {
      "role": "patient",
      "content": "I've been feeling very anxious...",
      "timestamp": "2025-11-16T10:00:30Z"
    }
  ],
  "student_context": {
    "student_id": "507f1f77bcf86cd799439012",
    "year_level": 3,
    "previous_cases_completed": 5
  }
}
```

**Response**:
```json
{
  "session_id": "660e8400-e29b-41d4-a716-446655440001",
  "initial_context": {
    "session_analysis": "The student demonstrated good rapport building and used open-ended questions effectively",
    "areas_identified": ["diagnostic_formulation", "systematic_assessment"],
    "therapist_greeting": "Hello! I've reviewed your patient interview. You did well with building rapport. Let's discuss your approach and explore some areas where we can refine your technique."
  },
  "success": true,
  "message": "Therapist session initialized successfully"
}
```

---

### 4. Therapist Message Exchange

**Endpoint**: `POST /internship/therapist/message`

**Purpose**: Student asks therapist for guidance

**Request Body**:
```json
{
  "session_id": "660e8400-e29b-41d4-a716-446655440001",
  "student_message": "I think the patient has GAD, but I'm not sure if I explored all the DSM-5 criteria thoroughly. What should I have asked?"
}
```

**Response**:
```json
{
  "therapist_response": "Good diagnostic thinking! You're on the right track with GAD. Let's review the DSM-5 criteria you covered and identify what might need more exploration. You effectively asked about worry and anxiety symptoms. However, consider these key criteria you could explore more systematically: 1) Duration - you confirmed 6 months, excellent. 2) Difficulty controlling worry - you touched on this but could probe deeper. 3) Associated symptoms - you identified sleep issues and muscle tension, but haven't fully explored restlessness, fatigue, difficulty concentrating, or irritability. Would you like to discuss how to ask about these systematically?",
  "pedagogical_insights": [
    "Student correctly identified probable diagnosis",
    "Good initial assessment of primary symptoms",
    "Shows self-awareness of assessment gaps",
    "Could benefit from more structured approach"
  ],
  "suggested_techniques": [
    "Use DSM-5 checklist approach for systematic assessment",
    "Practice the 'SIGECAPS' mnemonic adapted for anxiety",
    "Consider standardized screening tools like GAD-7"
  ],
  "recommended_resources": [
    "DSM-5 Anxiety Disorders section",
    "Video: Structured Clinical Interview for DSM-5",
    "Article: Systematic Assessment in Primary Care"
  ],
  "success": true,
  "message": "Therapist response generated"
}
```

---

### 5. Supervisor Real-time Tips

**Endpoint**: `POST /internship/supervisor/realtime-tips`

**Purpose**: Provide real-time guidance during student-patient interaction

**Request Body**:
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "current_message": "What medications are you currently taking?",
  "conversation_history": [
    {"role": "student", "content": "Hello, how are you feeling today?"},
    {"role": "patient", "content": "Not great, I've been very anxious..."},
    {"role": "student", "content": "What medications are you currently taking?"}
  ]
}
```

**Response**:
```json
{
  "should_show_tip": true,
  "tip_content": "💡 Consider building more rapport before asking about medications. Try exploring the patient's main concerns and symptoms first to establish trust.",
  "tip_category": "rapport_building",
  "priority": "medium",
  "reasoning": "The student jumped to medication questions too quickly without fully exploring the presenting problem",
  "alternative_approach": "Try: 'Tell me more about what brings you in today. What has been most concerning for you?'",
  "success": true,
  "message": "Tip generated"
}
```

**Implementation Logic**:
```python
async def get_realtime_tip(request):
    # Tip triggers:
    # 1. Premature closed-ended questions
    # 2. Missing key assessment areas
    # 3. Poor rapport building
    # 4. Inappropriate question sequencing
    # 5. Missing empathic responses
    
    # Analyze last 3-5 exchanges
    recent_exchanges = request.conversation_history[-6:]
    
    # Check for common mistakes
    if is_premature_medication_question(request.current_message, len(recent_exchanges)):
        return {"should_show_tip": True, "tip_content": "..."}
    
    if lacks_empathic_response(recent_exchanges):
        return {"should_show_tip": True, "tip_content": "..."}
    
    # Use GPT to analyze if needed
    if needs_advanced_analysis(request):
        tip = await generate_contextual_tip(request)
        return tip
    
    return {"should_show_tip": False}
```

---

### 6. Generate Comprehensive Feedback

**Endpoint**: `POST /internship/supervisor/generate-feedback`

**Purpose**: Generate comprehensive AI feedback after session completion

**Request Body**:
```json
{
  "case_id": "507f1f77bcf86cd799439011",
  "session_data": {
    "messages": [...],  // Full conversation transcript
    "session_type": "patient_interview",
    "started_at": "2025-11-16T10:00:00Z",
    "ended_at": "2025-11-16T10:45:00Z",
    "session_duration_minutes": 45
  },
  "evaluation_criteria": [
    {"criterion": "Clinical Assessment", "weight": 30},
    {"criterion": "Communication Skills", "weight": 25},
    {"criterion": "Diagnostic Reasoning", "weight": 25},
    {"criterion": "Empathy and Rapport", "weight": 20}
  ]
}
```

**Response**:
```json
{
  "feedback": {
    "overall_score": 82,
    "strengths": [
      "Excellent rapport building - patient appeared comfortable and open",
      "Good use of open-ended questions throughout the interview",
      "Demonstrated active listening with appropriate reflections",
      "Identified key anxiety symptoms systematically",
      "Maintained professional boundaries while being empathic"
    ],
    "areas_for_improvement": [
      "Could explore duration and frequency of symptoms more thoroughly",
      "Consider using standardized assessment tools (GAD-7)",
      "Family psychiatric history was not fully explored",
      "Could benefit from more structured mental status examination",
      "Differential diagnosis could be broader (consider MDD, adjustment disorder)"
    ],
    "technical_assessment": {
      "score": 78,
      "details": "Demonstrated good basic clinical interview skills. Covered most major areas but lacked systematic approach to DSM-5 criteria. Mental status examination was incomplete.",
      "specific_feedback": {
        "dsm5_criteria_coverage": "5/6 major criteria explored",
        "risk_assessment": "Basic suicide assessment done, good",
        "cultural_competence": "Acknowledged cultural factors appropriately"
      }
    },
    "communication_assessment": {
      "score": 88,
      "details": "Outstanding communication skills. Used appropriate pacing, allowed patient time to respond, demonstrated empathy consistently.",
      "specific_feedback": {
        "active_listening": "Excellent - reflected patient's concerns accurately",
        "open_ended_questions": "Strong use throughout (12/15 questions were open-ended)",
        "non_verbal_awareness": "Good attention to patient's body language",
        "empathy": "Consistently demonstrated throughout interview"
      }
    },
    "clinical_reasoning": {
      "score": 80,
      "details": "Solid diagnostic thinking. Correctly identified GAD as primary diagnosis but differential could be broader.",
      "specific_feedback": {
        "hypothesis_generation": "Appropriate primary hypothesis",
        "data_gathering": "Good but could be more systematic",
        "differential_diagnosis": "Limited - only considered GAD",
        "treatment_planning": "Not assessed in this session"
      }
    },
    "generated_at": "2025-11-16T10:50:00Z"
  },
  "score": 82,
  "percentile_rank": 75,
  "comparison": "Above average compared to peers at same training level",
  "success": true,
  "message": "Feedback generated successfully"
}
```

**Implementation Logic**:
```python
async def generate_feedback(request):
    # 1. Analyze full conversation transcript
    transcript_analysis = await analyze_transcript(
        messages=request.session_data['messages'],
        evaluation_criteria=request.evaluation_criteria
    )
    
    # 2. Evaluate against each criterion
    scores = {}
    detailed_feedback = {}
    
    for criterion in request.evaluation_criteria:
        score, feedback = await evaluate_criterion(
            criterion=criterion['criterion'],
            transcript=request.session_data['messages'],
            weight=criterion['weight']
        )
        scores[criterion['criterion']] = score
        detailed_feedback[criterion['criterion']] = feedback
    
    # 3. Calculate weighted overall score
    overall_score = calculate_weighted_score(scores, request.evaluation_criteria)
    
    # 4. Generate strengths and improvements using GPT
    strengths, improvements = await generate_qualitative_feedback(
        transcript_analysis=transcript_analysis,
        scores=scores,
        overall_score=overall_score
    )
    
    # 5. Compile comprehensive feedback
    feedback = compile_feedback(
        overall_score=overall_score,
        strengths=strengths,
        areas_for_improvement=improvements,
        detailed_assessments=detailed_feedback
    )
    
    return response
```

---

### 7. Analyze Complete Session

**Endpoint**: `POST /internship/analyze-session`

**Purpose**: Perform deep analysis of completed session

**Request Body**:
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_transcript": [...],
  "evaluation_rubric": [...]
}
```

**Response**:
```json
{
  "overall_performance": {
    "score": 82,
    "level": "proficient",
    "description": "Demonstrates solid clinical interview skills with room for growth in systematic assessment"
  },
  "skill_breakdown": {
    "rapport_building": 90,
    "systematic_assessment": 75,
    "clinical_reasoning": 80,
    "communication": 88,
    "empathy": 85,
    "professionalism": 90
  },
  "conversation_flow_analysis": {
    "total_exchanges": 24,
    "student_questions": 15,
    "patient_responses": 15,
    "open_ended_ratio": 0.80,
    "empathic_responses": 8,
    "average_response_time": "reasonable",
    "conversation_structure": "good_flow_with_minor_jumps"
  },
  "recommendations": [
    "Practice using structured diagnostic interviews (SCID)",
    "Review DSM-5 criteria checklists for anxiety disorders",
    "Consider shadowing experienced clinicians",
    "Practice with more complex cases involving comorbidities"
  ],
  "learning_objectives_met": [
    "Demonstrate basic clinical interviewing skills",
    "Build therapeutic rapport",
    "Identify primary presenting problem"
  ],
  "learning_objectives_partial": [
    "Conduct systematic diagnostic assessment"
  ],
  "learning_objectives_not_met": [
    "Formulate comprehensive differential diagnosis"
  ],
  "success": true,
  "message": "Session analysis completed"
}
```

---

### 8. End Session

**Endpoint**: `POST /internship/session/end`

**Purpose**: Clean up session resources

**Request Body**:
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_type": "patient_interview"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Session ended and resources cleaned up",
  "session_duration_minutes": 45,
  "total_messages": 24
}
```

---

## 🧠 **GPT Prompt Engineering Guidelines**

### Patient Simulation Prompts

```python
PATIENT_SYSTEM_PROMPT = """
You are simulating a patient in a clinical psychology training scenario.

Patient Profile:
- Name: {name}
- Age: {age}
- Condition: {condition}
- Severity: {severity}
- Emotional State: {emotional_state}

Behavior Guidelines:
1. Respond as this patient would in a real clinical interview
2. Show realistic emotional responses appropriate to the condition
3. Reveal information gradually, not all at once
4. Be more forthcoming as rapport improves
5. Include non-verbal cues in parentheses: (avoids eye contact), (fidgets), (sighs)
6. Stay consistent with the patient profile
7. Don't use clinical terminology - speak as a patient would
8. Show vulnerability when appropriate
9. Ask clarifying questions sometimes
10. Express concerns realistically

Current Emotional State: {current_state}
Rapport Level: {rapport_level}/10

Remember: You are NOT a therapist. You are the patient being interviewed.
"""

PATIENT_RESPONSE_EXAMPLES = """
Good Examples:
- "I guess it started a few months ago... (pauses) It's hard to explain."
- "Some days are better than others. Yesterday I couldn't even get out of bed."
- "My family says I've changed, but I don't know... maybe they're right."

Bad Examples:
- "I have generalized anxiety disorder with panic attacks." (too clinical)
- "My symptoms started exactly 6 months and 3 days ago." (too precise)
- "I exhibit all DSM-5 criteria for major depressive disorder." (unrealistic)
"""
```

### Therapist Simulation Prompts

```python
THERAPIST_SYSTEM_PROMPT = """
You are an experienced clinical supervisor providing pedagogical guidance to a psychology student.

Your Role:
1. Review the student's clinical interview performance
2. Provide constructive, educational feedback
3. Teach clinical reasoning and assessment skills
4. Encourage critical thinking
5. Suggest evidence-based techniques
6. Be supportive but honest about areas needing improvement

Teaching Approach:
- Use the Socratic method - ask questions to guide learning
- Provide specific examples from their interview
- Reference relevant DSM-5 criteria or clinical guidelines
- Suggest practical improvements
- Acknowledge what they did well before critiquing
- End with actionable next steps

Student Context:
- Year Level: {year_level}
- Previous Cases: {cases_completed}
- Current Performance Level: {performance_level}
"""
```

### Supervisor Prompts

```python
SUPERVISOR_TIP_PROMPT = """
Analyze the student's current question/approach and determine if a real-time tip would be helpful.

Provide a tip if:
- The student is making a common clinical interviewing mistake
- The approach could significantly improve with a small adjustment
- The student is missing important clinical information
- Better rapport building is needed
- The question sequence is inappropriate

DO NOT provide a tip if:
- The student is doing well
- The mistake is minor and doesn't significantly impact the interview
- It would interrupt good flow
- The student is likely to self-correct

Current Context:
Student Message: {current_message}
Recent Conversation: {recent_exchanges}
Patient Emotional State: {patient_state}
Interview Phase: {phase} (opening/middle/closing)

Respond with:
1. should_show_tip: true/false
2. If true, provide a brief, actionable tip (max 2 sentences)
3. Tip category (rapport_building, assessment, empathy, technique)
"""
```

---

## 📊 **Testing Strategy**

### Unit Tests
```python
# test_patient_simulator.py
async def test_patient_initialization():
    request = PatientInitializeRequest(...)
    response = await initialize_patient_session(request)
    assert response.success == True
    assert response.session_id is not None

async def test_patient_response_consistency():
    # Ensure patient stays in character
    ...

async def test_clinical_signal_extraction():
    # Verify clinical signals are identified correctly
    ...
```

### Integration Tests
```python
# test_integration.py
async def test_full_session_flow():
    # 1. Initialize patient
    # 2. Exchange several messages
    # 3. Generate feedback
    # 4. Verify feedback quality
    ...
```

---

## 🚀 **Deployment**

### Docker Configuration
```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'
services:
  python-backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
    
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

---

## ✅ **Implementation Checklist**

- [ ] Set up FastAPI project structure
- [ ] Install dependencies (FastAPI, OpenAI, Redis)
- [ ] Create Pydantic models for requests/responses
- [ ] Implement patient simulator service
- [ ] Implement therapist simulator service
- [ ] Implement supervisor feedback service
- [ ] Set up Redis for session management
- [ ] Create all API endpoints
- [ ] Write comprehensive prompts for GPT
- [ ] Implement error handling
- [ ] Add logging
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Test with NestJS backend
- [ ] Deploy with Docker
- [ ] Monitor performance and costs

---

## 📞 **Support & Questions**

For implementation questions:
1. Review the NestJS backend code for expected request/response formats
2. Test endpoints with Postman before integrating
3. Monitor OpenAI API costs and rate limits
4. Use Redis for session state to ensure scalability

**Good Luck with Implementation! 🚀**

