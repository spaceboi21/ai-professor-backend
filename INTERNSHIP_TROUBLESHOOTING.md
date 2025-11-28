# Internship API Troubleshooting Guide

## 🚨 Common Error: 404 on `/api/v1/internship/patient/initialize`

### Problem
When creating a new session (POST `/api/internship/sessions`), you get this error:
```
Error: Python API POST call failed (/internship/patient/initialize): Request failed with status code 404
```

### Root Cause
The **Python AI Backend** is not running or doesn't have the required endpoints implemented.

The NestJS backend expects a Python service running at:
- **Base URL**: `http://localhost:8000/api/v1`
- **Required Endpoint**: `POST /internship/patient/initialize`

### Solution Options

#### Option 1: Check if Python Backend is Running
```bash
# Check if Python service is running on port 8000
curl http://localhost:8000/api/v1/health

# Or check the process
ps aux | grep python | grep 8000
```

#### Option 2: Verify Environment Variables
Check your `.env` file:
```bash
# Add or verify this in your .env file
PYTHON_API_URL=http://localhost:8000/api/v1
```

#### Option 3: Start the Python Backend
If the Python backend is not implemented yet, you need to implement it following the guide:
- See: `/src/modules/internship/PYTHON_INTEGRATION_GUIDE.md`

The Python backend needs to implement these endpoints:
1. `POST /api/v1/internship/patient/initialize` - Initialize patient session
2. `POST /api/v1/internship/patient/message` - Send message to patient
3. `POST /api/v1/internship/therapist/initialize` - Initialize therapist session
4. `POST /api/v1/internship/therapist/message` - Send message to therapist
5. `POST /api/v1/internship/supervisor/realtime-tips` - Get real-time tips
6. `POST /api/v1/internship/supervisor/generate-feedback` - Generate feedback

#### Option 4: Temporary Mock Server (For Testing Only)
You can create a simple mock server to test the NestJS endpoints without the full Python implementation:

```python
# mock_python_api.py
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
from uuid import uuid4

app = FastAPI()

class PatientInitRequest(BaseModel):
    case_id: str
    patient_profile: dict
    scenario_config: dict

@app.post("/api/v1/internship/patient/initialize")
async def initialize_patient(request: PatientInitRequest):
    return {
        "session_id": str(uuid4()),
        "initial_context": {
            "patient_state": "Mock patient initialized",
            "key_symptoms": ["mock_symptom_1", "mock_symptom_2"]
        },
        "success": True
    }

@app.post("/api/v1/internship/patient/message")
async def patient_message(request: dict):
    return {
        "patient_response": "This is a mock response from the patient. [Python API not fully implemented]",
        "clinical_signals": [
            {
                "signal_type": "engagement",
                "description": "Mock clinical signal",
                "severity": "low"
            }
        ],
        "emotional_state": "neutral",
        "success": True
    }

@app.post("/api/v1/internship/therapist/initialize")
async def initialize_therapist(request: dict):
    return {
        "session_id": str(uuid4()),
        "initial_context": {
            "therapist_state": "Mock therapist initialized"
        },
        "success": True
    }

@app.post("/api/v1/internship/therapist/message")
async def therapist_message(request: dict):
    return {
        "therapist_response": "This is a mock response from the therapist. [Python API not fully implemented]",
        "teaching_points": ["Mock teaching point"],
        "success": True
    }

@app.post("/api/v1/internship/supervisor/realtime-tips")
async def realtime_tips(request: dict):
    return {
        "tips": [
            {
                "tip_type": "communication",
                "message": "Mock supervisor tip",
                "priority": "medium"
            }
        ],
        "success": True
    }

@app.post("/api/v1/internship/supervisor/generate-feedback")
async def generate_feedback(request: dict):
    return {
        "overall_score": 85,
        "rubric_scores": [
            {"criterion": "Clinical Reasoning", "score": 28, "max_score": 30, "weight": 30},
            {"criterion": "Communication Skills", "score": 22, "max_score": 25, "weight": 25}
        ],
        "strengths": ["Mock strength 1", "Mock strength 2"],
        "improvement_areas": ["Mock improvement area"],
        "detailed_feedback": {
            "clinical_reasoning": "Mock feedback",
            "communication_skills": "Mock feedback"
        },
        "success": True
    }

@app.get("/api/v1/health")
async def health():
    return {"status": "healthy", "service": "Mock Python Internship API"}

if __name__ == "__main__":
    print("Starting Mock Python API on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

To run the mock server:
```bash
# Install FastAPI and Uvicorn
pip install fastapi uvicorn

