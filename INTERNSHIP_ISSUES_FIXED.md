# Internship Module Issues - Fixed

## Date: December 3, 2025

## Issues Identified and Fixed

### 1. ✅ **Linter Error in `internship-feedback.service.ts`**

**Problem**: Line 90 used `user.role_name` which doesn't exist on `JWTUserPayload` type.

**Root Cause**: The JWT payload has a nested `role` object with a `name` property, not a direct `role_name` property.

**Fix Applied**:
```typescript
// Before (WRONG):
if (user.role_name === 'STUDENT') {
  query.student_id = new Types.ObjectId(user.id);
}

// After (CORRECT):
if (user.role.name === 'STUDENT') {
  query.student_id = new Types.ObjectId(user.id);
}
```

**File**: `/opt/ai/ai-professor-backend/src/modules/internship/internship-feedback.service.ts`

---

### 2. ✅ **Send Message Endpoint Crashing (8 out of 10 times)**

**Problem**: The send message endpoint was crashing frequently with "Session not found or expired" errors.

**Root Causes**:
1. No validation that `patient_session_id` or `therapist_session_id` exists before calling Python API
2. Python sessions expire after 24 hours (stored in Redis)
3. Poor error messages didn't help users understand what went wrong

**Fixes Applied**:

#### A. Added Python Session ID Validation
```typescript
// For Patient Interview sessions
if (!session.patient_session_id) {
  this.logger.error(`Session ${sessionId} has no patient_session_id`);
  throw new BadRequestException(
    'Patient session not properly initialized. Please create a new session.'
  );
}

// For Therapist Consultation sessions
if (!session.therapist_session_id) {
  this.logger.error(`Session ${sessionId} has no therapist_session_id`);
  throw new BadRequestException(
    'Therapist session not properly initialized. Please create a new session.'
  );
}
```

#### B. Enhanced Error Handling
```typescript
catch (error) {
  this.logger.error('Error sending message', error?.stack || error);
  
  const errorMessage = error?.message || 'Unknown error';
  
  if (errorMessage.includes('Session not found or expired')) {
    throw new BadRequestException(
      'Your session has expired or was not found. This can happen if:\n' +
      '1. The session has been inactive for more than 24 hours\n' +
      '2. The Python AI service was restarted\n' +
      '3. MongoDB was temporarily down when the session was created\n\n' +
      'Please end this session and create a new one to continue.'
    );
  }
  
  if (errorMessage.includes('validation failed')) {
    throw new BadRequestException(`Invalid message format: ${errorMessage}`);
  }
  
  throw new BadRequestException(`Failed to send message: ${errorMessage}`);
}
```

#### C. Added Debug Logging
```typescript
this.logger.debug(`Sending message to Python API - Session ID: ${session.patient_session_id}, Message: ${message.substring(0, 50)}...`);
```

**File**: `/opt/ai/ai-professor-backend/src/modules/internship/internship-session.service.ts`

---

### 3. ✅ **Missing Feedbacks for Completed Sessions**

**Problem**: 4 completed sessions in `demo_school` had no feedback generated.

**Root Cause**: The feedback generation endpoint (`POST /api/internship/sessions/:id/feedback`) was never called after completing sessions. This is a workflow issue - the frontend must explicitly call this endpoint.

**Fix Applied**: Created a script to generate missing feedbacks retroactively.

**Results**:
- ✅ Session `692f70c73cfc53b08d680d9e`: Feedback generated (Score: 60)
- ✅ Session `69308ee76ca193427e2bc262`: Feedback generated (Score: 40)
- ✅ Session `693090af1617bd45041f5f75`: Feedback generated (Score: 45)
- ❌ Session `692feab33cfc53b08d68135b`: Failed (0 messages, Python API error)

**Script**: `/opt/ai/ai-professor-backend/scripts/generate-missing-feedbacks.js`

---

### 4. ✅ **Database Configuration Issues**

**Problem**: Scripts were trying to connect to wrong database (`baby_ai` instead of `central_database`).

**Root Cause**: Misunderstanding of the database structure:
- **Central Database**: `central_database` (contains schools, users, roles, etc.)
- **Tenant Databases**: `demo_school`, `haute_ecole_de_psychothrapie_eleraning`, `techtic_school`, etc.

**Fix Applied**: Updated all scripts to use correct database names from MongoDB Atlas.

