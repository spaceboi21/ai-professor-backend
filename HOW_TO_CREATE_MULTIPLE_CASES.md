# 📚 How to Create Multiple Cases for One Internship

## Quick Guide

This guide shows you exactly how to create multiple cases for a single internship.

---

## ✅ Step-by-Step Instructions

### Step 1: Create an Internship (Do Once)

```bash
POST /api/internship
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "Clinical Psychology Internship - Year 3",
  "description": "Comprehensive clinical psychology training",
  "year": 3,
  "duration": 40,
  "guidelines": "Students will practice diagnostic interviews..."
}
```

**Response:**
```json
{
  "message": "Internship created successfully",
  "data": {
    "_id": "673f1234567890abcdef1234",  // 👈 Save this ID!
    "title": "Clinical Psychology Internship - Year 3",
    ...
  }
}
```

**💡 Important:** Save the `_id` value - you'll use it for all cases!

---

### Step 2: Create Case #1 (Depression)

```bash
POST /api/internship/673f1234567890abcdef1234/cases
                     👆 Use the internship ID from Step 1
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "Case 1: Major Depressive Disorder",
  "description": "Patient John, 35-year-old male, presents with 6-week history of depressed mood",
  "sequence": 1,  // 👈 First case
  "case_content": "<h2>Patient Presentation</h2><p>Chief Complaint: 'I don't feel like myself anymore'</p>",
  "patient_simulation_config": {
    "patient_profile": {
      "name": "John Smith",
      "age": 35,
      "gender": "male",
      "condition": "Major Depressive Disorder",
      "severity": "moderate"
    },
    "scenario_type": "initial_clinical_interview",
    "difficulty_level": "intermediate"
  },
  "evaluation_criteria": [
    { "criterion": "Clinical Reasoning", "weight": 30 },
    { "criterion": "Communication Skills", "weight": 25 },
    { "criterion": "Empathy", "weight": 25 },
    { "criterion": "Assessment Technique", "weight": 20 }
  ]
}
```

**Response:**
```json
{
  "message": "Case created successfully",
  "data": {
    "_id": "673f5678901234abcdef5678",
    "internship_id": "673f1234567890abcdef1234",  // ✅ Linked to internship
    "title": "Case 1: Major Depressive Disorder",
    "sequence": 1,
    ...
  }
}
```

✅ **Case 1 created!**

---

### Step 3: Create Case #2 (Anxiety)

```bash
POST /api/internship/673f1234567890abcdef1234/cases
                     👆 Same internship ID
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "Case 2: Generalized Anxiety Disorder",
  "description": "Patient Sarah, 28-year-old female, presents with excessive worry",
  "sequence": 2,  // 👈 Second case
  "case_content": "<h2>Patient Presentation</h2><p>Chief Complaint: 'I can't stop worrying about everything'</p>",
  "patient_simulation_config": {
    "patient_profile": {
      "name": "Sarah Johnson",
      "age": 28,
      "gender": "female",
      "condition": "Generalized Anxiety Disorder",
      "severity": "moderate"
    },
    "scenario_type": "initial_clinical_interview",
    "difficulty_level": "intermediate"
  },
  "evaluation_criteria": [
    { "criterion": "Clinical Reasoning", "weight": 30 },
    { "criterion": "Communication Skills", "weight": 25 },
    { "criterion": "Empathy", "weight": 25 },
    { "criterion": "Assessment Technique", "weight": 20 }
  ]
}
```

**Response:**
```json
{
  "message": "Case created successfully",
  "data": {
    "_id": "673f9012345678abcdef9012",
    "internship_id": "673f1234567890abcdef1234",  // ✅ Same internship
    "title": "Case 2: Generalized Anxiety Disorder",
    "sequence": 2,
    ...
  }
}
```

✅ **Case 2 created!**

---

### Step 4: Create Case #3 (PTSD)

```bash
POST /api/internship/673f1234567890abcdef1234/cases
                     👆 Same internship ID
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "Case 3: Post-Traumatic Stress Disorder",
  "description": "Patient Michael, 42-year-old veteran, trauma history",
  "sequence": 3,  // 👈 Third case
  "case_content": "<h2>Patient Presentation</h2><p>Chief Complaint: 'The nightmares won't stop'</p>",
  "patient_simulation_config": {
    "patient_profile": {
      "name": "Michael Davis",
      "age": 42,
      "gender": "male",
      "condition": "Post-Traumatic Stress Disorder",
      "severity": "severe"
    },
    "scenario_type": "trauma_assessment",
    "difficulty_level": "advanced"
  },
  "evaluation_criteria": [
    { "criterion": "Trauma-Informed Approach", "weight": 35 },
    { "criterion": "Safety Assessment", "weight": 30 },
    { "criterion": "Clinical Reasoning", "weight": 20 },
    { "criterion": "Communication Skills", "weight": 15 }
  ]
}
```

