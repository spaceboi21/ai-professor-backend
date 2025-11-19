# 🧪 Internship API Testing Guide

## 📋 Overview
This guide will help you test all internship endpoints in the correct order. Follow this workflow to ensure all dependencies are met.

---

## 🔧 Setup

### 1. Import Collection
Import `internship-api.postman_collection.json` into Postman.

### 2. Verify Variables
Go to collection variables (click on collection → Variables tab):
- ✅ `baseUrl`: `http://localhost:5000`
- ✅ `token`: Your admin JWT token (already set)
- ✅ `studentToken`: Leave empty for now (set after student login)
- ✅ `lastInternshipId`: Auto-populated (leave empty)
- ✅ `lastCaseId`: Auto-populated (leave empty)
- ✅ `lastSessionId`: Auto-populated (leave empty)
- ✅ `lastFeedbackId`: Auto-populated (leave empty)

---

## 🚀 Testing Workflow

### Phase 1: Create Internship Structure

#### Step 1: Create an Internship
**Request:** `1. Create new internship`

**What it does:** Creates a new internship with all metadata.

**Expected Response:**
```json
{
  "message": "Internship created successfully",
  "data": {
    "_id": "673f1234567890abcdef1234",
    "title": "Clinical Psychology Internship - Year 3",
    "description": "...",
    "year": 3,
    "published": false,
    "sequence": null,
    "duration": 40,
    ...
  }
}
```

**✅ Action Required:**
1. Copy the `_id` from the response
2. Go to collection Variables
3. Set `lastInternshipId` = the copied `_id`
4. **Save** the collection variables

---

#### Step 2: Create Case for Internship
**Request:** `1. Create case for internship`

**Important:** 
- Replace `:internshipId` in the URL with `{{lastInternshipId}}`
- The body already includes `"sequence": 1` ✅

**Expected Response:**
```json
{
  "message": "Case created successfully",
  "data": {
    "_id": "673f5678901234abcdef5678",
    "internship_id": "673f1234567890abcdef1234",
    "title": "Major Depressive Disorder - Initial Assessment",
    "sequence": 1,
    ...
  }
}
```

**🔍 Check Logs:** 
The backend should log:
```
Case created in tenant DB: 673f5678901234abcdef5678
Ingesting case into Python/Pinecone: 673f5678901234abcdef5678
Case ingested successfully into Python/Pinecone
```

**✅ Action Required:**
1. Copy the `_id` from the response
2. Set `lastCaseId` = the copied `_id` in collection variables
3. **Save**

---

#### Step 3: Create Second Case (Optional)
**Request:** `1. Create case for internship`

**Modify the body:**
```json
{
  "title": "Anxiety Disorder - Case Study",
  "description": "Patient with generalized anxiety disorder",
  "sequence": 2,
  ...
}
```

**Important:** Change `sequence` to `2` for the second case!

---

### Phase 2: Query Internships & Cases

#### Step 4: Get All Internships
**Request:** `2. Get all internships`

**Query Parameters:**
- `page=1`
- `limit=10`
- `year=3` (optional filter)
- `published=true` (optional - currently disabled)

**Should return:** All internships for your school.

---

#### Step 5: Get Internship by ID
**Request:** `3. Get internship by ID`

**URL:** Replace `:id` with `{{lastInternshipId}}`

**Should return:** Full details of the internship.

---

#### Step 6: Get All Cases for Internship
**Request:** `2. Get all cases for internship`

**URL:** Replace `:internshipId` with `{{lastInternshipId}}`

**Should return:** Array of cases ordered by sequence.

---

#### Step 7: Get Single Case
**Request:** `3. Get case by ID`

**URL:** Replace `:caseId` with `{{lastCaseId}}`

**Should return:** Full case details including content, documents, prompts.

---

### Phase 3: Update Operations

#### Step 8: Update Internship
**Request:** `4. Update internship`

**URL:** Replace `:id` with `{{lastInternshipId}}`

**Body example:**
```json
{
  "title": "Advanced Clinical Psychology Internship - Updated",
  "duration": 50
}
```

**Should return:** Updated internship data.

---

#### Step 9: Update Case
**Request:** `4. Update case`

**URL:** Replace `:caseId` with `{{lastCaseId}}`

