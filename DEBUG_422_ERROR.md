# Debugging 422 Error - Patient Initialize Endpoint

## 🔴 Error: Request failed with status code 422

### What Does 422 Mean?
A 422 "Unprocessable Entity" error means:
- ✅ The Python backend is running
- ✅ The endpoint exists
- ❌ **The data sent doesn't match what the Python API expects**

This is a **validation error**, not a connection error.

---

## 🔍 Diagnosing the Issue

### Step 1: Check Your Case Configuration

Run this query in MongoDB to check if your case has proper `patient_simulation_config`:

```javascript
// Connect to your tenant database
use aiProfessorTenant_69014a58b8bc3f208a16f506

// Find your case and check patient_simulation_config
db.internship_cases.findOne(
  { _id: ObjectId("6928cda5c7388a6a9dcb2b78") },
  { 
    title: 1,
    patient_simulation_config: 1
  }
)
```

### Expected Structure:
```json
{
  "_id": "6928cda5c7388a6a9dcb2b78",
  "title": "Case Title",
  "patient_simulation_config": {
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
        "sleep disturbances"
      ],
      "history": "No previous mental health treatment",
      "medication": "None currently",
      "social_context": "Married, works full-time, two children"
    },
    "scenario_type": "initial_clinical_interview",
    "difficulty_level": "intermediate",
    "interview_focus": "assessment_and_diagnosis",
    "patient_openness": "moderately_forthcoming"
  }
}
```

### Common Issues:

❌ **Missing patient_simulation_config entirely**
```json
{
  "_id": "6928cda5c7388a6a9dcb2b78",
  "title": "Case Title",
  "patient_simulation_config": null  // ← PROBLEM!
}
```

❌ **Empty patient_profile**
```json
{
  "patient_simulation_config": {
    "patient_profile": {},  // ← PROBLEM! Python expects specific fields
    "scenario_type": "clinical_interview"
  }
}
```

❌ **Missing required fields**
```json
{
  "patient_simulation_config": {
    "patient_profile": {
      "age": 35
      // Missing: condition, gender, etc.
    }
  }
}
```

---

## 🔧 Quick Fix: Update Your Case

### Option 1: Update via Postman (Recommended)

Use the "Update case" endpoint in your Postman collection:

```http
PATCH {{baseUrl}}/api/internship/cases/6928cda5c7388a6a9dcb2b78
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "patient_simulation_config": {
    "patient_profile": {
      "age": 35,
      "gender": "female",
      "name": "John Smith",
      "condition": "major_depressive_disorder",
      "severity": "moderate",
      "duration": "6 weeks",
      "triggers": ["job loss", "financial stress"],
      "symptoms": [
        "depressed mood",
        "anhedonia",
        "sleep disturbances",
        "decreased appetite",
        "psychomotor retardation",
        "difficulty concentrating",
        "feelings of worthlessness"
      ],
      "history": "One previous depressive episode 5 years ago",
      "medication": "Previously on sertraline 100mg",
      "social_context": "Married for 8 years, two children, recently unemployed"
    },
    "scenario_type": "initial_clinical_interview",
    "difficulty_level": "intermediate",
    "interview_focus": "assessment_and_diagnosis",
    "patient_openness": "moderately_forthcoming"
  }
}
```

### Option 2: Update via MongoDB Directly

```javascript
db.internship_cases.updateOne(
  { _id: ObjectId("6928cda5c7388a6a9dcb2b78") },
  {
    $set: {
      "patient_simulation_config": {
        "patient_profile": {
          "age": 35,
          "gender": "female",
          "name": "John Smith",
          "condition": "major_depressive_disorder",
          "severity": "moderate",
          "duration": "6 weeks",
          "triggers": ["job loss", "financial stress"],
          "symptoms": [
            "depressed mood",
            "anhedonia",
            "sleep disturbances",
            "decreased appetite"
          ],
          "history": "One previous depressive episode 5 years ago",
          "medication": "Previously on sertraline 100mg",
          "social_context": "Married, two children, recently unemployed"
        },
        "scenario_type": "initial_clinical_interview",
        "difficulty_level": "intermediate",
        "interview_focus": "assessment_and_diagnosis",
        "patient_openness": "moderately_forthcoming"
      }
    }
  }
)
```

