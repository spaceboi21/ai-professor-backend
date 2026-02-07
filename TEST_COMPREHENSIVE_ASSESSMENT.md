# Comprehensive Assessment System - Testing Guide

**Date**: February 7, 2026  
**Version**: 1.0  
**Status**: Ready for Testing

---

## 🎯 Test Scenarios

### Scenario 1: Step 1 (Isolated Case) - Basic Assessment

**Objective**: Verify comprehensive assessment works for isolated cases with unlimited retries.

#### Test Steps:

1. **Create Step 1 Case**

```bash
POST /api/internship/{internshipId}/cases
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Test Case - Mathilde Perez",
  "description": "EMDR Phase 1-2 practice",
  "sequence": 1,
  "step": 1,
  "case_type": "isolated",
  "patient_base_id": null,
  "sequence_in_step": 1,
  "assessment_criteria": [
    {
      "criterion_id": "anamnesis",
      "name": "Anamnesis",
      "description": "Complete trauma/symptoms collection",
      "max_points": 25,
      "reference_literature": "Shapiro EMDR Manual p.145",
      "ko_example": "Ignores bullying history",
      "ok_example": "Documents all traumas correctly"
    },
    {
      "criterion_id": "stability",
      "name": "Stability Assessment",
      "description": "Risk/resources evaluation",
      "max_points": 25,
      "reference_literature": "Shapiro EMDR Manual p.148"
    },
    {
      "criterion_id": "target_hierarchy",
      "name": "Target Hierarchy",
      "description": "Logical trauma target ordering",
      "max_points": 25,
      "reference_literature": "Shapiro EMDR Manual p.150"
    },
    {
      "criterion_id": "empathy",
      "name": "Empathic Posture",
      "description": "Emotion validation, reformulation",
      "max_points": 25,
      "reference_literature": "Rogers active listening"
    }
  ],
  "literature_references": [
    {
      "title": "Shapiro EMDR Manual",
      "type": "book",
      "relevant_pages": "p.145-155",
      "pinecone_namespace": "baby-ai",
      "priority": "primary"
    }
  ],
  "pass_threshold": 70,
  "patient_simulation_config": {
    "patient_profile": {
      "name": "Mathilde Perez",
      "age": 18,
      "condition": "PTSD",
      "trauma_summary": "Flute teacher violence 8-12yo"
    },
    "scenario_type": "emdr_therapy",
    "difficulty_level": "intermediate"
  }
}
```

**Expected**: `201 Created`, case created with all new fields.

---

2. **Create Session**

```bash
POST /api/internship/sessions
Authorization: Bearer {token}
Content-Type: application/json

{
  "internship_id": "{internshipId}",
  "case_id": "{caseId}",
  "session_type": "practice"
}
```

**Expected**: `201 Created`, session created with session_id.

---

3. **Send Messages (10-15 messages)**

```bash
POST /api/internship/sessions/{sessionId}/message
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "Bonjour Mathilde, comment allez-vous aujourd'hui?"
}
```

**Expected**: `200 OK`, AI patient response.

*Repeat 10-15 times to simulate a real conversation.*

---

4. **Complete Session**

```bash
POST /api/internship/sessions/{sessionId}/complete
Authorization: Bearer {token}
```

**Expected**: 
- `200 OK`
- Automatic comprehensive assessment generation
- Response includes:
  ```json
  {
    "message": "Session completed successfully",
    "data": {
      "session": {...},
      "feedback": {
        "id": "...",
        "status": "pending_validation",
        "overall_score": 75
      }
    }
  }
  ```

---

5. **Get Assessment**

```bash
GET /api/internship/sessions/{sessionId}/feedback
Authorization: Bearer {token}
```

**Expected**: `200 OK` with comprehensive assessment:
```json
{
  "data": {
    "ai_feedback": {
      "overall_score": 75,
      "grade": "C",
      "pass_fail": "PASS",
      "pass_threshold": 70,
      "criteria_scores": [
        {
          "criterion_id": "anamnesis",
          "criterion_name": "Anamnesis",
          "points_earned": 20,
          "points_max": 25,
          "percentage": 80,
          "feedback": "Bonne collecte des traumatismes...",
          "evidence_from_conversation": [
            "Message 5: 'Pouvez-vous me décrire...'"
          ]
        },
        // ... 3 more criteria
      ],
      "strengths": ["Good trauma identification", "Protocol adherence"],
      "areas_for_improvement": ["Active listening needs work"],
      "recommendations_next_session": ["Practice safe place installation", "Review Shapiro p.160-170"],
      "evolution_vs_previous_attempts": "First attempt",
      "literature_adherence": {
        "Shapiro EMDR Manual": "Protocole Phase 1 correctement suivi..."
      }
    }
  }
}
```

