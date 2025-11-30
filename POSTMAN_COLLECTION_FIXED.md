# ✅ Postman Collection Fixed!

## What Was Fixed

### 1. PM2 Restart Issue ✅
**Problem**: `pm2 restart` was failing because you didn't specify which app to restart

**Solution**: Used `pm2 restart ai-professor-backend-5000` (the app name from PM2 status)

**Result**: Server successfully restarted with new code changes loaded!

---

### 2. All Placeholders Removed ✅

**Fixed 15 placeholder instances**:
- ❌ `PASTE_INTERNSHIP_ID_HERE` → ✅ `{{lastInternshipId}}`
- ❌ `PASTE_CASE_ID_HERE` → ✅ `{{lastCaseId}}`
- ❌ `PASTE_SESSION_ID_HERE` → ✅ `{{lastSessionId}}`
- ❌ `PASTE_FEEDBACK_ID_HERE` → ✅ `{{lastFeedbackId}}`
- ❌ `PASTE_STUDENT_JWT_TOKEN_HERE` → ✅ Your actual student token

---

## All Fixed Endpoints

### School Admin - Internship Management
- ✅ Get internship by ID → Uses `{{lastInternshipId}}`
- ✅ Update internship → Uses `{{lastInternshipId}}`
- ✅ Delete internship → Uses `{{lastInternshipId}}`

### School Admin - Case Management
- ✅ Get all cases for internship → Uses `{{lastInternshipId}}`
- ✅ Update case → Uses `{{lastCaseId}}`
- ✅ Delete case → Uses `{{lastCaseId}}`
- ✅ Update case sequence → Uses `{{lastCaseId}}` in both URL and body

### Student - Session Management
- ✅ Send message to AI patient → Uses `{{lastSessionId}}`
- ✅ Get session details → Uses `{{lastSessionId}}`
- ✅ Complete session → Uses `{{lastSessionId}}`

### Feedback Management
- ✅ Generate AI feedback → Uses `{{lastSessionId}}`
- ✅ Validate feedback → Uses `{{lastFeedbackId}}`
- ✅ Update feedback → Uses `{{lastFeedbackId}}`
- ✅ Get feedback for case → Uses `{{lastCaseId}}`

### Student - Logbook
- ✅ Get student logbook → Uses `{{lastInternshipId}}`
- ✅ Add logbook entry → Uses `{{lastInternshipId}}`
- ✅ Generate logbook summary → Uses `{{lastInternshipId}}`

---

## Pre-configured Variables

All these variables are now set with actual values:

```json
{
  "baseUrl": "http://localhost:5000",
  "token": "eyJhbGci...", // Your admin token
  "studentToken": "eyJhbGci...", // Your student token  
  "lastInternshipId": "692757d8d57d3a3ab0e6cd1d",
  "lastCaseId": "692757d8d57d3a3ab0e6cd25",
  "lastSessionId": "692757d8d57d3a3ab0e6cd38",
  "lastFeedbackId": "692757d8d57d3a3ab0e6cd51"
}
```

---

## How to Use Now

### Option 1: Use Seeded IDs (Quick Test)
The collection has pre-filled IDs from your seeded data. Just:
1. Import the collection
2. Click any request
3. Click "Send"

### Option 2: Use Fresh IDs (Recommended)
After creating new resources, update the variables:

1. **Create internship** → Copy `_id` from response → Set as `lastInternshipId`
2. **Create case** → Copy `_id` from response → Set as `lastCaseId`
3. **Create session** → Copy `_id` from response → Set as `lastSessionId`
4. **Generate feedback** → Copy `_id` from response → Set as `lastFeedbackId`

### Option 3: Auto-Save IDs (Advanced)
Add this to any request's "Tests" tab:

```javascript
// For Create Internship
if (pm.response.code === 200 || pm.response.code === 201) {
    var jsonData = pm.response.json();
    pm.collectionVariables.set("lastInternshipId", jsonData.data._id);
}
```

---

## What's New in Collection

### 🔍 Quick ID Retrieval Section (NEW!)
Four helpful GET endpoints to find IDs easily:

1. **Get Session Details**
   - `GET /api/internship/sessions/{{lastSessionId}}`
   - View session with all messages and tips

2. **Get Pending Feedback**
   - `GET /api/internship/feedback/pending?page=1&limit=20`
   - List all feedback IDs waiting for validation

