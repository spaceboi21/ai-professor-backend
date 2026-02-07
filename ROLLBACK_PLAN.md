# Rollback Plan - Comprehensive Assessment System

**Date**: February 7, 2026  
**Version**: 1.0  
**Status**: Emergency Use Only

---

## 🚨 When to Rollback

Rollback if ANY of the following occur:

1. **Critical Production Issues**:
   - Assessment generation fails for >50% of sessions
   - Backend crashes repeatedly
   - Database corruption detected
   - Data leakage between students

2. **Data Integrity Issues**:
   - Attempt tracking not working
   - Patient memory cross-contamination
   - Assessment scores incorrect/missing

3. **Performance Issues**:
   - Assessment timeouts >120s consistently
   - Backend response times >5s
   - Database queries failing

4. **User-Facing Issues**:
   - Students cannot complete sessions
   - Professors cannot validate assessments
   - Frontend errors due to API changes

---

## 📋 Pre-Rollback Checklist

**BEFORE** performing rollback:

- [ ] Document the issue (screenshots, logs, error messages)
- [ ] Notify all stakeholders (user, AI team, frontend team)
- [ ] Backup current database state
- [ ] Save current PM2 logs
- [ ] Note the current git commit hash

---

## 🔄 Rollback Procedure

### Step 1: Backup Current State

```bash
# 1. Save current git commit
cd /opt/ai/ai-professor-backend
git log -1 --oneline > /tmp/rollback_from_commit.txt

# 2. Backup database (all tenant databases)
node -e "
const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.CENTRAL_DB_URI);
  const db = mongoose.connection.db;
  const schools = await db.collection('schools').find({ deleted_at: null }).toArray();
  
  console.log('Backup these databases:');
  schools.forEach(s => console.log('  -', s.db_name));
  
  await mongoose.connection.close();
})();
"

# 3. Save PM2 logs
pm2 logs ai-professor-backend-5000 --lines 500 --nostream > /tmp/rollback_backend_logs.txt
pm2 logs ai-professor-python --lines 500 --nostream > /tmp/rollback_python_logs.txt

# 4. Backup .env file
cp .env /tmp/rollback_env_backup
```

---

### Step 2: Revert Code Changes

```bash
cd /opt/ai/ai-professor-backend

# Get the commit BEFORE Phase 1 started
# (This is commit: 8a2952c - "Phase 1.2: Add migration script")
ROLLBACK_TO_COMMIT="df5b229"  # Before all Phase 1-3 changes

# Revert to previous commit
git reset --hard $ROLLBACK_TO_COMMIT

# Verify rollback
git log --oneline -5
```

**Expected commits after rollback**:
```
df5b229 added new features
318fd95 fix feedback generation
...
```

---

### Step 3: Rebuild Backend

```bash
cd /opt/ai/ai-professor-backend

# Rebuild with old code
yarn build

# If build fails, clear node_modules
rm -rf node_modules dist
yarn install
yarn build
```

---

### Step 4: Restart Backend

```bash
# Restart PM2
pm2 restart ai-professor-backend-5000

# Wait for startup
sleep 5

# Check status
pm2 status

# Check logs for errors
pm2 logs ai-professor-backend-5000 --lines 50
```

---