**Body example:**
```json
{
  "title": "Major Depressive Disorder - Updated",
  "description": "Updated description"
}
```

**🔍 Check Logs:** Should re-ingest into Python/Pinecone.

---

#### Step 10: Update Case Sequence
**Request:** `6. Update case sequence`

**URL:** Replace `:caseId` with `{{lastCaseId}}`

**Body (FIXED):**
```json
{
  "item_id": "{{lastCaseId}}",
  "sequence": 2
}
```

**Important:** 
- `sequence` must be ≥ 1
- Must be a valid number

**Error Fix:** If you get "sequence must not be less than one", ensure:
1. `sequence` is a number (not string)
2. `sequence` is ≥ 1

---

### Phase 4: Publish Internship

#### Step 11: Publish Internship
**Request:** `6. Publish internship`

**Body:**
```json
{
  "internship_id": "{{lastInternshipId}}",
  "action": "PUBLISH"
}
```

**Expected Response:**
```json
{
  "message": "Internship published successfully",
  "data": {
    "published": true,
    "published_at": "2025-11-16T12:34:56.789Z"
  }
}
```

**Error Fix:** If you get "non trouvé" (not found):
1. Verify `{{lastInternshipId}}` is set correctly
2. The internship must exist and not be deleted
3. Check you're using the correct school's internship

---

#### Step 12: Unpublish Internship (Optional)
**Request:** `7. Unpublish internship`

**Body:**
```json
{
  "internship_id": "{{lastInternshipId}}",
  "action": "UNPUBLISH"
}
```

---

### Phase 5: Student Session Testing

> **⚠️ Important:** Student endpoints require a student JWT token!

#### Step 13: Login as Student
Use the main API collection to login as a student:
```bash
POST http://localhost:5000/api/auth/login
{
  "email": "student@example.com",
  "password": "studentPassword"
}
```

**✅ Action Required:**
1. Copy the `access_token` from response
2. Set `studentToken` = the token in collection variables
3. **Save**

---

#### Step 14: Create Session (Start Patient Interview)
**Request:** `1. Create session (Start patient interview)`

**Body:**
```json
{
  "internship_id": "{{lastInternshipId}}",
  "case_id": "{{lastCaseId}}",
  "session_type": "patient_interview"
}
```

**Session Types:**
- `patient_interview` - Talk to AI patient
- `therapist_consultation` - Get guidance from AI therapist
- `supervisor_feedback` - Receive supervisor tips

**Expected Response:**
```json
{
  "message": "Session created successfully",
  "data": {
    "_id": "673f9012345678abcdef9012",
    "student_id": "...",
    "case_id": "{{lastCaseId}}",
    "session_type": "patient_interview",
    "status": "ACTIVE",
    "messages": []
  }
}
```

**✅ Action Required:**
1. Copy the `_id` from response
2. Set `lastSessionId` = the copied `_id`
3. **Save**

---

#### Step 15: Send Messages to AI Patient
**Request:** `2. Send message in session`

**URL:** Replace `:sessionId` with `{{lastSessionId}}`

**Body:**
```json
{
  "message": "Hello John, thank you for coming in today. Can you tell me what brings you here?"
}
```

**Expected Response:**
```json
{
  "message": "Message sent successfully",
  "data": {
    "ai_response": "I've been feeling really down lately...",
    "realtime_tip": null,
    "conversation_history": [...]
  }
}
```

**Try multiple messages:**
```json
{ "message": "How long have you been feeling this way?" }
{ "message": "Can you describe your symptoms in more detail?" }
{ "message": "Have you had thoughts of harming yourself?" }
```

---

#### Step 16: Get Session Details
**Request:** `3. Get session details`

**URL:** Replace `:sessionId` with `{{lastSessionId}}`

**Should return:** Full conversation history and real-time tips.

---

#### Step 17: Complete Session
**Request:** `4. Complete session`

**URL:** Replace `:sessionId` with `{{lastSessionId}}`

**Body:** `{}` (empty)

**Expected Response:**
```json
{
  "message": "Session completed successfully",
  "data": {
    "status": "COMPLETED",
    "ended_at": "2025-11-16T13:00:00Z"
  }
}
```

---

### Phase 6: Feedback Management

#### Step 18: Generate AI Feedback
**Request:** `1. Generate AI feedback (Student)`