---

6. **Check Attempt History**

```bash
GET /api/internship/cases/{caseId}/attempts
Authorization: Bearer {token}
```

**Expected**: `200 OK` with attempt tracking:
```json
{
  "total_attempts": 1,
  "best_score": 75,
  "average_score": 75,
  "current_status": "passed",
  "attempts": [
    {
      "attempt_number": 1,
      "assessment_score": 75,
      "grade": "C",
      "pass_fail": "PASS",
      "pass_threshold": 70,
      "key_learnings": ["Good trauma identification", "Protocol adherence"],
      "mistakes_made": ["Active listening needs work"],
      "strengths": ["Good trauma identification"],
      "areas_for_improvement": ["Active listening"],
      "completed_at": "2026-02-07T10:00:00Z"
    }
  ]
}
```

---

7. **Retry Same Case (Unlimited Retries)**

Repeat steps 2-6 to create a second attempt.

**Expected**: 
- Second session can be created
- Second assessment generated
- Attempt history shows:
  ```json
  {
    "total_attempts": 2,
    "best_score": 80,  // If second attempt scored higher
    "average_score": 77.5,
    "current_status": "passed",
    "attempts": [
      {
        "attempt_number": 1,
        "assessment_score": 75,
        ...
      },
      {
        "attempt_number": 2,
        "assessment_score": 80,
        "evolution_vs_previous_attempts": "Amélioration de 5 points..."
        ...
      }
    ]
  }
  ```

---

### Scenario 2: Step 2 (Progressive) - Patient Evolution Tracking

**Objective**: Verify patient remembers previous sessions and evolution is tracked.

#### Test Steps:

1. **Create Step 2 Case 1 (Phase 1-2)**

```bash
POST /api/internship/{internshipId}/cases
{
  "title": "Brigitte Fenurel - Phase 1-2",
  "step": 2,
  "case_type": "progressive",
  "patient_base_id": "brigitte_fenurel",  // ⚠️ SAME patient across cases
  "sequence_in_step": 1,
  "emdr_phase_focus": "Phase 1-2",
  "assessment_criteria": [...],  // 100 points total
  "patient_state": {
    "current_sud": 8,
    "current_voc": 1,
    "safe_place_established": false,
    "trauma_targets_resolved": [],
    "techniques_mastered": []
  }
}
```

---

2. **Complete First Session**

- Create session, send messages, complete session
- **Verify**: Assessment generated, patient state updated

---

3. **Create Step 2 Case 2 (Phase 3-4)**

```bash
POST /api/internship/{internshipId}/cases
{
  "title": "Brigitte Fenurel - Phase 3-4",
  "step": 2,
  "case_type": "progressive",
  "patient_base_id": "brigitte_fenurel",  // ⚠️ SAME patient
  "sequence_in_step": 2,
  "emdr_phase_focus": "Phase 3-4",
  "patient_state": {
    "current_sud": 6,
    "current_voc": 2,
    "safe_place_established": true,  // From previous session
    "trauma_targets_resolved": [],
    "techniques_mastered": ["anamnesis", "safe_place"]
  }
}
```

---

4. **Start Second Session & Verify Patient Memory**

```bash
POST /api/internship/sessions
{
  "case_id": "{case2Id}",
  "session_type": "practice"
}

# Send first message
POST /api/internship/sessions/{sessionId}/message
{
  "message": "Bonjour Brigitte, comment vous sentez-vous?"
}
```

**Expected AI Response**:
> "Bonjour docteur. *sourire calme* Je me sens mieux depuis notre dernière séance. Le lieu sûr que nous avons établi - la plage au coucher de soleil - m'aide beaucoup. Mon SUD est descendu à 4 maintenant."

**✅ Patient remembers**:
- Previous session
- Safe place established
- SUD progression

---

5. **Complete Second Session & Check Progression**

```bash
POST /api/internship/sessions/{sessionId}/complete

# Get patient progression
GET /api/internship/patient-progression/brigitte_fenurel/{studentId}
Authorization: Bearer {token}
```

