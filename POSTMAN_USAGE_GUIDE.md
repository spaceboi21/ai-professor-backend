# Postman Collection Usage Guide - Internship API

## 🎯 Quick Start

### 1. Import Collection
1. Open Postman
2. Click "Import"
3. Select `internship-api.postman_collection.json`
4. The collection will appear in your sidebar

### 2. Set Up Variables
The collection uses these variables (already pre-configured):

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `baseUrl` | `http://localhost:5000` | Your NestJS API base URL |
| `token` | (Your JWT) | School Admin/Professor token |
| `studentToken` | PASTE_STUDENT_JWT_TOKEN_HERE | Student JWT token |
| `lastInternshipId` | 692757d8d57d3a3ab0e6cd1d | Seeded internship ID |
| `lastCaseId` | 692757d8d57d3a3ab0e6cd25 | Seeded case ID |
| `lastSessionId` | 692757d8d57d3a3ab0e6cd38 | Seeded session ID |
| `lastFeedbackId` | 692757d8d57d3a3ab0e6cd51 | Seeded feedback ID |

### 3. Get Your Tokens

#### Get School Admin Token
```http
POST {{baseUrl}}/api/auth/login/school-admin
Content-Type: application/json

{
  "email": "your_admin_email@example.com",
  "password": "your_password"
}
```

Copy the `access_token` from the response and set it as `token` in Postman variables.

#### Get Student Token
```http
POST {{baseUrl}}/api/auth/login/student
Content-Type: application/json

{
  "email": "test.student@example.com",
  "password": "password123"
}
```

Copy the `access_token` from the response and set it as `studentToken` in Postman variables.

---

## 📂 Collection Structure

### 🔍 **NEW: Quick ID Retrieval - GET Endpoints**
This is your most important section for testing! Use these to get IDs before running other operations.

#### Get All Sessions
```
GET /api/internship/sessions/:sessionId
```
- **Purpose**: Get session details with all messages
- **Auth**: Student token
- **Usage**: Replace `:sessionId` with actual session ID from create session response

#### Get Pending Feedback
```
GET /api/internship/feedback/pending?page=1&limit=20
```
- **Purpose**: See all feedback awaiting validation
- **Auth**: Admin/Professor token
- **Usage**: Find feedback IDs to validate

#### Get Feedback for Specific Case
```
GET /api/internship/cases/:caseId/feedback
```
- **Purpose**: Get all validated feedback for a case
- **Auth**: Student/Professor token
- **Usage**: Students see only validated feedback

#### Get Student Logbook
```
GET /api/internship/:internshipId/logbook
```
- **Purpose**: See all logbook entries for an internship
- **Auth**: Student token
- **Usage**: Track student progress

---

### 1️⃣ School Admin - Internship Management

#### Create New Internship
```
POST /api/internship
```
**What it does**: Creates a new internship with cases, evaluation criteria, and AI supervision settings.

**Response**: Returns internship ID - save this as `lastInternshipId` variable!

#### Get All Internships
```
GET /api/internship?page=1&limit=10&year=3
```
**What it does**: Lists all internships with optional filters.

**Query Parameters**:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `year` - Filter by student year (1-5)
- `published` - Filter by published status (true/false)
- `search` - Search in title/description

#### Get Internship by ID
```
GET /api/internship/:id
```
**What it does**: Gets detailed information about a specific internship.

**Usage**: Replace `:id` with actual internship ID or use `{{lastInternshipId}}`

---

### 2️⃣ School Admin - Case Management

#### Create Case for Internship
```
POST /api/internship/:internshipId/cases
```
**What it does**: Creates a new clinical case with patient simulation config.

**Response**: Returns case ID - save this as `lastCaseId` variable!

**Important**: The case will be automatically ingested into the Python/Pinecone knowledge base for AI-powered responses.

#### Get All Cases for Internship
```
GET /api/internship/:internshipId/cases
```
**What it does**: Lists all cases for a specific internship, ordered by sequence.

#### Get Case by ID
```
GET /api/internship/cases/:caseId
```
**What it does**: Gets detailed case information including all content and documents.

---

### 3️⃣ Student - Session Management

⚠️ **REQUIRES PYTHON BACKEND**: These endpoints need the Python AI service running at `http://localhost:8000/api/v1`

#### Create Session (Start Patient Interview)
```
POST /api/internship/sessions
```
**What it does**: Initializes an AI patient simulation session.

**Session Types**:
- `patient_interview` - Interact with AI patient
- `therapist_consultation` - Get guidance from AI therapist
- `supervisor_feedback` - Request supervisor assistance

**Response**: Returns session ID - save this as `lastSessionId` variable!

**Error 404?** → See `INTERNSHIP_TROUBLESHOOTING.md` - Python backend not running.

#### Send Message to AI Patient
```
POST /api/internship/sessions/:sessionId/message
```
**What it does**: Sends a message to the AI (patient/therapist/supervisor) and gets a response.

**May receive**: Real-time supervisor tips if your approach needs adjustment.

#### Get Session Details
```
GET /api/internship/sessions/:sessionId
```
**What it does**: Retrieves session details including all messages and tips.

#### Complete Session
```
POST /api/internship/sessions/:sessionId/complete
```
**What it does**: Marks session as completed. Required before generating feedback.

---

### 4️⃣ Feedback Management

⚠️ **Feedback Generation REQUIRES PYTHON BACKEND**

#### Generate AI Feedback (Student)
```
POST /api/internship/sessions/:sessionId/feedback
```
**What it does**: Generates comprehensive AI feedback based on the session.

**Status**: Initially `PENDING_VALIDATION` - awaits professor approval.