---

## 📋 Required Fields Checklist

### patient_profile (Required)
- ✅ `age` (number)
- ✅ `gender` (string: "male", "female", "non-binary", etc.)
- ✅ `name` (string)
- ✅ `condition` (string: the psychological condition)
- ✅ `severity` (string: "mild", "moderate", "severe")
- ⚠️ `duration` (string, optional but recommended)
- ⚠️ `triggers` (array, optional)
- ⚠️ `symptoms` (array, optional but recommended)
- ⚠️ `history` (string, optional)
- ⚠️ `medication` (string, optional)
- ⚠️ `social_context` (string, optional)

### scenario_config (Required)
- ✅ `scenario_type` (string: "initial_clinical_interview", etc.)
- ✅ `difficulty_level` (string: "beginner", "intermediate", "advanced")
- ⚠️ `interview_focus` (string, optional)
- ⚠️ `patient_openness` (string, optional)

---

## 🐛 Viewing Detailed Error Information

After the fix I just applied, you'll now see detailed validation errors in your NestJS logs:

```
[PythonInternshipService] Python API validation error (422) on /internship/patient/initialize:
  Fields: patient_profile.age - field required, patient_profile.condition - field required
  Payload sent: {
    "case_id": "6928cda5c7388a6a9dcb2b78",
    "patient_profile": {},
    "scenario_config": {}
  }
```

This will tell you exactly which fields are missing!

---

## ✅ Testing the Fix

After updating your case with proper `patient_simulation_config`:

1. **Restart your NestJS server** (to load the new error handling code):
   ```bash
   # If using PM2/systemctl, restart the service
   # The service should auto-restart, but if not:
   sudo systemctl restart baby-ai.service
   ```

2. **Try creating a session again** using Postman:
   ```http
   POST {{baseUrl}}/api/internship/sessions
   Authorization: Bearer {{studentToken}}
   
   {
     "internship_id": "{{lastInternshipId}}",
     "case_id": "6928cda5c7388a6a9dcb2b78",
     "session_type": "patient_interview"
   }
   ```

3. **Expected Results**:
   - ✅ Success: Session created with Python session_id
   - ❌ Still 422: Check the new detailed error message to see which fields are still missing
   - ❌ New error: "Case is missing patient_simulation_config" - The case config is still null/empty

---

## 🔗 Communication Between APIs

Here's what happens when you create a session:

```
Student (Postman)
     ↓ POST /api/internship/sessions
NestJS Backend
     ↓ Validates case exists
     ↓ Gets patient_simulation_config from case
     ↓ POST https://api-ai.psysphereai.com/api/v1/internship/patient/initialize
     ↓ Sends: { case_id, patient_profile, scenario_config }
Python Backend
     ↓ Validates required fields (422 if missing)
     ↓ Initializes AI patient session
     ↓ Returns: { session_id, initial_context, success }
NestJS Backend
     ↓ Saves session to MongoDB
     ↓ Returns session to student
Student (Postman)
```

The 422 error occurs at the **Python Backend validation** step.

---

## 🎯 Prevention for Future Cases

When creating new cases via Postman, **always include** `patient_simulation_config`:

```json
{
  "title": "Case Title",
  "description": "Case description",
  "sequence": 1,
  "patient_simulation_config": {
    "patient_profile": {
      "age": 35,
      "gender": "female",
      "name": "Patient Name",
      "condition": "condition_name",
      "severity": "moderate",
      "symptoms": ["symptom1", "symptom2"]
    },
    "scenario_type": "initial_clinical_interview",
    "difficulty_level": "intermediate"
  }
}
```

See the Postman collection "Create case for internship" request for a complete example.

---

## 📞 Still Having Issues?

If you're still getting 422 errors after:
1. ✅ Updating the case with proper config
2. ✅ Restarting the NestJS server
3. ✅ Checking the detailed error logs

Then the issue might be with the **Python API validation rules**. Contact your Python backend team with:
- The complete payload being sent (from the logs)
- The detailed validation error message
- The expected vs actual field formats

---

**Last Updated**: November 2025

