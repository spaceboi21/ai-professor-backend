# Quick Coordination Guide - Session Management

## 🎯 What Each Server/Team Needs to Do

---

## 1️⃣ NestJS Backend (Your Current Server)

### Status: ✅ **COMPLETE - NO ACTION NEEDED**

Everything is implemented and ready. The service is already running via nginx/gunicorn.

**What was done:**
- Pause/resume session functionality
- Session timer tracking
- Multi-session support
- Session history
- Non-verbal actions support (sends to Python)

---

## 2️⃣ Python AI Backend (Different Server)

### Status: ⚠️ **ACTION REQUIRED**

**What needs to be updated:**

**ONE endpoint needs a small change:**

`POST /api/v1/internship/patient/message`

**Add ONE optional field:**
```python
class PatientMessageRequest(BaseModel):
    session_id: str
    student_message: str
    context: dict
    therapist_actions: Optional[List[str]] = []  # ← ADD THIS LINE
```

**Then use it in the response:**
- Include actions in AI prompt
- Adjust patient response to acknowledge actions (e.g., "Thank you for the tissue")
- Adjust rapport level based on actions (+1 or +2 for appropriate actions)

**Time Estimate:** 1-2 hours

**Detailed Prompt:** See `PROMPTS_FOR_OTHER_TEAMS.md` (Python section)

---

## 3️⃣ Frontend (Student Interface)

### Status: ⚠️ **ACTION REQUIRED**

**Critical features to implement:**

### A. Before Starting Session (MOST IMPORTANT)
```typescript
// ALWAYS check for active/paused session before creating new one
GET /api/internship/cases/{caseId}/sessions/active

if (has_active_session) {
  // Resume or continue existing session
} else {
  // Create new session
}
```

### B. Session Controls
- Add "⏸️ Pause" button (when active)
- Add "▶️ Resume" button (when paused)

### C. Session Timer
- Poll `/sessions/{sessionId}/timer` every 15 seconds
- Display: "Active Time: 35:42"
- Show warning when < 5 minutes remaining

### D. Non-Verbal Actions (Optional but Recommended)
- Add action buttons: "Offered tissue", "Maintained eye contact", etc.
- Send selected actions with message

### E. Session History Page
- Show all student's attempts
- Display statistics (total sessions, time spent, etc.)
- Allow resuming paused sessions

**Time Estimate:** 3-5 days

**Detailed Prompt:** See `PROMPTS_FOR_OTHER_TEAMS.md` (Frontend section)

---

## 4️⃣ Frontend (School Admin/Professor Interface)

### Status: ⚠️ **ACTION REQUIRED**

**What needs to be added:**

When creating/editing a case, add **Session Configuration** section:

```html
<h3>Session Configuration</h3>

<label>
  Session Duration (minutes)
  <input name="session_config.session_duration_minutes" defaultValue={60} />
</label>

<label>
  Maximum Sessions Allowed
  <input name="session_config.max_sessions_allowed" placeholder="Leave empty for unlimited" />
</label>

<label>
  <input type="checkbox" name="session_config.allow_pause" defaultChecked />
  Allow students to pause sessions
</label>

<label>
  Warning Before Timeout (minutes)
  <input name="session_config.warning_before_timeout_minutes" defaultValue={5} />
</label>
```

**Time Estimate:** 1-2 hours

**Detailed Prompt:** See `PROMPTS_FOR_OTHER_TEAMS.md` (Frontend section)

---

## 📋 Implementation Order (Recommended)

### Phase 1: Core Functionality (Week 1)
1. ✅ NestJS Backend (Done)
2. ⚠️ Python AI Backend - therapist_actions support (1-2 hours)
3. ⚠️ Frontend - Session start flow with active session check (Critical!)

### Phase 2: Session Management (Week 1-2)
4. ⚠️ Frontend - Pause/Resume buttons
5. ⚠️ Frontend - Session timer component
6. ⚠️ Frontend - Session history page

### Phase 3: Enhanced Features (Week 2)
7. ⚠️ Frontend - Non-verbal actions component
8. ⚠️ Admin Interface - Session configuration form

### Phase 4: Testing (Week 2-3)
9. Integration testing
10. User acceptance testing
11. Bug fixes and polish

---

## 🔗 API Communication Flow

```
┌──────────────┐
│   Frontend   │
│   (Student)  │
└───────┬──────┘
        │
        │ 1. Start Session (check active first!)
        │ 2. Send messages (with therapist_actions)
        │ 3. Pause/Resume
        │ 4. Get timer
        │ 5. Get history
        │
        ↓
┌──────────────────┐
│  NestJS Backend  │  ← Your current server (READY ✅)
└────────┬─────────┘
         │
         │ Forward therapist_actions
         │ to Python for AI processing
         │
         ↓
┌──────────────────┐
│ Python AI Backend│  ← Different server (NEEDS UPDATE ⚠️)
└──────────────────┘
```

---

## 🚨 Critical Integration Points