**Includes**:
- Overall score
- Rubric-based evaluation
- Strengths
- Improvement areas
- Detailed technical feedback

#### Get Pending Feedback (Professor)
```
GET /api/internship/feedback/pending?page=1&limit=10
```
**What it does**: Lists all feedback awaiting professor validation.

**Use Case**: Professors review and approve/edit AI-generated feedback.

#### Validate Feedback (Professor)
```
POST /api/internship/feedback/:feedbackId/validate
```
**What it does**: Approves or revises AI feedback with professor comments.

**Parameters**:
- `is_approved` (boolean) - Approve or reject
- `professor_comments` (string) - Additional feedback
- `edited_score` (number, optional) - Override AI score

#### Update Feedback (Professor)
```
PATCH /api/internship/feedback/:feedbackId
```
**What it does**: Updates already validated feedback.

#### Get Feedback for Case
```
GET /api/internship/cases/:caseId/feedback
```
**What it does**: Gets all feedback for a specific case.

**Note**: Students only see VALIDATED feedback. Professors see all.

---

### 5️⃣ Student - Logbook

#### Get Student Logbook
```
GET /api/internship/:internshipId/logbook
```
**What it does**: Retrieves student's logbook with all entries.

**Includes**:
- All case entries
- Skills practiced
- Self-reflections
- Overall progress summary

#### Add Logbook Entry
```
POST /api/internship/:internshipId/logbook
```
**What it does**: Adds a new entry to the logbook after completing a case.

**Best Practice**: Add entries after receiving validated feedback.

#### Generate Logbook Summary
```
PATCH /api/internship/:internshipId/logbook/summary
```
**What it does**: Generates or updates overall progress summary based on all entries.

---

## 🎬 Testing Workflow

### Complete Testing Sequence

#### Phase 1: Setup (Admin)
1. ✅ **Create internship** → Save internship ID
2. ✅ **Get all internships** → Verify creation
3. ✅ **Get internship by ID** → Check details
4. ✅ **Create case for internship** → Save case ID
5. ✅ **Get all cases** → Verify case creation
6. ✅ **Publish internship** → Make it available to students

#### Phase 2: Student Workflow
7. ✅ **Login as student** → Get student token
8. ✅ **Get all internships** (as student) → See published internships
9. ✅ **Get internship details** → View guidelines
10. ✅ **Get cases for internship** → See available cases
11. ⚠️ **Create session** → Start patient interview (needs Python backend)
12. ⚠️ **Send messages** → Interact with AI patient (needs Python backend)
13. ⚠️ **Complete session** → Mark as done
14. ⚠️ **Generate feedback** → Request AI evaluation (needs Python backend)
15. ✅ **Add logbook entry** → Document learning

#### Phase 3: Professor Review
16. ✅ **Get pending feedback** → See feedback awaiting validation
17. ✅ **Validate feedback** → Approve with comments
18. ✅ **View validated feedback** (as student) → See final grades

---

## 🚨 Common Issues

### Issue 1: 404 on Session Creation
**Error**: `Python API POST call failed (/internship/patient/initialize): Request failed with status code 404`

**Solution**: Python backend not running. See `INTERNSHIP_TROUBLESHOOTING.md`

### Issue 2: Invalid Token
**Error**: `401 Unauthorized`

**Solution**: 
1. Check token is set in Postman variables
2. Verify token hasn't expired (tokens expire after ~30 days)
3. Re-login and get new token

### Issue 3: Wrong Placeholders
**Error**: `Cast to ObjectId failed for value "PASTE_INTERNSHIP_ID_HERE"`

**Solution**: Replace placeholder IDs with actual IDs:
- After creating internship: Copy ID → Set as `lastInternshipId`
- After creating case: Copy ID → Set as `lastCaseId`
- After creating session: Copy ID → Set as `lastSessionId`

### Issue 4: Seeded IDs Don't Work
**Error**: `404 Not Found` when using seeded IDs

**Solution**: 
1. Use "Get All" endpoints to find actual IDs in your database
2. Update Postman variables with real IDs
3. Or create new resources and save those IDs

---

## 📊 Useful Tips

### Save Response IDs Automatically
In Postman, you can automatically save IDs from responses to variables:

1. Go to request → "Tests" tab
2. Add this script:

```javascript
// For Create Internship response
pm.test("Save internship ID", function () {
    var jsonData = pm.response.json();
    pm.collectionVariables.set("lastInternshipId", jsonData.data._id);
});

// For Create Case response
pm.test("Save case ID", function () {
    var jsonData = pm.response.json();
    pm.collectionVariables.set("lastCaseId", jsonData.data._id);
});

// For Create Session response
pm.test("Save session ID", function () {
    var jsonData = pm.response.json();
    pm.collectionVariables.set("lastSessionId", jsonData.data._id);
});
```

### Quick ID Lookup
Don't remember an ID? Use these GET endpoints:
- `/api/internship` - Lists all internships with IDs
- `/api/internship/:internshipId/cases` - Lists all cases with IDs
- `/api/internship/feedback/pending` - Lists all feedback with IDs

### Test Without Python Backend
Many endpoints work without Python backend:
- ✅ All internship management
- ✅ All case management
- ✅ All logbook operations
- ✅ Feedback viewing/validation (not generation)

Only these require Python:
- ❌ Session creation with AI
- ❌ AI message responses
- ❌ AI feedback generation

---

## 📞 Need Help?

1. **API Errors**: Check `INTERNSHIP_TROUBLESHOOTING.md`
2. **Python Setup**: Check `PYTHON_INTEGRATION_GUIDE.md`
3. **Feature Overview**: Check `/src/modules/internship/README.md`

---

**Last Updated**: November 2025
**Collection Version**: 1.0

