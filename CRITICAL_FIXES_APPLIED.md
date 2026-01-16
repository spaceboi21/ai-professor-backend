# Critical Backend Fixes Applied

## Date: December 14, 2025

## Issues Fixed

### 1. ✅ Session Creation Validation Error (422)

**Problem**: When therapists clicked "Start Session", they got a 422 validation error:
```
Error: Python API validation failed: 
- body.scenario_config.scenario_type - Input should be 'initial_clinical_interview', 'follow_up_session', 'crisis_intervention', 'assessment_session' or 'therapy_session'
- body.scenario_config.difficulty_level - Input should be 'beginner', 'intermediate', 'advanced' or 'expert'
```

The issue was that `scenario_type` was being stored as a long French text instead of an enum value, and `difficulty_level` was in French ("débutant") instead of English ("beginner").

**Solution**:
- Created `/src/modules/internship/utils/enum-mapping.util.ts` with comprehensive French-to-English mapping functions
- Updated `internship-case.service.ts` to normalize enum values when creating/updating cases
- Updated `internship-session.service.ts` to normalize enum values before sending to Python API
- Automatic translation of:
  - `scenario_type`: Maps French keywords → English enums (e.g., "entretien initial" → "initial_clinical_interview")
  - `difficulty_level`: Maps French → English (e.g., "débutant" → "beginner", "intermédiaire" → "intermediate")

**Files Modified**:
- `src/modules/internship/utils/enum-mapping.util.ts` (NEW)
- `src/modules/internship/internship-case.service.ts`
- `src/modules/internship/internship-session.service.ts`

---

### 2. ✅ Internship Access Control (Year Filtering)

**Problem**: Internships were visible to ALL students regardless of their year assignment. A student in Year 1 could see and access Year 3 internships.

**Root Cause**: The `findInternshipById()` method in `internship.service.ts` was NOT checking:
- Student's year
- Published status

It only checked if the internship was not deleted, allowing direct access bypassing the list filtering.

**Solution**:
- Updated `findInternshipById()` to enforce year-based access control for students
- Students can now ONLY access internships where:
  - `published = true`
  - `year = student.year`
- Non-student roles (professors, admins) retain full access

**Files Modified**:
- `src/modules/internship/internship.service.ts`

**Code Changes**:
```typescript
// Before: No access control
const internship = await InternshipModel.findOne({
  _id: new Types.ObjectId(id.toString()),
  deleted_at: null,
}).lean();

// After: Enforced year-based access control
const query: any = {
  _id: new Types.ObjectId(id.toString()),
  deleted_at: null,
};

if (user.role.name === RoleEnum.STUDENT) {
  const student = await StudentModel.findOne({
    _id: new Types.ObjectId(user.id),
    deleted_at: null,
  }).select('year');
  
  query.published = true;
  query.year = student.year;
}

const internship = await InternshipModel.findOne(query).lean();
```

---

### 3. ✅ Case Content Visibility (Data Privacy)