### 1. Session Start Flow
**Problem:** Students could create duplicate sessions  
**Solution:** Frontend MUST check for active sessions before creating new ones  
**Endpoint:** `GET /api/internship/cases/{caseId}/sessions/active`

### 2. Message Sending
**Problem:** Python API expects therapist_actions field  
**Solution:** Python backend must accept optional `therapist_actions` array  
**Backward Compatible:** Old requests (without field) still work

### 3. Session Timer
**Problem:** Timer needs to stay in sync  
**Solution:** Frontend polls timer endpoint every 10-30 seconds  
**Endpoint:** `GET /api/internship/sessions/{sessionId}/timer`

---

## 📞 Team Communication

### For Frontend Team
**Give them:**
- The Frontend section from `PROMPTS_FOR_OTHER_TEAMS.md`
- Access to `/api/docs` on your NestJS backend
- `API_QUICK_REFERENCE_SESSION_MANAGEMENT.md`

### For Python AI Team
**Give them:**
- The Python section from `PROMPTS_FOR_OTHER_TEAMS.md`
- `PYTHON_BACKEND_INTEGRATION_THERAPIST_ACTIONS.md`
- Your NestJS backend URL for testing

---

## 🧪 Testing Coordination

### Integration Test 1: Session Flow
```
Frontend → NestJS → Python

1. Frontend: Check for active session
2. Frontend: Create new session (if none active)
3. Frontend: Send message with therapist_actions
4. NestJS: Forward to Python
5. Python: Process and return response
6. NestJS: Store and return to frontend
7. Frontend: Display response

✅ Success: Message sent, actions acknowledged
```

### Integration Test 2: Pause/Resume
```
Frontend → NestJS

1. Frontend: Start session
2. Frontend: Pause session
3. NestJS: Update status to PAUSED, record time
4. Frontend: Resume session
5. NestJS: Update status to ACTIVE, calculate pause duration

✅ Success: Pause time NOT counted in active time
```

### Integration Test 3: Multi-Session
```
Frontend → NestJS

1. Frontend: Complete session #1
2. Frontend: Check active sessions (should be none)
3. Frontend: Start session #2
4. NestJS: Create with session_number = 2

✅ Success: Session history shows 2 attempts
```

---

## ⚠️ Common Pitfalls to Avoid

### Frontend Pitfalls
❌ **Don't:** Create new session without checking for active ones  
✅ **Do:** Always call `/sessions/active` first

❌ **Don't:** Calculate timer on frontend only  
✅ **Do:** Poll backend timer endpoint (source of truth)

❌ **Don't:** Allow message sending when PAUSED  
✅ **Do:** Disable input and show "Resume to continue"

### Python Backend Pitfalls
❌ **Don't:** Make therapist_actions required  
✅ **Do:** Make it optional with default empty list

❌ **Don't:** Break old requests  
✅ **Do:** Ensure backward compatibility

❌ **Don't:** Ignore actions in AI response  
✅ **Do:** Have patient acknowledge appropriate actions

---

## 📊 Success Metrics

**Week 1:**
- [ ] All teams have started implementation
- [ ] Python backend updated and tested
- [ ] Frontend has session check implemented

**Week 2:**
- [ ] Pause/resume working
- [ ] Timer displaying correctly
- [ ] Integration tests passing

**Week 3:**
- [ ] All features implemented
- [ ] User acceptance testing complete
- [ ] Ready for production

---

## 🎯 Quick Start Commands

### Give to Frontend Team:
```bash
# Open their cursor and paste the frontend prompt from PROMPTS_FOR_OTHER_TEAMS.md
```

### Give to Python Team:
```bash
# Open their cursor and paste the Python prompt from PROMPTS_FOR_OTHER_TEAMS.md
```

### Your NestJS Backend:
```bash
# Already done! ✅
# Service running via nginx/gunicorn
# No restart needed - changes will apply automatically
```

---

## 📁 Files to Share

**With Frontend Team:**
- `PROMPTS_FOR_OTHER_TEAMS.md` (Frontend section)
- `API_QUICK_REFERENCE_SESSION_MANAGEMENT.md`
- `SESSION_MANAGEMENT_IMPLEMENTATION.md` (Frontend Integration section)

**With Python Team:**
- `PROMPTS_FOR_OTHER_TEAMS.md` (Python section)
- `PYTHON_BACKEND_INTEGRATION_THERAPIST_ACTIONS.md`

**Keep for Reference:**
- `IMPLEMENTATION_COMPLETE.md`
- `DEPLOYMENT_SUMMARY_SESSION_MANAGEMENT.md`

---

## 🚀 Ready to Go!

1. ✅ Your NestJS backend is complete and running
2. 📱 Give frontend team their prompt
3. 🐍 Give Python team their prompt
4. 🧪 Coordinate integration testing
5. 🎉 Launch!

**Total Implementation Time: 1-2 weeks**

---

**Need Help?**  
All teams can refer to `/api/docs` on your NestJS backend for detailed API documentation.

