# 🔐 Student Login - Get JWT Token

## Quick Curl Command

```bash
curl -X POST https://api.psysphereai.com/api/auth/student/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "talhajunk@gmail.com",
    "password": "%_181p^2wm*W"
  }'
```

## Expected Success Response

```json
{
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "69028466b8bc3f208a16fc02",
      "email": "talhajunk@gmail.com",
      "role": "STUDENT",
      ...
    }
  }
}
```

## Extract Token Only

To get just the token (useful for scripts):

```bash
curl -s -X POST https://api.psysphereai.com/api/auth/student/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "talhajunk@gmail.com",
    "password": "%_181p^2wm*W"
  }' | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])"
```

## Automated Script

I've created a script that does everything automatically:

```bash
chmod +x /opt/ai/ai-professor-backend/STUDENT_LOGIN_CURL.sh
/opt/ai/ai-professor-backend/STUDENT_LOGIN_CURL.sh
```

This will:
1. ✅ Login as the student
2. ✅ Show the full response
3. ✅ Extract and display the JWT token
4. ✅ Show example curl commands using the token

## Use Token in Session Creation

After getting the token, use it like this:

```bash
# Replace YOUR_TOKEN with the token from login response
curl -X POST https://api.psysphereai.com/api/internship/sessions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "internship_id": "692757d8d57d3a3ab0e6cd1d",
    "case_id": "6928f32a48f9778d2a0ca575",
    "session_type": "patient_interview"
  }'
```

## Optional Parameters

You can also include optional parameters:

```bash
curl -X POST https://api.psysphereai.com/api/auth/student/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "talhajunk@gmail.com",
    "password": "%_181p^2wm*W",
    "rememberMe": true,
    "preferred_language": "en"
  }'
```

- `rememberMe`: If `true`, token valid for 30 days (default: 1 day)
- `preferred_language`: `"en"` or `"fr"` (default: based on user settings)

## Troubleshooting

### 401 Unauthorized
- Check email and password are correct
- Password contains special characters - make sure they're properly escaped in JSON

### 404 Not Found
- Student account doesn't exist with that email
- Check email spelling

### 400 Bad Request
- School account might be deactivated
- Check error message for details

---

**Quick Copy-Paste Command:**

```bash
curl -X POST https://api.psysphereai.com/api/auth/student/login -H "Content-Type: application/json" -d '{"email":"talhajunk@gmail.com","password":"%_181p^2wm*W"}'
```

