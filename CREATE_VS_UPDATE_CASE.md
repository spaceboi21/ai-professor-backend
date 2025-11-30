# 🚨 CREATE vs UPDATE Case - Important Difference!

## The Issue You Just Hit

You tried to use the UPDATE payload to CREATE a case, which is why you got:
```
"title should not be empty"
"description should not be empty"
"sequence must be a number"
```

These fields are **required** when CREATING a case, but optional when UPDATING.

---

## Required Fields for CREATE vs UPDATE

### 📝 CREATE Case (POST `/api/internship/:internshipId/cases`)

**Required Fields:**
- ✅ `title` - string
- ✅ `description` - string  
- ✅ `sequence` - number (1, 2, 3...)
- ⚠️ `patient_simulation_config` - **HIGHLY RECOMMENDED** (or you'll get 422 error later)

**Optional but Recommended:**
- `case_content` - HTML content with case details
- `supervisor_prompts` - array of strings
- `therapist_prompts` - array of strings
- `evaluation_criteria` - array of objects
- `case_documents` - array of document objects

### ✏️ UPDATE Case (PATCH `/api/internship/cases/:caseId`)

**All Fields Optional:**
- Update only what you want to change
- Don't need to send everything

---

## ✅ Complete CREATE Case Payload

### Option 1: Use Postman (UPDATED!)

I just updated your Postman collection's "Create case" request with the complete payload including `patient_simulation_config`.

Go to: **"School Admin - Case Management" → "1. Create case for internship"**

Make sure to:
1. Set `:internshipId` to `{{lastInternshipId}}` or your actual internship ID
2. The body is now complete with all required fields
3. Click Send!

### Option 2: Copy Complete Payload

See: `CREATE_CASE_COMPLETE_PAYLOAD.json` - This has EVERYTHING you need!

Or copy this shortened version:

```json
{
  "title": "Major Depressive Disorder - Initial Assessment",
  "description": "Patient John, 35-year-old male, presents with 6-week history of depressed mood, anhedonia, and psychomotor retardation.",
  "sequence": 1,
  "case_content": "<h2>Patient Presentation</h2><p><strong>Chief Complaint:</strong> \"I just don't feel like myself anymore.\"</p>",
  "patient_simulation_config": {
    "patient_profile": {
      "name": "John Smith",
      "age": 35,
      "gender": "male",
      "condition": "Major Depressive Disorder",
      "severity": "moderate",
      "duration": "6 weeks",
      "triggers": ["job loss", "financial stress", "loss of daily routine"],
      "symptoms": [
        "depressed mood",
        "anhedonia",
        "early morning awakening",
        "decreased appetite with 15-pound weight loss",
        "psychomotor retardation",
        "difficulty concentrating",
        "feelings of worthlessness",
        "passive death wish"
      ],
      "history": "One previous depressive episode 5 years ago, successfully treated with sertraline 100mg for 8 months",
      "medication": "Previously on sertraline 100mg (discontinued after 8 months of remission)",
      "social_context": "Married for 8 years, supportive wife. Two children ages 6 and 4. Recently unemployed (2 months)",
      "chief_complaint": "I just don't feel like myself anymore",
      "presentation_style": "withdrawn, soft-spoken, psychomotor retardation"
    },
    "scenario_type": "initial_clinical_interview",
    "difficulty_level": "intermediate",
    "interview_focus": "assessment_and_diagnosis",
    "patient_openness": "moderately_forthcoming"
  },
  "supervisor_prompts": [
    "Monitor student's empathy and rapport-building skills",
    "Check if student assesses suicide risk appropriately"
  ],
  "therapist_prompts": [
    "Guide student on building therapeutic alliance",
    "Teach CBT techniques for depression"
  ],
  "evaluation_criteria": [
    {"criterion": "Clinical Reasoning", "weight": 30},
    {"criterion": "Communication Skills & Empathy", "weight": 25},
    {"criterion": "Mental Status Exam Technique", "weight": 20},
    {"criterion": "Risk Assessment", "weight": 15},
    {"criterion": "Treatment Planning", "weight": 10}
  ]
}
```

---

## 🔧 If You Want to Fix Your EXISTING Case

If you already have a case (ID: `6928cda5c7388a6a9dcb2b78`) and just want to fix it:

### Use UPDATE endpoint:

```
PATCH {{baseUrl}}/api/internship/cases/6928cda5c7388a6a9dcb2b78
```

### Body (only what you want to update):

```json
{
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
      "chief_complaint": "I just don't feel like myself anymore",
      "presentation_style": "withdrawn, soft-spoken"
    },
    "scenario_type": "initial_clinical_interview",
    "difficulty_level": "intermediate",
    "interview_focus": "assessment_and_diagnosis",
    "patient_openness": "moderately_forthcoming"
  }
}
```

---

## 📋 Quick Decision Guide

### I want to CREATE a new case:
→ Use: **POST `/api/internship/:internshipId/cases`**
→ Payload: See `CREATE_CASE_COMPLETE_PAYLOAD.json`
→ Required: title, description, sequence, patient_simulation_config

### I want to FIX my existing case (6928cda5c7388a6a9dcb2b78):
→ Use: **PATCH `/api/internship/cases/6928cda5c7388a6a9dcb2b78`**
→ Payload: See `FIX_CASE_PAYLOAD.json` or `UPDATE_CASE_NOW.md`
→ Required: Only the fields you want to change

---

## ✅ Summary of Your Situation

1. **Problem**: Trying to use UPDATE payload for CREATE endpoint
2. **Solution 1**: Use complete CREATE payload (includes title, description, sequence)
3. **Solution 2**: Fix your existing case using UPDATE endpoint (only patient_simulation_config)

### Recommendation:

**Option A** - Fix existing case (faster):
```bash
PATCH /api/internship/cases/6928cda5c7388a6a9dcb2b78
# Use payload from FIX_CASE_PAYLOAD.json
```

**Option B** - Create new case (clean start):
```bash
POST /api/internship/{{lastInternshipId}}/cases
# Use payload from CREATE_CASE_COMPLETE_PAYLOAD.json
```

---

## 🎯 Next Steps

1. **Decide**: Fix existing case OR create new case?
2. **Choose endpoint**: UPDATE (PATCH) OR CREATE (POST)?
3. **Use correct payload**: 
   - CREATE → `CREATE_CASE_COMPLETE_PAYLOAD.json`
   - UPDATE → `FIX_CASE_PAYLOAD.json`
4. **Send request** in Postman
5. **Copy the new case ID** (if creating)
6. **Try creating session** again

---

**Both Postman requests are now updated with correct examples!** 🎉

**Last Updated**: November 2025

