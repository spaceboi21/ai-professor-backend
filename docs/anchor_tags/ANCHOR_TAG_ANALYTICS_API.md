# 🎯 Anchor Tag Analytics API Documentation

## 📋 **Overview**

This document describes the anchor tag analytics API endpoints that provide comprehensive analytics for student anchor tag attempts. These endpoints are now part of the main anchor tag controller.

---

## 🚀 **API Endpoints**

### **Base URL:** `/api/anchor-tags`

---

## 📊 **1. Get Student Attempted Anchor Tags**

**Endpoint:** `GET /api/anchor-tags/student/attempted-tags`

**Access:** Students, School Admins, Professors

**Description:** Retrieve a list of anchor tags that the student has attempted, with summary statistics for each tag.

### **Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of items per page (default: 10, max: 50)
- `student_id` (optional): Student ID (required for admin access, optional for students)

### **Response Example:**

```json
{
  "attempted_anchor_tags": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "anchor_tag": {
        "_id": "507f1f77bcf86cd799439011",
        "title": "Active Listening Assessment",
        "description": "Test understanding of active listening concepts",
        "content_type": "SLIDE",
        "content_reference": "slide-3",
        "is_mandatory": true
      },
      "quiz_group": {
        "_id": "507f1f77bcf86cd799439016",
        "subject": "Communication Skills",
        "description": "Assessment of communication fundamentals",
        "difficulty": "INTERMEDIATE",
        "category": "Psychology",
        "type": "ANCHOR_TAG",
        "time_left": 10
      },
      "quiz": {
        "_id": "507f1f77bcf86cd799439017",
        "question": "Which of the following best describes active listening?",
        "type": "SINGLE_SELECT",
        "options": [
          "Hearing what someone says",
          "Fully concentrating on what is being said",
          "Thinking about your response while they talk",
          "Interrupting to ask questions"
        ],
        "answer": ["Fully concentrating on what is being said"],
        "explanation": "Active listening involves full concentration and understanding.",
        "sequence": 1,
        "tags": ["Communication", "Listening"]
      },
      "module": {
        "_id": "507f1f77bcf86cd799439011",
        "title": "Communication Skills",
        "subject": "Psychology"
      },
      "chapter": {
        "_id": "507f1f77bcf86cd799439012",
        "title": "Active Listening"
      },
      "bibliography": {
        "_id": "507f1f77bcf86cd799439013",
        "title": "Communication Fundamentals",
        "type": "SLIDE"
      },
      "total_attempts": 3,
      "average_score": 85.5,
      "success_rate": 66.7,
      "best_score": 95,
      "worst_score": 75,
      "total_correct": 2,
      "last_attempt_date": "2024-01-15T10:45:00Z",
      "first_attempt_date": "2024-01-10T09:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "summary": {
    "total_anchor_tags_attempted": 15,
    "total_attempts": 25,
    "average_success_rate": 78.5
  },
  "student_info": {
    "student_id": "507f1f77bcf86cd799439011",
    "accessed_by": "SCHOOL_ADMIN",
    "accessed_by_id": "507f1f77bcf86cd799439012"
  }
}
```

---

## 📈 **2. Get Detailed Student Anchor Tag Analytics**

**Endpoint:** `GET /api/anchor-tags/student/analytics`

**Access:** Students, School Admins, Professors

**Description:** Retrieve detailed analytics for student's anchor tag attempts with comprehensive statistics.

### **Query Parameters:**

- `module_id` (optional): Filter by module ID
- `chapter_id` (optional): Filter by chapter ID
- `bibliography_id` (optional): Filter by bibliography ID
- `anchor_tag_id` (optional): Filter by specific anchor tag ID
- `date_from` (optional): Filter by start date (ISO string format)
- `date_to` (optional): Filter by end date (ISO string format)
- `student_id` (optional): Student ID (required for admin access, optional for students)

### **Response Example:**