**URL:** Replace `:sessionId` with `{{lastSessionId}}`

**Body:** `{}` (empty)

**Expected Response:**
```json
{
  "message": "Feedback generated successfully",
  "data": {
    "_id": "673fa123456789abcdefa123",
    "student_id": "...",
    "case_id": "{{lastCaseId}}",
    "session_id": "{{lastSessionId}}",
    "feedback_type": "auto_generated",
    "status": "PENDING_VALIDATION",
    "ai_feedback": {
      "overall_score": 85,
      "strengths": [...],
      "areas_for_improvement": [...]
    }
  }
}
```

**✅ Action Required:**
1. Copy the `_id` from response
2. Set `lastFeedbackId` = the copied `_id`
3. **Save**

---

#### Step 19: Get Pending Feedback (Professor)
**Request:** `2. Get pending feedback (Professor)`

**Auth:** Use `{{token}}` (admin token)

**Should return:** All feedback awaiting validation.

---

#### Step 20: Validate Feedback (Professor)
**Request:** `3. Validate feedback (Professor)`

**URL:** Replace `:feedbackId` with `{{lastFeedbackId}}`

**Auth:** Use `{{token}}` (admin token)

**Body:**
```json
{
  "is_approved": true,
  "professor_comments": "Excellent work on building rapport with the patient. Your empathy and active listening skills were evident throughout the interview.",
  "edited_score": 88
}
```

**Expected Response:**
```json
{
  "message": "Feedback validated successfully",
  "data": {
    "status": "VALIDATED",
    "professor_feedback": {
      "is_approved": true,
      "professor_comments": "...",
      "edited_score": 88
    }
  }
}
```

---

#### Step 21: Update Feedback (Professor)
**Request:** `4. Update feedback (Professor)`

**URL:** Replace `:feedbackId` with `{{lastFeedbackId}}`

**Body:**
```json
{
  "professor_comments": "Updated: Continue working on differential diagnosis.",
  "edited_score": 90
}
```

---

#### Step 22: Get Feedback for Case
**Request:** `5. Get feedback for case`

**URL:** Replace `:caseId` with `{{lastCaseId}}`

**Should return:** All feedback for this case.

**Note:** Students only see VALIDATED feedback!

---

### Phase 7: Student Logbook

#### Step 23: Add Logbook Entry
**Request:** `2. Add logbook entry`

**URL:** Replace `:internshipId` with `{{lastInternshipId}}`

**Auth:** Use `{{studentToken}}`

**Body:** (already populated in collection)
```json
{
  "case_id": "{{lastCaseId}}",
  "case_title": "Major Depressive Disorder - Initial Assessment",
  "completed_date": "2025-11-16T10:30:00Z",
  "session_summary": "...",
  "skills_practiced": [...],
  "feedback_summary": "...",
  "self_reflection": "...",
  "attachments": [...]
}
```

---

#### Step 24: Get Student Logbook
**Request:** `1. Get student logbook`

**URL:** Replace `:internshipId` with `{{lastInternshipId}}`

**Auth:** Use `{{studentToken}}`

**Should return:** All logbook entries for this student.

---

#### Step 25: Generate Logbook Summary
**Request:** `3. Generate logbook summary`

**URL:** Replace `:internshipId` with `{{lastInternshipId}}`

**Auth:** Use `{{studentToken}}`

**Body:** `{}` (empty)

**Should return:** Overall progress summary generated by AI.

---

### Phase 8: Cleanup (Optional)

#### Step 26: Delete Case
**Request:** `5. Delete case`

**URL:** Replace `:caseId` with `{{lastCaseId}}`

**🔍 Check Logs:** Should delete from Python/Pinecone before MongoDB.

---

#### Step 27: Delete Internship
**Request:** `5. Delete internship (soft delete)`

**URL:** Replace `:id` with `{{lastInternshipId}}`

---

## 🐛 Common Errors & Fixes

### Error: "sequence must not be less than one"
**Cause:** Missing or invalid `sequence` field

**Fix:**
1. Ensure `sequence` is present in body
2. Ensure `sequence` is a number ≥ 1
3. For Create Case: `"sequence": 1`
4. For Update Sequence: `"sequence": 2`

---

