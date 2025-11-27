# 🎓 Internship API Test Guide

## ✅ Database Seeded Successfully!

All dummy data has been created in the database. You can now test all internship endpoints using Postman.

---

## 📋 Created Test Data IDs

Replace the placeholders in your Postman collection with these IDs:

### Core Resources
```
Student ID:     692757b2342b36d2ada28e47
Internship ID:  692757d8d57d3a3ab0e6cd1d
Case ID:        692757d8d57d3a3ab0e6cd25
Session ID:     692757d8d57d3a3ab0e6cd38
Feedback ID:    692757d8d57d3a3ab0e6cd51
Logbook ID:     692757d8d57d3a3ab0e6cd60
Progress ID:    692757d8d57d3a3ab0e6cd68
```

### Authentication Tokens
```
School Admin Token (already in Postman):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDE0YTU4YjhiYzNmMjA4YTE2ZjUwOCIsImVtYWlsIjoibWFfYWJiYXMyMDAxQGhvdG1haWwuY29tIiwicm9sZV9pZCI6IjY4NjNjZWE0MTFiZTkwMTZiN2NjYjdmZCIsInNjaG9vbF9pZCI6IjY5MDE0YTU4YjhiYzNmMjA4YTE2ZjUwNiIsInJvbGVfbmFtZSI6IlNDSE9PTF9BRE1JTiIsInRva2VuX3R5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NjMzMDMwNTMsImV4cCI6MTc2NTg5NTA1M30.G0NrXZdPdr022_D8aOvz5vTOalBosALDyj8oxny5VtY

Student Token: You'll need to login as the student to get this token
  Email: test.student@example.com
  Password: password123 (if using default)
```

---

## 🚀 Quick Start - Testing All Endpoints

### Step 1: Update Postman Variables
1. Open Postman
2. Import `internship-api.postman_collection.json`
3. Update the collection variables:
   - `lastInternshipId` → `692757d8d57d3a3ab0e6cd1d`
   - `lastCaseId` → `692757d8d57d3a3ab0e6cd25`
   - `lastSessionId` → `692757d8d57d3a3ab0e6cd38`
   - `lastFeedbackId` → `692757d8d57d3a3ab0e6cd51`

### Step 2: Test School Admin Endpoints

#### 📚 Internship Management
| # | Endpoint | Method | Status |
|---|----------|--------|--------|
| 1 | Create new internship | POST | ✅ Can test (creates new) |
| 2 | Get all internships | GET | ✅ Ready (will show seeded data) |
| 3 | Get internship by ID | GET | ✅ Ready (use ID: 692757d8d57d3a3ab0e6cd1d) |
| 4 | Update internship | PATCH | ✅ Ready (use ID: 692757d8d57d3a3ab0e6cd1d) |
| 5 | Delete internship | DELETE | ⚠️ Test last (will soft delete) |
| 6 | Publish internship | POST | ✅ Ready (already published, can unpublish first) |
| 7 | Unpublish internship | POST | ✅ Ready |

#### 📋 Case Management
| # | Endpoint | Method | Status |
|---|----------|--------|--------|
| 1 | Create case for internship | POST | ✅ Can test (creates new case) |
| 2 | Get all cases for internship | GET | ✅ Ready (use internship ID) |
| 3 | Get case by ID | GET | ✅ Ready (use case ID: 692757d8d57d3a3ab0e6cd25) |
| 4 | Update case | PATCH | ✅ Ready (use case ID: 692757d8d57d3a3ab0e6cd25) |
| 5 | Delete case | DELETE | ⚠️ Test last (will soft delete) |
| 6 | Update case sequence | PATCH | ✅ Ready (after creating another case) |

### Step 3: Get Student Token

Before testing student endpoints, you need to login as the student:

```bash
POST {{baseUrl}}/api/auth/login/student
Content-Type: application/json

{
  "email": "test.student@example.com",
  "password": "password123"
}
```

Copy the returned token and set it as `studentToken` in Postman variables.

### Step 4: Test Student Endpoints

#### 💬 Session Management
| # | Endpoint | Method | Status |
|---|----------|--------|--------|
| 1 | Create session | POST | ✅ Can test (creates new session) |
| 2 | Send message to AI patient | POST | ✅ Ready (use session ID: 692757d8d57d3a3ab0e6cd38) |
| 3 | Get session details | GET | ✅ Ready (use session ID: 692757d8d57d3a3ab0e6cd38) |
| 4 | Complete session | POST | ✅ Ready (creates new session first) |

### Step 5: Test Feedback Management

#### 📝 Feedback
| # | Endpoint | Method | Status |
|---|----------|--------|--------|
| 1 | Generate AI feedback (Student) | POST | ✅ Can test (after creating new session) |
| 2 | Get pending feedback (Professor) | GET | ✅ Can test (after generating feedback) |
| 3 | Validate feedback (Professor) | POST | ✅ Can test (use feedback ID: 692757d8d57d3a3ab0e6cd51) |
| 4 | Update feedback (Professor) | PATCH | ✅ Ready (use feedback ID: 692757d8d57d3a3ab0e6cd51) |
| 5 | Get feedback for case | GET | ✅ Ready (use case ID: 692757d8d57d3a3ab0e6cd25) |

### Step 6: Test Logbook