```json
{
  "attempts": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "anchor_tag": {
        "_id": "507f1f77bcf86cd799439011",
        "title": "Active Listening Assessment",
        "description": "Test understanding of active listening concepts",
        "content_type": "SLIDE",
        "content_reference": "slide-3",
        "is_mandatory": true
      },
      "quiz_group": {
        "_id": "507f1f77bcf86cd799439016",
        "subject": "Communication Skills",
        "description": "Assessment of communication fundamentals",
        "difficulty": "INTERMEDIATE",
        "category": "Psychology",
        "type": "ANCHOR_TAG",
        "time_left": 10
      },
      "quiz": {
        "_id": "507f1f77bcf86cd799439017",
        "question": "Which of the following best describes active listening?",
        "type": "SINGLE_SELECT",
        "options": [
          "Hearing what someone says",
          "Fully concentrating on what is being said",
          "Thinking about your response while they talk",
          "Interrupting to ask questions"
        ],
        "answer": ["Fully concentrating on what is being said"],
        "explanation": "Active listening involves full concentration and understanding.",
        "sequence": 1,
        "tags": ["Communication", "Listening"]
      },
      "module": {
        "_id": "507f1f77bcf86cd799439011",
        "title": "Communication Skills",
        "subject": "Psychology"
      },
      "chapter": {
        "_id": "507f1f77bcf86cd799439012",
        "title": "Active Listening"
      },
      "bibliography": {
        "_id": "507f1f77bcf86cd799439013",
        "title": "Communication Fundamentals",
        "type": "SLIDE"
      },
      "score_percentage": 85,
      "is_correct": true,
      "attempt_number": 1,
      "started_at": "2024-01-15T10:30:00Z",
      "completed_at": "2024-01-15T10:35:00Z",
      "time_spent_seconds": 300,
      "quiz_attempt": {
        "quiz_id": "507f1f77bcf86cd799439015",
        "selected_answers": ["Fully concentrating on what is being said"],
        "time_spent_seconds": 300,
        "is_correct": true,
        "score_percentage": 85
      },
      "ai_verification_result": {
        "score_percentage": 85,
        "questions_results": [
          {
            "question": "Which of the following best describes active listening?",
            "question_index": 1,
            "question_type": "SINGLE_SELECT",
            "user_answer": "Fully concentrating on what is being said",
            "correct_answer": "Fully concentrating on what is being said",
            "is_correct": true,
            "score": 85,
            "explanation": "Active listening involves full concentration and understanding.",
            "feedback": "Excellent understanding of active listening concepts."
          }
        ]
      }
    }
  ],
  "summary": {
    "total_attempts": 25,
    "average_score": 82.5,
    "success_rate": 76.0,
    "total_correct": 19,
    "total_incorrect": 6,
    "average_time_taken": 245.5,
    "best_score": 95,
    "worst_score": 65
  },
  "student_info": {
    "student_id": "507f1f77bcf86cd799439011",
    "accessed_by": "SCHOOL_ADMIN",
    "accessed_by_id": "507f1f77bcf86cd799439012"
  }
}
```

---

## 📤 **3. Export Student Anchor Tag Analytics**

**Endpoint:** `GET /api/anchor-tags/student/analytics/export`

**Access:** Students, School Admins, Professors

**Description:** Export student anchor tag analytics in CSV or JSON format.

### **Query Parameters:**

- `format` (required): Export format (csv or json)
- `module_id` (optional): Filter export by specific module ID
- `chapter_id` (optional): Filter export by specific chapter ID
- `bibliography_id` (optional): Filter export by specific bibliography ID
- `anchor_tag_id` (optional): Filter export by specific anchor tag ID
- `date_from` (optional): Filter by start date (ISO string format)
- `date_to` (optional): Filter by end date (ISO string format)
- `student_id` (optional): Student ID (required for admin access, optional for students)

### **Response:**

File download with appropriate headers (CSV or JSON format)

---

## 🔐 **Access Control**

### **Students:**

- Can view their own anchor tag analytics
- Can export their own data
- Cannot access other students' data

### **School Admins & Professors:**

- Can view any student's anchor tag analytics by providing `student_id`
- Can export any student's data
- Have full administrative access

---

## 📊 **Key Features**

### **Analytics Provided:**

1. **Attempt Statistics:**
   - Total attempts per anchor tag
   - Average scores and success rates
   - Best and worst scores
   - Time spent on each attempt

2. **Performance Metrics:**
   - Success rate calculations
   - Score trends over time
   - Time efficiency analysis
   - Correct vs incorrect attempts

3. **Detailed Breakdown:**
   - Question-by-question analysis
   - AI verification results
   - Student responses and explanations
   - Performance feedback

4. **Quiz Group & Quiz Details:**
   - Complete quiz group information (subject, difficulty, category, etc.)
   - Quiz question details (question, options, answers, explanations)
   - Quiz type and sequence information

5. **Filtering Options:**
   - By module, chapter, bibliography
   - By specific anchor tag
   - By date ranges
   - By student (for admins)

6. **Export Capabilities:**
   - CSV format for spreadsheet analysis
   - JSON format for detailed data
   - Filtered exports based on criteria

---

## 🎯 **Use Cases**

### **For Students:**

- Track their learning progress across anchor tags
- Identify areas for improvement
- Review detailed feedback on their attempts
- Export data for personal analysis

### **For Admins:**

- Monitor student engagement with anchor tags
- Identify struggling students
- Analyze effectiveness of anchor tag content
- Generate reports for stakeholders

### **For Professors:**

- Assess student understanding of specific concepts
- Identify which anchor tags are most effective
- Provide targeted feedback to students
- Track learning outcomes

---

## 🔧 **Technical Implementation**

### **Database Collections Used:**

- `student_anchor_tag_attempts` - Main analytics data
- `anchor_tags` - Anchor tag information
- `quiz_group` - Quiz group details
- `quizzes` - Quiz question details
- `modules` - Module details
- `chapters` - Chapter details
- `bibliographies` - Bibliography information

### **Key Aggregations:**

- Student attempt grouping by anchor tag
- Score and time calculations
- Success rate computations
- Detailed attempt analysis with quiz group and quiz details

### **Performance Optimizations:**

- Proper indexing on frequently queried fields
- Pagination for large datasets
- Efficient aggregation pipelines
- Caching for repeated queries

---

## 📝 **Notes**

1. **Data Privacy:** All analytics respect student privacy and access controls
2. **Real-time Data:** Analytics reflect current attempt data
3. **Export Limits:** Large exports may be rate-limited
4. **Filtering:** All filters are optional and can be combined
5. **Pagination:** Default 10 items per page, max 50
6. **Unified Controller:** All anchor tag endpoints are now in the main anchor tag controller

---

This API provides comprehensive analytics for anchor tag interactions, enabling both students and administrators to track and improve learning outcomes effectively! 🎯