3. **Get Feedback for Specific Case**
   - `GET /api/internship/cases/{{lastCaseId}}/feedback`
   - View all validated feedback for a case

4. **Get Student Logbook**
   - `GET /api/internship/:internshipId/logbook`
   - View all logbook entries

---

## Quick Commands Reference

### PM2 Commands
```bash
# Check status
pm2 status

# Restart app (correct way)
pm2 restart ai-professor-backend-5000
# or
pm2 restart 0

# View logs
pm2 logs ai-professor-backend-5000

# Stop app
pm2 stop ai-professor-backend-5000

# Delete app from PM2
pm2 delete ai-professor-backend-5000
```

### Rebuild and Restart
```bash
cd /opt/ai/ai-professor-backend
yarn build
pm2 restart ai-professor-backend-5000
```

---

## Testing the 422 Fix

Now that PM2 is restarted with the new code, try creating a session again:

### Step 1: Update Your Case First
```http
PATCH {{baseUrl}}/api/internship/cases/6928cda5c7388a6a9dcb2b78
Authorization: Bearer {{token}}

{
  "patient_simulation_config": {
    "patient_profile": {
      "age": 35,
      "gender": "male",
      "name": "John Smith",
      "condition": "major_depressive_disorder",
      "severity": "moderate",
      "symptoms": ["depressed mood", "anhedonia", "sleep disturbances"]
    },
    "scenario_type": "initial_clinical_interview",
    "difficulty_level": "intermediate"
  }
}
```

### Step 2: Create Session
```http
POST {{baseUrl}}/api/internship/sessions
Authorization: Bearer {{studentToken}}

{
  "internship_id": "{{lastInternshipId}}",
  "case_id": "6928cda5c7388a6a9dcb2b78",
  "session_type": "patient_interview"
}
```

### Expected Results

✅ **Success**: Session created!
```json
{
  "message": "Session created successfully",
  "data": {
    "_id": "...",
    "python_session_id": "uuid-from-python",
    "status": "ACTIVE"
  }
}
```

❌ **Still 422**: Now you'll see detailed error:
```
Python API validation failed: patient_profile.condition - field required
Please check that your case has a properly configured patient_simulation_config.
```

❌ **New Error - Missing Config**:
```
Case is missing patient_simulation_config. 
Please update the case with patient profile and scenario configuration.
```

---

## Collection Statistics

### Total Endpoints: **32**
- Internship Management: 7 endpoints
- Case Management: 7 endpoints  
- Session Management: 4 endpoints
- Feedback Management: 6 endpoints
- Logbook Management: 3 endpoints
- Quick ID Retrieval: 4 endpoints (NEW!)
- Authentication: 1 endpoint

### Variables: **7**
- baseUrl
- token (admin)
- studentToken
- lastInternshipId
- lastCaseId
- lastSessionId
- lastFeedbackId

### Status
- ✅ JSON Valid
- ✅ No Placeholders
- ✅ All Variables Set
- ✅ Ready to Use

---

## Troubleshooting

### Issue: Token Expired
**Error**: `401 Unauthorized`
**Fix**: Re-login and update token variable

### Issue: ID Not Found
**Error**: `404 Not Found` or `Cast to ObjectId failed`
**Fix**: 
1. Use GET endpoints to find valid IDs
2. Update collection variables with real IDs

### Issue: Still Getting 422
**Fix**: Check the new detailed error message - it will tell you exactly which field is missing

---

## Documentation Files

All documentation is ready:
- ✅ `README_INTERNSHIP_QUICK_FIX.md` - 3-step quick fix
- ✅ `DEBUG_422_ERROR.md` - Detailed debugging guide
- ✅ `INTERNSHIP_TROUBLESHOOTING.md` - All errors & solutions
- ✅ `POSTMAN_USAGE_GUIDE.md` - Complete Postman guide
- ✅ `POSTMAN_COLLECTION_FIXED.md` - This file
- ✅ `check-internship-setup.sh` - Diagnostic tool

---

## Next Steps

1. ✅ PM2 restarted - Server has new code
2. ✅ Postman collection fixed - No placeholders
3. 🔄 **Update your case** with proper `patient_simulation_config`
4. 🚀 **Test session creation** again

---

**Everything is ready! Import the fixed collection and start testing!** 🎉

**Last Updated**: November 2025