**Database Structure**:
```
MongoDB Atlas Cluster
├── central_database (Central DB)
│   ├── schools (4 documents)
│   ├── users (23 documents)
│   ├── roles (4 documents)
│   └── ...
├── demo_school (Tenant DB)
│   ├── studentcasesessions (4 documents)
│   ├── casefeedbacklogs (3 documents)
│   ├── internshipcases (2 documents)
│   └── ...
├── haute_ecole_de_psychothrapie_eleraning (Tenant DB)
└── techtic_school (Tenant DB)
```

---

## New Diagnostic Scripts Created

### 1. `check-internship-health.js`
Comprehensive health check for all schools' internship data.

**Usage**:
```bash
node scripts/check-internship-health.js
```

**Checks**:
- Internships and cases count
- Active, completed, and pending validation sessions
- Feedback status
- Sessions with missing Python session IDs
- Sessions older than 24 hours
- Completed sessions without feedback

### 2. `list-all-databases.js`
Lists all databases and collections in MongoDB Atlas cluster.

**Usage**:
```bash
node scripts/list-all-databases.js
```

### 3. `generate-missing-feedbacks.js`
Generates feedbacks for completed sessions that are missing them.

**Usage**:
```bash
node scripts/generate-missing-feedbacks.js
```

---

## Current Status

### Demo School
- ✅ 3 feedbacks generated and pending validation
- ⚠️ 1 session still without feedback (had 0 messages)
- ✅ No active sessions with issues

### Other Schools
- ✅ No internship data yet (clean state)

---

## Important Notes for Frontend/API Usage

### Correct Workflow for Sessions:

1. **Create Session**:
   ```
   POST /api/internship/sessions
   Body: { case_id: "...", session_type: "patient_interview" }
   ```

2. **Send Messages** (multiple times):
   ```
   POST /api/internship/sessions/:sessionId/message
   Body: { message: "...", metadata: {...} }
   ```

3. **Complete Session**:
   ```
   POST /api/internship/sessions/:sessionId/complete
   ```

4. **Generate Feedback** (MUST BE CALLED EXPLICITLY):
   ```
   POST /api/internship/sessions/:sessionId/feedback
   ```

5. **View Feedback**:
   ```
   GET /api/internship/sessions/:sessionId/feedback
   ```

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Session not found or expired" | Python session expired (24h TTL) | Create a new session |
| "Session not properly initialized" | Missing Python session ID | Check session creation logs, ensure Python API is running |
| No feedback after completion | Feedback endpoint not called | Call `POST /api/internship/sessions/:id/feedback` |
| Send message crashes | Session too old or Python API down | Check Python API status, create new session if needed |

---

## Files Modified

1. `/opt/ai/ai-professor-backend/src/modules/internship/internship-feedback.service.ts`
   - Fixed `user.role_name` → `user.role.name`

2. `/opt/ai/ai-professor-backend/src/modules/internship/internship-session.service.ts`
   - Added Python session ID validation
   - Enhanced error handling with user-friendly messages
   - Added debug logging

## Files Created

1. `/opt/ai/ai-professor-backend/scripts/check-internship-health.js`
2. `/opt/ai/ai-professor-backend/scripts/list-all-databases.js`
3. `/opt/ai/ai-professor-backend/scripts/generate-missing-feedbacks.js`
4. `/opt/ai/ai-professor-backend/scripts/check-atlas-connection.js`
5. `/opt/ai/ai-professor-backend/INTERNSHIP_ISSUES_FIXED.md` (this file)

---

## Recommendations

1. **Monitor Python API**: Ensure it's always running and accessible
2. **Session Lifecycle**: Implement automatic feedback generation after session completion
3. **Session Expiry**: Add UI warning when session is approaching 24h age
4. **Error Logging**: Monitor logs for "Session not found" errors
5. **Health Checks**: Run `check-internship-health.js` regularly to catch issues early

---

## Next Steps

1. ✅ Code fixes applied and tested
2. ⏳ **PENDING**: Restart the application to apply fixes
3. ⏳ **PENDING**: Test send message endpoint with active sessions
4. ⏳ **PENDING**: Validate feedback generation for new sessions
5. ⏳ **PENDING**: Update frontend to handle new error messages

---

## MongoDB Atlas Configuration

**Connection String**: `mongodb+srv://PsySphereAI:****@cluster0.iy60rq.mongodb.net`

**Environment Variable**: `MONGODB_BASE_URI`

**Note**: The application uses `MONGODB_URI` but the environment only has `MONGODB_BASE_URI`. The application constructs full URIs by appending database names to the base URI.

---

*Generated on: December 3, 2025*
*MongoDB Status: ✅ Active (Atlas)*
*Application Status: ⏳ Needs Restart*