**Expected**: `200 OK` with progression history:
```json
{
  "found": true,
  "patient_base_id": "brigitte_fenurel",
  "progression_history": [
    {
      "case_id": "...",
      "case_title": "Brigitte Fenurel - Phase 1-2",
      "step": 2,
      "sequence_in_step": 1,
      "emdr_phase_focus": "Phase 1-2",
      "attempts": [
        {
          "attempt_number": 1,
          "assessment_score": 80,
          "pass_fail": "PASS",
          "completed_at": "2026-02-06T10:00:00Z"
        }
      ],
      "best_score": 80,
      "current_status": "passed"
    },
    {
      "case_id": "...",
      "case_title": "Brigitte Fenurel - Phase 3-4",
      "step": 2,
      "sequence_in_step": 2,
      "emdr_phase_focus": "Phase 3-4",
      "attempts": [
        {
          "attempt_number": 1,
          "assessment_score": 85,
          "pass_fail": "PASS",
          "completed_at": "2026-02-07T10:00:00Z"
        }
      ],
      "best_score": 85,
      "current_status": "passed"
    }
  ]
}
```

---

### Scenario 3: Feature Flag - Real-Time Tips

**Objective**: Verify real-time tips are disabled by default.

#### Test Steps:

1. **Check Backend Logs**

```bash
pm2 logs ai-professor-backend-5000 | grep "Real-time tips"
```

**Expected**: `⚠️ Real-time tips DISABLED via feature flag`

---

2. **Send Messages in Session**

- Send 10+ messages
- **Expected**: No realtime_tips in session.messages

---

3. **Enable Feature Flag (Emergency Test)**

```bash
echo "ENABLE_REALTIME_TIPS=true" >> .env
pm2 restart ai-professor-backend-5000
pm2 logs ai-professor-backend-5000 | grep "Real-time tips"
```

**Expected**: `✅ Real-time tips ENABLED`

---

4. **Send Messages in New Session**

- Create new session, send messages
- **Expected**: realtime_tips array populated (if triggered)

---

5. **Disable Again**

```bash
# Remove from .env or set to false
pm2 restart ai-professor-backend-5000
```

---

## 🧪 Automated Test Script

Save as `test-comprehensive-assessment.sh`:

```bash
#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000/api"
TOKEN="YOUR_JWT_TOKEN"

echo -e "${YELLOW}🧪 Starting Comprehensive Assessment Tests${NC}\n"

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health)
if [ "$RESPONSE" -eq 200 ]; then
  echo -e "${GREEN}✅ Health check passed${NC}\n"
else
  echo -e "${RED}❌ Health check failed (HTTP $RESPONSE)${NC}\n"
  exit 1
fi

# Test 2: Get Internships (requires auth)
echo -e "${YELLOW}Test 2: Get Internships${NC}"
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" $API_URL/internship)
if echo "$RESPONSE" | grep -q "data"; then
  echo -e "${GREEN}✅ Can retrieve internships${NC}\n"
else
  echo -e "${RED}❌ Failed to retrieve internships${NC}\n"
  echo "$RESPONSE"
fi

# Test 3: Create Test Case (Step 1)
echo -e "${YELLOW}Test 3: Create Test Case (Step 1)${NC}"
INTERNSHIP_ID=$(echo "$RESPONSE" | jq -r '.data[0]._id')

if [ "$INTERNSHIP_ID" != "null" ] && [ "$INTERNSHIP_ID" != "" ]; then
  CREATE_CASE_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Test Case - Comprehensive Assessment",
      "description": "Automated test case",
      "sequence": 999,
      "step": 1,
      "case_type": "isolated",
      "patient_base_id": null,
      "sequence_in_step": 1,
      "assessment_criteria": [
        {
          "criterion_id": "test_criterion_1",
          "name": "Test Criterion 1",
          "description": "Test description",
          "max_points": 50
        },
        {
          "criterion_id": "test_criterion_2",
          "name": "Test Criterion 2",
          "description": "Test description",
          "max_points": 50
        }
      ],
      "pass_threshold": 70,
      "patient_simulation_config": {
        "patient_profile": {
          "name": "Test Patient",
          "age": 30,
          "condition": "Test"
        },
        "scenario_type": "test",
        "difficulty_level": "test"
      }
    }' \
    "$API_URL/internship/$INTERNSHIP_ID/cases")
  
  if echo "$CREATE_CASE_RESPONSE" | grep -q "Test Case"; then
    echo -e "${GREEN}✅ Test case created${NC}\n"
    CASE_ID=$(echo "$CREATE_CASE_RESPONSE" | jq -r '.data._id')
  else
    echo -e "${RED}❌ Failed to create test case${NC}\n"
    echo "$CREATE_CASE_RESPONSE"
  fi
else
  echo -e "${YELLOW}⏭️  Skipping case creation (no internship found)${NC}\n"
fi

# Test 4: Get Attempt History (should be empty initially)
if [ "$CASE_ID" != "null" ] && [ "$CASE_ID" != "" ]; then
  echo -e "${YELLOW}Test 4: Get Attempt History${NC}"
  ATTEMPTS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "$API_URL/internship/cases/$CASE_ID/attempts")
  
  if echo "$ATTEMPTS_RESPONSE" | grep -q "total_attempts"; then
    echo -e "${GREEN}✅ Attempt history endpoint working${NC}\n"
    echo "Attempts: $(echo "$ATTEMPTS_RESPONSE" | jq -r '.total_attempts')"
  else
    echo -e "${YELLOW}⚠️  Attempt history not found (expected for new case)${NC}\n"
  fi
else
  echo -e "${YELLOW}⏭️  Skipping attempt history test${NC}\n"
fi

echo -e "${GREEN}🎉 Tests completed!${NC}\n"
echo -e "${YELLOW}Note: Full end-to-end testing requires:${NC}"
echo "  - Completing a session"
echo "  - AI server running"
echo "  - Valid JWT token"
```