### Step 5: Verify Rollback

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test basic endpoints (should work with old structure)
# GET /api/internship
# GET /api/internship/{id}/cases
```

---

### Step 6: Database Cleanup (OPTIONAL)

**⚠️ DANGER ZONE - Only if necessary**

If the new schema fields cause issues, you may need to remove them:

```bash
node -e "
const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.CENTRAL_DB_URI);
    const db = mongoose.connection.db;
    const schools = await db.collection('schools').find({ deleted_at: null }).toArray();
    
    console.log('🚨 CLEANING UP NEW FIELDS (IRREVERSIBLE)\\n');
    
    for (const school of schools) {
      const tenantDb = mongoose.connection.useDb(school.db_name);
      
      // Remove new fields from InternshipCase
      const result = await tenantDb.collection('internshipcases').updateMany(
        {},
        {
          \$unset: {
            step: '',
            case_type: '',
            patient_base_id: '',
            sequence_in_step: '',
            emdr_phase_focus: '',
            session_narrative: '',
            assessment_criteria: '',
            literature_references: '',
            pass_threshold: '',
            patient_state: ''
          }
        }
      );
      
      console.log(\`✅ \${school.name}: Cleaned \${result.modifiedCount} cases\`);
    }
    
    // Drop new collections (if they cause issues)
    for (const school of schools) {
      const tenantDb = mongoose.connection.useDb(school.db_name);
      
      try {
        await tenantDb.dropCollection('internship_case_attempts');
        console.log(\`✅ \${school.name}: Dropped internship_case_attempts\`);
      } catch (e) {
        console.log(\`⏭️  \${school.name}: internship_case_attempts not found\`);
      }
    }
    
    await mongoose.connection.close();
    console.log('\\n✅ Cleanup complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
"
```

**⚠️ WARNING**: This is **IRREVERSIBLE** and will **DELETE ALL**:
- Attempt history
- Assessment history
- Patient progression data
- New case fields

**Only run this if absolutely necessary!**

---

## 🔄 Rollback Alternatives (Safer)

### Alternative 1: Feature Flag Disable Only

If only real-time tips or specific features are problematic:

```bash
# Disable feature flags
echo "ENABLE_REALTIME_TIPS=false" >> .env

# Restart
pm2 restart ai-professor-backend-5000
```

### Alternative 2: Partial Rollback

Rollback specific files only:

```bash
# Revert only feedback service
git checkout df5b229 -- src/modules/internship/internship-feedback.service.ts

# Rebuild and restart
yarn build
pm2 restart ai-professor-backend-5000
```

### Alternative 3: Forward Fix

If the issue is small, fix forward instead of rolling back:

```bash
# Create hotfix branch
git checkout -b hotfix/assessment-issue

# Make fix
# ...

# Build and test
yarn build
pm2 restart ai-professor-backend-5000

# If works, merge and push
git commit -m "Hotfix: Fix assessment issue"
git push origin hotfix/assessment-issue
```

---

## 📊 Post-Rollback Verification

After rollback, verify:

### 1. Backend Health
```bash
# Status check
pm2 status
pm2 logs ai-professor-backend-5000 --lines 30

# Health endpoint
curl http://localhost:3000/api/health
```

**Expected**: `{"status":"ok"}`

### 2. Core Functionality
```bash
# Get internships (with auth token)
curl -H "Authorization: Bearer {token}" http://localhost:3000/api/internship

# Get cases
curl -H "Authorization: Bearer {token}" http://localhost:3000/api/internship/{id}/cases
```

**Expected**: Old structure (without new fields)

### 3. Sessions Still Work
- Create session
- Send messages
- Complete session
- Verify old feedback generation works

### 4. No Errors in Logs
```bash
pm2 logs ai-professor-backend-5000 --err --lines 50
```

**Expected**: No critical errors

---

## 🔍 Root Cause Analysis

After rollback, investigate:

1. **What went wrong?**
   - Exact error messages
   - Which phase caused the issue
   - User reports

2. **Why did it go wrong?**
   - Missing dependency?
   - AI server issue?
   - Database schema conflict?
   - Frontend compatibility?

3. **How to prevent in future?**
   - More testing?
   - Gradual rollout?
   - Better monitoring?

---

## 📝 Rollback Communication Template

**Email/Message to Stakeholders**:

```
Subject: [URGENT] AI Professor Backend Rollback - Comprehensive Assessment System

Dear Team,

We have performed an emergency rollback of the Comprehensive Assessment System due to [ISSUE DESCRIPTION].

Timeline:
- Issue Detected: [TIME]
- Rollback Started: [TIME]
- Rollback Completed: [TIME]
- System Restored: [TIME]

Current Status:
- Backend: STABLE (old version restored)
- Database: [CLEANED / UNCHANGED]
- Data Loss: [YES/NO - describe if yes]

Impact:
- Students: [DESCRIBE]
- Professors: [DESCRIBE]
- Data: [DESCRIBE]

Next Steps:
1. Root cause analysis underway
2. Fix will be developed offline
3. Testing before re-deployment
4. ETA for fix: [DATE]

Apologies for the disruption.

Best regards,
Backend Team
```

---

## 🛡️ Prevention Checklist

To avoid needing rollbacks in future:

- [ ] More comprehensive testing before production
- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Feature flags for all major changes
- [ ] Database migration dry-runs
- [ ] Staging environment testing
- [ ] Load testing before production
- [ ] Monitoring alerts configured
- [ ] Backup procedures automated

---

## 📞 Emergency Contacts

- **Backend Lead**: [YOUR CONTACT]
- **AI Server Team**: [AI TEAM CONTACT]
- **Frontend Team**: [FRONTEND CONTACT]
- **Database Admin**: [DBA CONTACT]

---

## 🔗 Useful Commands Reference

```bash
# View current commit
git log -1 --oneline

# View recent commits
git log --oneline -10

# Check file diff
git diff HEAD~1 src/modules/internship/internship-feedback.service.ts

# Revert specific commit (safer than reset)
git revert {commit-hash}

# Reset to specific commit (DANGEROUS)
git reset --hard {commit-hash}

# Force push (if already pushed)
git push origin main --force  # ⚠️ DANGER

# Check PM2 status
pm2 status
pm2 logs ai-professor-backend-5000
pm2 restart ai-professor-backend-5000

# Check database
mongo "mongodb+srv://..." --eval "db.internshipcases.findOne()"
```

---

## ✅ Rollback Success Criteria

Rollback is **complete and successful** when:

- [ ] Backend running without errors
- [ ] All core features working (sessions, feedback, cases)
- [ ] No critical errors in logs
- [ ] Database queries successful
- [ ] Frontend can interact with backend
- [ ] Students can complete sessions
- [ ] Professors can validate feedback
- [ ] No data corruption detected

---

**Version**: 1.0  
**Last Updated**: February 7, 2026  
**Status**: Emergency Use Only  
**Severity**: HIGH - Use only when necessary
