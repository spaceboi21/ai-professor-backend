# 🚀 Quick Test Reference - Internship API

## 📋 Resource IDs (Copy-Paste Ready)

```
Student ID:     692757b2342b36d2ada28e47
Internship ID:  692757d8d57d3a3ab0e6cd1d
Case ID:        692757d8d57d3a3ab0e6cd25
Session ID:     692757d8d57d3a3ab0e6cd38
Feedback ID:    692757d8d57d3a3ab0e6cd51
```

## 🔑 Test Credentials

```
Student Email:    test.student@example.com
Student Password: password123
```

## 📡 Base URL

```
http://localhost:5000
```

## 🧪 Quick Test Commands (cURL)

### 1. Get All Internships
```bash
curl -X GET "http://localhost:5000/api/internship?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 2. Get Specific Internship
```bash
curl -X GET "http://localhost:5000/api/internship/692757d8d57d3a3ab0e6cd1d" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Get Cases for Internship
```bash
curl -X GET "http://localhost:5000/api/internship/692757d8d57d3a3ab0e6cd1d/cases" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Get Specific Case
```bash
curl -X GET "http://localhost:5000/api/internship/cases/692757d8d57d3a3ab0e6cd25" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 5. Get Session Details
```bash
curl -X GET "http://localhost:5000/api/internship/sessions/692757d8d57d3a3ab0e6cd38" \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN_HERE"
```

### 6. Get Feedback for Case
```bash
curl -X GET "http://localhost:5000/api/internship/cases/692757d8d57d3a3ab0e6cd25/feedback" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 7. Get Student Logbook
```bash
curl -X GET "http://localhost:5000/api/internship/692757d8d57d3a3ab0e6cd1d/logbook" \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN_HERE"
```

### 8. Get Pending Feedback (Professor)
```bash
curl -X GET "http://localhost:5000/api/internship/feedback/pending?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🎯 Direct Postman URLs

Replace `:id` with actual IDs:

```
GET    {{baseUrl}}/api/internship
GET    {{baseUrl}}/api/internship/692757d8d57d3a3ab0e6cd1d
PATCH  {{baseUrl}}/api/internship/692757d8d57d3a3ab0e6cd1d
DELETE {{baseUrl}}/api/internship/692757d8d57d3a3ab0e6cd1d

GET    {{baseUrl}}/api/internship/692757d8d57d3a3ab0e6cd1d/cases
POST   {{baseUrl}}/api/internship/692757d8d57d3a3ab0e6cd1d/cases
GET    {{baseUrl}}/api/internship/cases/692757d8d57d3a3ab0e6cd25
PATCH  {{baseUrl}}/api/internship/cases/692757d8d57d3a3ab0e6cd25
DELETE {{baseUrl}}/api/internship/cases/692757d8d57d3a3ab0e6cd25

POST   {{baseUrl}}/api/internship/sessions
GET    {{baseUrl}}/api/internship/sessions/692757d8d57d3a3ab0e6cd38
POST   {{baseUrl}}/api/internship/sessions/692757d8d57d3a3ab0e6cd38/message
POST   {{baseUrl}}/api/internship/sessions/692757d8d57d3a3ab0e6cd38/complete

POST   {{baseUrl}}/api/internship/sessions/692757d8d57d3a3ab0e6cd38/feedback
GET    {{baseUrl}}/api/internship/feedback/pending
POST   {{baseUrl}}/api/internship/feedback/692757d8d57d3a3ab0e6cd51/validate
PATCH  {{baseUrl}}/api/internship/feedback/692757d8d57d3a3ab0e6cd51
GET    {{baseUrl}}/api/internship/cases/692757d8d57d3a3ab0e6cd25/feedback

GET    {{baseUrl}}/api/internship/692757d8d57d3a3ab0e6cd1d/logbook
POST   {{baseUrl}}/api/internship/692757d8d57d3a3ab0e6cd1d/logbook
PATCH  {{baseUrl}}/api/internship/692757d8d57d3a3ab0e6cd1d/logbook/summary
```

## ⚡ Quick Validation Checks

### Check if data exists:
```bash
# Should return 1 internship
curl -s "http://localhost:5000/api/internship" -H "Authorization: Bearer TOKEN" | jq '.data | length'

# Should return 1 case
curl -s "http://localhost:5000/api/internship/692757d8d57d3a3ab0e6cd1d/cases" -H "Authorization: Bearer TOKEN" | jq '.data | length'

# Should return session with 12 messages
curl -s "http://localhost:5000/api/internship/sessions/692757d8d57d3a3ab0e6cd38" -H "Authorization: Bearer TOKEN" | jq '.data.messages | length'
```

## 📊 Expected Response Counts

- **Internships:** 1 (or more if you created additional ones)
- **Cases:** 1 per internship (or more if you created additional ones)
- **Session Messages:** 12 messages (6 from student, 6 from AI patient)
- **Real-time Tips:** 3 tips in the session
- **Feedback Items:** 1 validated feedback
- **Logbook Entries:** 1 entry
- **Skills Practiced:** 6 skills in logbook

## 🔄 Re-seed Command

```bash
cd /opt/ai/ai-professor-backend
npm run seed:internship
```

## 💡 Pro Tips

1. **Import Postman Collection First:** All variables are pre-configured
2. **Test GET endpoints first:** Verify data exists before testing updates
3. **Keep tokens handy:** Save both admin and student tokens
4. **Check response status codes:** 
   - 200 = Success (GET, PATCH)
   - 201 = Created (POST)
   - 204 = No Content (DELETE)
   - 400 = Bad Request
   - 401 = Unauthorized
   - 404 = Not Found

---

**Need detailed testing guide?** See `INTERNSHIP_TEST_GUIDE.md`

