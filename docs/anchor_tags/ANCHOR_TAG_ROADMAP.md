# 🎯 Anchor Tag Creation Roadmap for Professors

## 📋 **Overview**

This roadmap shows the complete workflow for professors to create interactive anchor tags that students can engage with during their learning journey.

---

## 🚀 **Step-by-Step Process**

### **Step 1: Create Quiz Group (Required First)**

```http
POST /api/quiz-groups
Content-Type: application/json

{
  "title": "Active Listening Assessment",
  "description": "Quiz questions for active listening concepts",
  "type": "ANCHOR_TAG",
  "module_id": "507f1f77bcf86cd799439011",
  "bibliography_id": "507f1f77bcf86cd799439013",
  "is_active": true
}
```

**Response:**

```json
{
  "id": "507f1f77bcf86cd799439014",
  "title": "Active Listening Assessment",
  "type": "ANCHOR_TAG",
  "module_id": "507f1f77bcf86cd799439011",
  "bibliography_id": "507f1f77bcf86cd799439013",
  "is_active": true
}
```

---

### **Step 2: Add Quizzes to Quiz Group**

```http
POST /api/quiz-groups/507f1f77bcf86cd799439014/quizzes
Content-Type: application/json

{
  "title": "What is Active Listening?",
  "description": "Test understanding of active listening basics",
  "type": "SINGLE_SELECT",
  "question": "Which of the following best describes active listening?",
  "options": [
    "Hearing what someone says",
    "Fully concentrating on what is being said",
    "Thinking about your response while they talk",
    "Interrupting to ask questions"
  ],
  "answer": ["Fully concentrating on what is being said"],
  "sequence": 1,
  "is_active": true
}
```

**Add Multiple Quizzes:**

```http
POST /api/quiz-groups/507f1f77bcf86cd799439014/quizzes
Content-Type: application/json

{
  "title": "Active Listening Techniques",
  "description": "Identify proper active listening techniques",
  "type": "MULTI_SELECT",
  "question": "Which techniques demonstrate active listening?",
  "options": [
    "Maintaining eye contact",
    "Nodding occasionally",
    "Interrupting to share your experience",
    "Asking clarifying questions",
    "Checking your phone"
  ],
  "answer": ["Maintaining eye contact", "Nodding occasionally", "Asking clarifying questions"],
  "sequence": 2,
  "is_active": true
}
```

---

### **Step 3: Create Anchor Tag**

```http
POST /api/anchor-tags
Content-Type: application/json

{
  "module_id": "507f1f77bcf86cd799439011",
  "chapter_id": "507f1f77bcf86cd799439012",
  "bibliography_id": "507f1f77bcf86cd799439013",
  "title": "Key Concept: Active Listening",
  "description": "This slide covers the fundamentals of active listening in counseling.",
  "content_type": "SLIDE",
  "content_reference": "slide-3",
  "slide_number": 3,
  "quiz_group_id": "507f1f77bcf86cd799439014",
  "is_mandatory": true,
  "sequence": 1,
  "tags": ["Active Listening", "Counseling Skills", "Communication"]
}
```

**Response:**

```json
{
  "id": "507f1f77bcf86cd799439015",
  "title": "Key Concept: Active Listening",
  "content_type": "SLIDE",
  "content_reference": "slide-3",
  "is_mandatory": true,
  "quiz_group": {
    "id": "507f1f77bcf86cd799439014",
    "title": "Active Listening Assessment",
    "quizzes": [
      {
        "id": "507f1f77bcf86cd799439016",
        "title": "What is Active Listening?",
        "type": "SINGLE_SELECT"
      },
      {
        "id": "507f1f77bcf86cd799439017",
        "title": "Active Listening Techniques",
        "type": "MULTI_SELECT"
      }
    ]
  }
}
```

---

## 🎯 **Complete Workflow Example**

### **Scenario: Professor creating anchor tags for a counseling module**

1. **Create Quiz Group:**

   ```json
   {
     "title": "Counseling Skills Assessment",
     "type": "ANCHOR_TAG",
     "module_id": "module_123",
     "bibliography_id": "bibliography_456"
   }
   ```