# Run the mock server
python mock_python_api.py
```

---

## 📋 What Works Without Python Backend

You can still test these endpoints without the Python backend:

### ✅ Internship Management (All working)
- POST `/api/internship` - Create internship
- GET `/api/internship` - List all internships
- GET `/api/internship/:id` - Get single internship
- PATCH `/api/internship/:id` - Update internship
- DELETE `/api/internship/:id` - Delete internship
- POST `/api/internship/toggle-visibility` - Publish/Unpublish

### ✅ Case Management (All working)
- POST `/api/internship/:internshipId/cases` - Create case
- GET `/api/internship/:internshipId/cases` - List cases
- GET `/api/internship/cases/:caseId` - Get case by ID
- PATCH `/api/internship/cases/:caseId` - Update case
- DELETE `/api/internship/cases/:caseId` - Delete case
- PATCH `/api/internship/cases/:caseId/sequence` - Update sequence

### ✅ Logbook (All working)
- GET `/api/internship/:internshipId/logbook` - Get logbook
- POST `/api/internship/:internshipId/logbook` - Add logbook entry
- PATCH `/api/internship/:internshipId/logbook/summary` - Update summary

---

## ❌ What Requires Python Backend

These endpoints will fail with 404 errors until the Python backend is implemented:

### ❌ Session Management
- POST `/api/internship/sessions` - **FAILS** (needs Python patient/therapist initialize)
- POST `/api/internship/sessions/:sessionId/message` - **FAILS** (needs Python message handling)
- GET `/api/internship/sessions/:sessionId` - Works but returns empty messages
- POST `/api/internship/sessions/:sessionId/complete` - Works but limited

### ❌ Feedback Generation
- POST `/api/internship/sessions/:sessionId/feedback` - **FAILS** (needs Python feedback generation)

### ✅ Feedback Management (Viewing works)
- GET `/api/internship/feedback/pending` - Works
- POST `/api/internship/feedback/:feedbackId/validate` - Works
- PATCH `/api/internship/feedback/:feedbackId` - Works
- GET `/api/internship/cases/:caseId/feedback` - Works

---

## 🧪 Testing Strategy

### Phase 1: Test Without Python Backend
1. Create internships ✅
2. Create cases ✅
3. Publish internships ✅
4. Manage logbooks ✅

### Phase 2: Test With Mock Python Backend
1. Start mock server (see above)
2. Create sessions ✅
3. Send messages ✅
4. Generate feedback ✅

### Phase 3: Test With Full Python Backend
1. Implement full Python backend following `PYTHON_INTEGRATION_GUIDE.md`
2. Test real AI responses
3. Test advanced features

---

## 🔍 Debugging Tips

### Check Python API Connection
```bash
# Test Python API health
curl http://localhost:8000/api/v1/health

# Expected response:
# {"status": "healthy", "service": "Python Internship API"}
```

### Check NestJS Logs
```bash
# Watch the logs for Python API errors
tail -f /path/to/nestjs/logs

# Look for errors like:
# [PythonInternshipService] Python API POST call failed (/internship/patient/initialize): Request failed with status code 404
```

### Test Python Endpoint Directly
```bash
# Test patient initialization endpoint directly
curl -X POST http://localhost:8000/api/v1/internship/patient/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "case_id": "test123",
    "patient_profile": {"age": 35, "condition": "test"},
    "scenario_config": {"scenario_type": "test"}
  }'
```

---

## 📞 Next Steps

1. **Decide on approach**: Mock server (quick testing) or full implementation (production)
2. **Start Python backend**: Follow the guide in `PYTHON_INTEGRATION_GUIDE.md`
3. **Test integration**: Use Postman collection to test all endpoints
4. **Verify all features**: Ensure session management and feedback work

---

## 📚 Related Documentation
- `/src/modules/internship/PYTHON_INTEGRATION_GUIDE.md` - Full Python implementation guide
- `/src/modules/internship/README.md` - Overall internship feature documentation
- `/src/modules/internship/IMPLEMENTATION_COMPLETE.md` - What's already done

---

**Last Updated**: November 2025

