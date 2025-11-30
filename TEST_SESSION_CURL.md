# 🧪 Test Session Creation - Curl Commands

## Quick Test Command

### 1. Create Session (Main Test)

```bash
curl -X POST http://localhost:5000/api/internship/sessions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDI4NDY2YjhiYzNmMjA4YTE2ZmMwMiIsImVtYWlsIjoidGFsaGFqdW5rQGdtYWlsLmNvbSIsInJvbGVfaWQiOiI2ODYzY2VjNzExYmU5MDE2YjdjY2I4MDIiLCJzY2hvb2xfaWQiOiI2OTAxNGE1OGI4YmMzZjIwOGExNmY1MDYiLCJyb2xlX25hbWUiOiJTVFVERU5UIiwidG9rZW5fdHlwZSI6ImFjY2VzcyIsImlhdCI6MTczMjc0ODgxNywiZXhwIjoxNzM1MzQwODE3fQ.0fxOKnvPvD6WXZ4H5QFWKNlbxeFGVRbS15XEzD6YvXA" \
  -H "Content-Type: application/json" \
  -d '{
    "internship_id": "692757d8d57d3a3ab0e6cd1d",
    "case_id": "6928f32a48f9778d2a0ca575",
    "session_type": "patient_interview"
  }'
```

### 2. Expected Success Response

```json
{
  "message": "Session created successfully",
  "data": {
    "_id": "session_id_here",
    "student_id": "69028466b8bc3f208a16fc02",
    "case_id": "6928f32a48f9778d2a0ca575",
    "internship_id": "692757d8d57d3a3ab0e6cd1d",
    "session_type": "patient_interview",
    "status": "ACTIVE",
    "python_session_id": "uuid-from-python-api",
    "created_at": "2025-11-28T00:56:28.000Z"
  }
}
```

### 3. If You Get 422 Error (Case Missing Fields)

If you still get:
```json
{
  "message": "Python API validation failed: body.scenario_config.interview_focus - Field required"
}
```

**Fix the case first:**
```bash
curl -X PATCH http://localhost:5000/api/internship/cases/6928f32a48f9778d2a0ca575 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_simulation_config": {
      "patient_profile": {
        "name": "John Smith",
        "age": 35,
        "gender": "male",
        "condition": "Major Depressive Disorder",
        "severity": "moderate",
        "duration": "6 weeks",
        "triggers": ["job loss", "financial stress"],
        "symptoms": ["depressed mood", "anhedonia", "sleep disturbances"],
        "history": "One previous depressive episode 5 years ago",
        "medication": "Previously on sertraline 100mg",
        "social_context": "Married, two children, recently unemployed",
        "chief_complaint": "I just don'\''t feel like myself anymore",
        "presentation_style": "withdrawn, soft-spoken"
      },
      "scenario_type": "initial_clinical_interview",
      "difficulty_level": "intermediate",
      "interview_focus": "assessment_and_diagnosis",
      "patient_openness": "moderately_forthcoming"
    }
  }'
```

### 4. Get Session Details (After Creation)

Replace `SESSION_ID` with the `_id` from the create response:

```bash
curl -X GET http://localhost:5000/api/internship/sessions/SESSION_ID \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDI4NDY2YjhiYzNmMjA4YTE2ZmMwMiIsImVtYWlsIjoidGFsaGFqdW5rQGdtYWlsLmNvbSIsInJvbGVfaWQiOiI2ODYzY2VjNzExYmU5MDE2YjdjY2I4MDIiLCJzY2hvb2xfaWQiOiI2OTAxNGE1OGI4YmMzZjIwOGExNmY1MDYiLCJyb2xlX25hbWUiOiJTVFVERU5UIiwidG9rZW5fdHlwZSI6ImFjY2VzcyIsImlhdCI6MTczMjc0ODgxNywiZXhwIjoxNzM1MzQwODE3fQ.0fxOKnvPvD6WXZ4H5QFWKNlbxeFGVRbS15XEzD6YvXA"
```

### 5. Send Message to AI Patient (After Session Created)

```bash
curl -X POST http://localhost:5000/api/internship/sessions/SESSION_ID/message \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDI4NDY2YjhiYzNmMjA4YTE2ZmMwMiIsImVtYWlsIjoidGFsaGFqdW5rQGdtYWlsLmNvbSIsInJvbGVfaWQiOiI2ODYzY2VjNzExYmU5MDE2YjdjY2I4MDIiLCJzY2hvb2xfaWQiOiI2OTAxNGE1OGI4YmMzZjIwOGExNmY1MDYiLCJyb2xlX25hbWUiOiJTVFVERU5UIiwidG9rZW5fdHlwZSI6ImFjY2VzcyIsImlhdCI6MTczMjc0ODgxNywiZXhwIjoxNzM1MzQwODE3fQ.0fxOKnvPvD6WXZ4H5QFWKNlbxeFGVRbS15XEzD6YvXA" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello John, thank you for coming in today. Can you tell me what brings you here?"
  }'
```

---

## Automated Test Script

I've also created a test script that does all of this automatically:

```bash
chmod +x /opt/ai/ai-professor-backend/TEST_SESSION_CREATION.sh
/opt/ai/ai-professor-backend/TEST_SESSION_CREATION.sh
```

This script will:
1. ✅ Test session creation
2. ✅ Show the response
3. ✅ Extract session ID if successful
4. ✅ Test getting session details
5. ✅ Show helpful error messages if something fails

---

## What to Look For

### ✅ Success Indicators:
- HTTP Status: `200` or `201`
- Response contains `python_session_id` (UUID from Python API)
- Response contains `status: "ACTIVE"`
- No error messages about missing fields

### ❌ Failure Indicators:
- HTTP Status: `422` - Case missing fields (update case first)
- HTTP Status: `400` - Bad request (check case_id and internship_id)
- HTTP Status: `401` - Token expired (get new student token)
- HTTP Status: `404` - Case or internship not found

---

## Quick Reference

**Your Test Values:**
- Base URL: `http://localhost:5000`
- Internship ID: `692757d8d57d3a3ab0e6cd1d`
- Case ID: `6928f32a48f9778d2a0ca575`
- Student Token: (included in commands above)

**What the Fix Does:**
- ✅ Extracts only scenario config fields (no nested patient_profile)
- ✅ Includes `interview_focus` and `patient_openness` in scenario_config
- ✅ Validates all required fields before calling Python API
- ✅ Provides clear error messages if fields are missing

---

**Run the test and let me know the result!** 🚀