2. **Add Multiple Quizzes:**

   ```json
   // Quiz 1: Single Select
   {
     "title": "What is Active Listening?",
     "type": "SINGLE_SELECT",
     "question": "Which best describes active listening?",
     "options": ["Hearing", "Concentrating", "Interrupting"],
     "answer": ["Concentrating"]
   }

   // Quiz 2: Multi-Select
   {
     "title": "Active Listening Techniques",
     "type": "MULTI_SELECT",
     "question": "Which are active listening techniques?",
     "options": ["Eye contact", "Nodding", "Interrupting", "Clarifying"],
     "answer": ["Eye contact", "Nodding", "Clarifying"]
   }

   // Quiz 3: True/False
   {
     "title": "Active Listening Facts",
     "type": "TRUE_FALSE",
     "question": "Active listening requires full attention.",
     "answer": ["true"]
   }
   ```

3. **Create Anchor Tag:**
   ```json
   {
     "title": "Active Listening Fundamentals",
     "content_type": "SLIDE",
     "content_reference": "slide-3",
     "slide_number": 3,
     "quiz_group_id": "quiz_group_456",
     "is_mandatory": true,
     "tags": ["Active Listening", "Counseling"]
   }
   ```

---

## 📊 **Data Flow Diagram**

```
Professor Workflow:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  1. Create      │───▶│  2. Add Quizzes │───▶│  3. Create      │
│  Quiz Group     │    │  to Group       │    │  Anchor Tag     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Quiz Group      │    │ Multiple Quizzes│    │ Anchor Tag      │
│ (ANCHOR_TAG)    │    │ (SINGLE_SELECT, │    │ (Links to Quiz  │
│                 │    │  MULTI_SELECT,  │    │  Group)         │
│                 │    │  TRUE_FALSE)    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🎯 **Student Experience**

### **When Student Reaches Anchor Tag:**

1. **Student views content** (slide, video, PDF)
2. **System detects anchor tag** at specific location
3. **Student sees anchor tag indicator** (📌 icon)
4. **Student clicks to start** anchor tag interaction
5. **System shows one quiz question** at a time
6. **Student answers** and gets immediate feedback
7. **If mandatory**: Must complete to proceed
8. **If optional**: Can skip but attempt is logged

---

## 🔧 **API Endpoints Summary**

### **Quiz Group Management:**

- `POST /api/quiz-groups` - Create quiz group
- `GET /api/quiz-groups` - List quiz groups
- `PUT /api/quiz-groups/:id` - Update quiz group
- `DELETE /api/quiz-groups/:id` - Delete quiz group

### **Quiz Management:**

- `POST /api/quiz-groups/:id/quizzes` - Add quiz to group
- `GET /api/quiz-groups/:id/quizzes` - List quizzes in group
- `PUT /api/quizzes/:id` - Update quiz
- `DELETE /api/quizzes/:id` - Delete quiz

### **Anchor Tag Management:**

- `POST /api/anchor-tags` - Create anchor tag
- `GET /api/anchor-tags` - List anchor tags
- `GET /api/anchor-tags/:id` - Get specific anchor tag
- `PUT /api/anchor-tags/:id` - Update anchor tag
- `DELETE /api/anchor-tags/:id` - Delete anchor tag

### **Student Interactions:**

- `POST /api/anchor-tags/:id/start` - Start anchor tag attempt
- `POST /api/anchor-tags/:id/submit` - Submit answer
- `POST /api/anchor-tags/:id/skip` - Skip anchor tag
- `GET /api/anchor-tags/attempts` - Get student attempts

---

## 🎉 **Benefits of This Workflow**

1. **Modular Design**: Quiz groups can be reused across multiple anchor tags
2. **Flexible Questions**: Support for different question types
3. **Progressive Learning**: One question at a time for focused learning
4. **Mandatory Control**: Professors can make tags required or optional
5. **Comprehensive Tracking**: All student interactions are logged
6. **Easy Management**: Clear separation of concerns

---

## 🚀 **Next Steps**

1. **Run Migration**: `npm run migration:run`
2. **Test API Endpoints**: Create quiz groups and anchor tags
3. **Frontend Integration**: Build UI for professor workflow
4. **Student Interface**: Create anchor tag interaction UI
5. **Analytics Dashboard**: View student performance data

This roadmap provides a clear path for professors to create engaging, interactive learning experiences! 🎯