**Problem**: Students could see ALL case details including:
- `case_content` (the detailed prompt/scenario written by teacher)
- `patient_simulation_config` (internal AI configuration)
- `supervisor_prompts` (teacher's evaluation prompts)
- `therapist_prompts` (teacher's guidance prompts)
- `evaluation_criteria` (how they will be graded)

This violated the learning experience as students could see the "answer key" and internal evaluation rubrics.

**Solution**:
- Updated `findCaseById()` to filter sensitive fields for students
- Updated `findCasesByInternship()` to filter sensitive fields for students
- Students now ONLY see:
  - `_id`, `internship_id`, `title`, `description`
  - `case_documents` (PDFs, images uploaded by teacher)
  - `sequence`, `created_by`, `created_at`, `updated_at`
- All sensitive teacher/admin fields are hidden from student view

**Files Modified**:
- `src/modules/internship/internship-case.service.ts`

**What Students See Now**:
```json
{
  "_id": "...",
  "internship_id": "...",
  "title": "Case 1: Anxiety Disorder",
  "description": "Patient presenting with severe anxiety symptoms",
  "case_documents": [
    {
      "url": "https://...",
      "type": "pdf",
      "name": "Medical Records"
    }
  ],
  "sequence": 1
}
```

**What Students NO LONGER See**:
- ❌ `case_content` (detailed prompt)
- ❌ `patient_simulation_config` (AI configuration)
- ❌ `supervisor_prompts` (evaluation prompts)
- ❌ `therapist_prompts` (guidance prompts)
- ❌ `evaluation_criteria` (grading rubric)

---

## Impact Summary

| Issue | Impact | Status |
|-------|--------|--------|
| Session creation failing with 422 error | HIGH - Blocking core functionality | ✅ FIXED |
| Students seeing internships from other years | HIGH - Security/Access Control | ✅ FIXED |
| Students seeing teacher prompts and rubrics | CRITICAL - Data Privacy | ✅ FIXED |

---

## How to Apply These Fixes

### Step 1: Rebuild the Application

```bash
cd /opt/ai/ai-professor-backend
npm run build
```

This compiles the TypeScript changes to JavaScript in the `dist/` directory.

### Step 2: Restart the Service

Based on your setup with PM2:

```bash
# Option 1: Restart specific process
pm2 restart ai-professor-backend-5000

# Option 2: Restart all processes
pm2 restart all

# Option 3: If using ecosystem file
pm2 reload ecosystem.config.js
```

Check the logs to ensure successful restart:

```bash
pm2 logs ai-professor-backend-5000 --lines 50
```

### Step 3: Verify the Fixes

1. **Test Session Creation**:
   - Login as a student
   - Navigate to an internship case
   - Click "Démarrer la Simulation"
   - Should create session successfully without 422 error

2. **Test Year Filtering**:
   - Login as a Year 1 student
   - Try to access Year 2/3 internships by direct URL/ID
   - Should get "Internship not found" error

3. **Test Case Privacy**:
   - Login as a student
   - View a case detail
   - Should NOT see `case_content`, `evaluation_criteria`, or prompts
   - Should ONLY see title, description, and case_documents

---

## Technical Details

### Enum Mapping Logic

The new `enum-mapping.util.ts` provides intelligent mapping:

**Difficulty Levels**:
- French: `débutant`, `intermédiaire`, `avancé`, `expert`
- English: `beginner`, `intermediate`, `advanced`, `expert`

**Scenario Types**:
- Keyword matching for French text → English enums
- Examples:
  - "entretien initial" → `initial_clinical_interview`
  - "suivi" → `follow_up_session`
  - "crise" → `crisis_intervention`
  - "évaluation" → `assessment_session`
  - "thérapie" → `therapy_session`

**Interview Focus**:
- `assessment_and_diagnosis`
- `treatment_planning`
- `rapport_building`
- `symptom_monitoring`
- `crisis_assessment`

**Patient Openness**:
- `very_forthcoming`
- `moderately_forthcoming`
- `guarded`
- `very_resistant`

### Normalization Flow

```
1. Teacher creates/updates case with French values
   ↓
2. Backend normalizes enums to English (internship-case.service.ts)
   ↓
3. Case saved to MongoDB with English enums
   ↓
4. Student starts session
   ↓
5. Backend reads case from MongoDB
   ↓
6. Backend normalizes again (extra safety layer)
   ↓
7. Backend sends to Python API with valid English enums
   ↓
8. Python API accepts and creates session ✅
```

---

## Rollback Instructions

If any issues occur, you can rollback by:

1. **Restore from Git**:
```bash
cd /opt/ai/ai-professor-backend
git checkout HEAD~1  # Go back one commit
npm run build
pm2 restart all
```

2. **Disable Specific Features**:
- Comment out normalization in `internship-case.service.ts` (lines ~107-116, ~329-338)
- Comment out year filtering in `internship.service.ts` (lines ~549-573)
- Comment out case filtering in `internship-case.service.ts` (lines ~239-258, ~206-219)

---

## Future Recommendations

1. **Database Migration**: Consider migrating existing cases in the database to update any French enum values to English
   
2. **Validation Layer**: Add validation in DTOs to reject French values at the API level

3. **Frontend Updates**: Update frontend forms to only send English enum values

4. **Documentation**: Update API documentation to clearly specify valid enum values

5. **Testing**: Add integration tests for:
   - Year-based access control
   - Case privacy filtering
   - Enum normalization

---

## Questions or Issues?

If you encounter any problems after applying these fixes:

1. Check PM2 logs: `pm2 logs ai-professor-backend-5000`
2. Check build output for TypeScript errors
3. Verify the dist/ directory was updated: `ls -lah dist/src/modules/internship/`
4. Test with curl or Postman to isolate frontend vs backend issues

---

**All changes have been made with backward compatibility in mind. Existing data should continue to work, and the normalization will handle both old and new formats.**