### Error: "non trouvé" or "not found"
**Cause:** Invalid or missing ID

**Fix:**
1. Verify the variable is set: `{{lastInternshipId}}`, `{{lastCaseId}}`, etc.
2. Check the ID exists in your database
3. Ensure you're using the correct school's data
4. Check the item hasn't been soft-deleted

---

### Error: "sequence must be a number conforming to the specified constraints"
**Cause:** `sequence` is a string instead of number

**Fix:**
```json
// ❌ Wrong
{ "sequence": "1" }

// ✅ Correct
{ "sequence": 1 }
```

---

### Error: 401 Unauthorized
**Cause:** Invalid or expired JWT token

**Fix:**
1. Re-login to get fresh token
2. Update `{{token}}` or `{{studentToken}}` variable
3. Ensure you're using the correct token (student vs admin)

---

### Error: "Internship not found" when publishing
**Cause:** Wrong internship ID or already deleted

**Fix:**
1. Verify `{{lastInternshipId}}` is correct
2. Run "Get internship by ID" first to confirm it exists
3. Ensure `deleted_at` is `null`

---

## 📊 Testing Checklist

### Admin Workflows
- ✅ Create internship
- ✅ Get all internships (with filters)
- ✅ Get internship by ID
- ✅ Update internship
- ✅ Create case (with proper sequence)
- ✅ Get all cases
- ✅ Get case by ID
- ✅ Update case (check re-ingestion logs)
- ✅ Update case sequence
- ✅ Publish internship
- ✅ Unpublish internship
- ✅ Get pending feedback
- ✅ Validate feedback
- ✅ Update feedback
- ✅ Delete case (check Python deletion logs)
- ✅ Delete internship

### Student Workflows
- ✅ Create session (patient interview)
- ✅ Send multiple messages
- ✅ Get session details
- ✅ Complete session
- ✅ Generate AI feedback
- ✅ Get feedback for case
- ✅ Add logbook entry
- ✅ Get logbook
- ✅ Generate logbook summary

---

## 🎯 Success Indicators

### ✅ Case Ingestion Working
Check backend logs for:
```
[InternshipCaseService] Case created in tenant DB: 673f...
[PythonInternshipService] Ingesting case into Python/Pinecone: 673f...
[PythonInternshipService] Case ingested successfully: 673f... - Chunks: 15, Vectors: 15
```

### ✅ Case Deletion Working
Check backend logs for:
```
[PythonInternshipService] Deleting case from Python/Pinecone: 673f...
[PythonInternshipService] Case deleted successfully from Python: 673f...
[InternshipCaseService] Case deleted successfully
```

### ✅ Case Update/Re-ingestion Working
Check backend logs for:
```
[InternshipCaseService] Case updated successfully: 673f...
[PythonInternshipService] Ingesting case into Python/Pinecone: 673f...
[PythonInternshipService] Case re-ingested successfully into Python/Pinecone
```

---

## 🚨 Important Notes

1. **Sequence Numbering**: Cases must have unique sequence numbers within an internship
2. **Order Matters**: Student sessions require completed internship + case setup
3. **Token Types**: Admin endpoints use `{{token}}`, student endpoints use `{{studentToken}}`
4. **Variables**: Always update collection variables after creating resources
5. **Logs**: Monitor backend logs to verify Python integration
6. **Validation**: Feedback must be validated by professor before students can see details

---

## 📝 Quick Start Commands

```bash
# 1. Create internship → Copy _id
# 2. Set lastInternshipId variable
# 3. Create case → Copy _id
# 4. Set lastCaseId variable
# 5. Publish internship
# 6. Login as student → Set studentToken
# 7. Create session → Copy _id
# 8. Set lastSessionId variable
# 9. Send messages
# 10. Complete session
# 11. Generate feedback → Copy _id
# 12. Set lastFeedbackId variable
# 13. Validate as professor
# 14. Add logbook entry
```

---

## 🎉 Complete Test Run

If all 27 steps complete successfully, your internship feature is **fully functional**! 🚀

For any issues, check:
1. Backend logs (`npm run dev` output)
2. MongoDB data (`use <school_name>; db.internships.find()`)
3. Python service logs (if integrated)
4. Postman console for request/response details

---

**Happy Testing!** 🧪✨