---

## 📊 Expected Results Summary

### ✅ Success Criteria

| Test | Expected Result | Status |
|------|----------------|--------|
| Backend running | PM2 status = online | ✅ |
| Health check | /api/health returns 200 | ✅ |
| Case creation | Step 1 case with new fields | ⏳ Test |
| Session completion | Auto-generates assessment | ⏳ Test |
| Assessment format | All criteria scores present | ⏳ Test |
| Attempt tracking | Unlimited retries | ⏳ Test |
| Patient evolution | AI remembers (Steps 2-3) | ⏳ Test |
| Real-time tips | Disabled by default | ✅ |

---

## 🐛 Troubleshooting

### Issue: Assessment Not Generated

**Symptoms**: Session completes but no feedback

**Solutions**:
1. Check Python AI server running: `pm2 logs ai-professor-python`
2. Verify AI server has comprehensive assessment endpoint
3. Check backend logs: `pm2 logs ai-professor-backend-5000`
4. Look for timeout errors (120s limit)

### Issue: Attempt History Empty

**Symptoms**: GET /cases/{caseId}/attempts returns empty

**Solutions**:
1. Verify session was completed
2. Check feedback was generated
3. Verify `trackAttempt` was called (check logs)
4. Check database: `InternshipCaseAttempts` collection

### Issue: Patient Doesn't Remember

**Symptoms**: AI doesn't reference previous sessions (Steps 2-3)

**Solutions**:
1. Verify `patient_base_id` is set on case
2. Verify `step` >= 2
3. Check `trackPatientSession` was called (check logs)
4. Verify Python AI server has patient progression data

---

## 📝 Test Checklist

### Pre-Testing
- [ ] Backend deployed and running
- [ ] Python AI server running
- [ ] Database migrated (31 cases)
- [ ] .env file configured

### Step 1 Tests
- [ ] Create Step 1 case with new fields
- [ ] Complete session
- [ ] Verify assessment generated
- [ ] Check all criteria scores present
- [ ] Verify attempt tracking
- [ ] Retry same case
- [ ] Verify unlimited retries work

### Step 2 Tests
- [ ] Create Step 2 cases (same patient_base_id)
- [ ] Complete first session
- [ ] Create second session
- [ ] Verify AI remembers previous session
- [ ] Check patient progression endpoint
- [ ] Verify SUD/VOC progression

### Step 3 Tests
- [ ] Create Step 3 cases (non-linear)
- [ ] Complete multiple sessions
- [ ] Verify realistic therapy evolution
- [ ] Check regression handling
- [ ] Verify breakthrough tracking

### API Tests
- [ ] GET /cases/:caseId/attempts works
- [ ] GET /student/:studentId/attempts works
- [ ] GET /patient-progression works
- [ ] Student can only view own attempts
- [ ] Professor can view all attempts

### Feature Flag Tests
- [ ] Real-time tips disabled by default
- [ ] Can enable via .env
- [ ] Disabling removes tips from sessions

---

**Version**: 1.0  
**Last Updated**: February 7, 2026  
**Status**: Ready for Testing