#### 📔 Student Logbook
| # | Endpoint | Method | Status |
|---|----------|--------|--------|
| 1 | Get student logbook | GET | ✅ Ready (use internship ID: 692757d8d57d3a3ab0e6cd1d) |
| 2 | Add logbook entry | POST | ✅ Can test (adds new entry) |
| 3 | Generate logbook summary | PATCH | ✅ Ready (use internship ID: 692757d8d57d3a3ab0e6cd1d) |

---

## 📊 Seeded Data Details

### 👨‍🎓 Student
- **Name:** Test Student
- **Email:** test.student@example.com
- **Student Code:** STU2025001
- **Year:** 3
- **Status:** Active

### 📚 Internship
- **Title:** Clinical Psychology Internship - Year 3
- **Year:** 3
- **Duration:** 40 hours
- **Status:** Published
- **Cases:** 1 case created

### 📋 Case
- **Title:** Major Depressive Disorder - Initial Assessment
- **Patient:** John Smith, 35-year-old male
- **Condition:** Major Depressive Disorder
- **Difficulty:** Intermediate
- **Sequence:** 1

### 💬 Session
- **Type:** Patient Interview
- **Status:** Completed
- **Duration:** 45 minutes
- **Messages:** 12 messages (full conversation)
- **Real-time Tips:** 3 tips provided

### 📝 Feedback
- **Type:** Auto-generated (AI)
- **Status:** Validated by professor
- **AI Score:** 85/100
- **Professor Adjusted Score:** 88/100
- **Strengths:** 4 identified
- **Areas for Improvement:** 4 identified

### 📔 Logbook
- **Entries:** 1 entry
- **Total Hours:** 0.75 hours
- **Overall Summary:** Generated
- **Skills Practiced:** 6 skills documented

---

## 🔄 Testing Flow Recommendation

### For Complete Testing:

1. **Start with Read Operations:**
   - Get all internships
   - Get specific internship
   - Get all cases for internship
   - Get specific case
   - Get session details
   - Get feedback for case
   - Get student logbook

2. **Test Create Operations:**
   - Create a new internship
   - Create a new case for the internship
   - Create a new session
   - Send messages in the session
   - Complete the session
   - Generate feedback

3. **Test Update Operations:**
   - Update internship details
   - Update case details
   - Update case sequence
   - Validate/update feedback
   - Add logbook entry
   - Generate logbook summary

4. **Test Publish/Unpublish:**
   - Unpublish internship
   - Publish internship again

5. **Test Delete Operations (Last):**
   - Delete case
   - Delete internship

---

## 🛠️ Re-running the Seed

If you need to seed the data again (e.g., after deletions):

```bash
cd /opt/ai/ai-professor-backend
npm run seed:internship
```

This will create fresh data with new IDs. Make sure to update the Postman variables with the new IDs.

---

## 📝 Notes

- The student password is stored as a bcrypt hash in the database
- All timestamps are set relative to the current time when the seed runs
- The session includes realistic conversation between student and AI patient
- Real-time tips are provided at appropriate points in the conversation
- Feedback includes detailed assessment across multiple criteria
- Logbook includes self-reflection and skills practiced

---

## 🔍 Verification Queries

If you want to verify the data directly in MongoDB:

```javascript
// Connect to demo_school database
use demo_school

// Check internship
db.internships.findOne({ title: "Clinical Psychology Internship - Year 3" })

// Check case
db.internshipcases.findOne({ title: "Major Depressive Disorder - Initial Assessment" })

// Check student
db.students.findOne({ email: "test.student@example.com" })

// Check session
db.studentcasesessions.findOne({ case_id: ObjectId("692757d8d57d3a3ab0e6cd25") })

// Check feedback
db.casefeedbacklogs.findOne({ case_id: ObjectId("692757d8d57d3a3ab0e6cd25") })

// Check logbook
db.studentlogbooks.findOne({ student_id: ObjectId("692757b2342b36d2ada28e47") })
```

---

## 🎯 Expected Results

### Successful Test Indicators:
- ✅ All GET endpoints return data without 404 errors
- ✅ POST endpoints create new resources with 201 status
- ✅ PATCH endpoints update resources successfully
- ✅ DELETE endpoints soft delete resources
- ✅ Published/unpublished status changes correctly
- ✅ Student can only see validated feedback
- ✅ Professor can see and validate pending feedback
- ✅ Session includes conversation history and real-time tips
- ✅ Logbook accumulates entries and total hours

---

## 💡 Tips

1. **Use Postman Variables:** Set up environment/collection variables for IDs to avoid copy-pasting
2. **Test in Order:** Follow the recommended testing flow for best results
3. **Check Responses:** Verify that returned data matches expected structure
4. **Role-Based Testing:** Switch between school admin and student tokens appropriately
5. **Error Testing:** Try invalid IDs to test error handling
6. **Pagination:** Test pagination parameters on list endpoints

---

## 🐛 Troubleshooting

### If endpoints return 404:
- Verify the IDs are correct and not soft-deleted
- Check that you're using the right authentication token
- Ensure the resource exists in the database

### If endpoints return 401/403:
- Check that the JWT token is valid and not expired
- Verify you're using the correct token for the role (student vs admin)
- Ensure the token is properly set in the Authorization header

### If endpoints return 500:
- Check server logs for detailed error messages
- Verify database connection is working
- Ensure all required fields are provided in the request body

---

Happy Testing! 🚀