**Response:**
```json
{
  "message": "Case created successfully",
  "data": {
    "_id": "673f3456789012abcdef3456",
    "internship_id": "673f1234567890abcdef1234",  // ✅ Same internship
    "title": "Case 3: Post-Traumatic Stress Disorder",
    "sequence": 3,
    ...
  }
}
```

✅ **Case 3 created!**

---

### Step 5: Verify All Cases

```bash
GET /api/internship/673f1234567890abcdef1234/cases
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "message": "Cases retrieved successfully",
  "data": [
    {
      "_id": "673f5678901234abcdef5678",
      "internship_id": "673f1234567890abcdef1234",
      "title": "Case 1: Major Depressive Disorder",
      "sequence": 1,
      ...
    },
    {
      "_id": "673f9012345678abcdef9012",
      "internship_id": "673f1234567890abcdef1234",
      "title": "Case 2: Generalized Anxiety Disorder",
      "sequence": 2,
      ...
    },
    {
      "_id": "673f3456789012abcdef3456",
      "internship_id": "673f1234567890abcdef1234",
      "title": "Case 3: Post-Traumatic Stress Disorder",
      "sequence": 3,
      ...
    }
  ]
}
```

✅ **All 3 cases retrieved, ordered by sequence!**

---

## 🔑 Key Points

### 1. Same Internship ID
- ✅ Use the **same internship ID** in the URL for all cases
- ✅ Format: `/api/internship/{internship_id}/cases`

### 2. Sequential Numbers
- ✅ Case 1: `"sequence": 1`
- ✅ Case 2: `"sequence": 2`
- ✅ Case 3: `"sequence": 3`
- ✅ Continue: 4, 5, 6, 7, ...

### 3. Unique Titles
- ✅ Each case must have a unique title within the internship
- ❌ Cannot have two cases with the same title

### 4. Unique Sequences
- ✅ Each case must have a unique sequence within the internship
- ❌ Cannot have two cases with sequence = 2

### 5. No Limit
- ✅ You can create as many cases as needed
- ✅ 5 cases? No problem!
- ✅ 10 cases? No problem!
- ✅ 20 cases? No problem!

---

## 💻 Using Postman

### Method 1: Manually Change Sequence

1. Open: **"1. Create case for internship"** request
2. Send it (creates Case 1 with sequence: 1)
3. Change `"sequence": 1` to `"sequence": 2`
4. Change the title
5. Send again (creates Case 2)
6. Repeat for more cases

### Method 2: Duplicate Request

1. Right-click on **"1. Create case for internship"**
2. Select **Duplicate**
3. Rename to **"Create Case 2"**
4. Edit the body: change sequence and title
5. Send

---

## 🎯 Real Example: 5-Case Internship

```bash
# Case 1: Depression
POST /api/internship/{id}/cases
{ "title": "Case 1: Depression", "sequence": 1, ... }

# Case 2: Anxiety
POST /api/internship/{id}/cases
{ "title": "Case 2: Anxiety", "sequence": 2, ... }

# Case 3: PTSD
POST /api/internship/{id}/cases
{ "title": "Case 3: PTSD", "sequence": 3, ... }

# Case 4: OCD
POST /api/internship/{id}/cases
{ "title": "Case 4: OCD", "sequence": 4, ... }

# Case 5: Bipolar Disorder
POST /api/internship/{id}/cases
{ "title": "Case 5: Bipolar", "sequence": 5, ... }

# Verify
GET /api/internship/{id}/cases
# Returns array with 5 cases ✅
```

---

## ⚠️ Error Handling

### Error 1: Duplicate Sequence
```json
{
  "statusCode": 400,
  "message": "Case with this sequence or title already exists in this internship"
}
```
**Solution:** Use a different sequence number (e.g., increment by 1)

### Error 2: Duplicate Title
```json
{
  "statusCode": 400,
  "message": "Case with this sequence or title already exists in this internship"
}
```
**Solution:** Use a unique title for each case

### Error 3: Invalid Internship ID
```json
{
  "statusCode": 404,
  "message": "Internship not found"
}
```
**Solution:** Verify the internship ID is correct

---

## 🚀 Summary

**Creating multiple cases is simple:**

1. **Create internship once** → Get internship ID
2. **Create case 1** → POST with sequence: 1
3. **Create case 2** → POST with sequence: 2 (same internship ID)
4. **Create case 3** → POST with sequence: 3 (same internship ID)
5. **Continue...** → POST with sequence: 4, 5, 6, ...
6. **Verify** → GET all cases for the internship

✅ **The system is fully designed for this!**

