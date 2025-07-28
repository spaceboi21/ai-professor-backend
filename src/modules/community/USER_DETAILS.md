# User Details in Community Module Responses

This document shows all the user details that are included in the community module API responses, making it easy to display who created each discussion, reply, report, or like.

## 👤 **User Details Structure**

All user details include the following fields:

```typescript
{
  _id: ObjectId,
  first_name: string,
  last_name: string,
  email: string,
  role: string
}
```

## 📝 **Discussion Responses**

### **Create Discussion Response**

```json
{
  "message": "Discussion created successfully",
  "data": {
    "_id": "discussion_id",
    "title": "JavaScript Best Practices",
    "content": "What are the best practices...",
    "type": "discussion",
    "created_by": "user_id",
    "created_by_role": "PROFESSOR",
    "created_by_user": {
      "_id": "user_id",
      "first_name": "John",
      "last_name": "Smith",
      "email": "john.smith@school.com",
      "role": "PROFESSOR"
    },
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

### **Get Discussions Response**

```json
{
  "message": "Discussions retrieved successfully",
  "data": [
    {
      "_id": "discussion_id",
      "title": "JavaScript Best Practices",
      "content": "What are the best practices...",
      "type": "discussion",
      "created_by": "user_id",
      "created_by_role": "PROFESSOR",
      "created_by_user": {
        "_id": "user_id",
        "first_name": "John",
        "last_name": "Smith",
        "email": "john.smith@school.com",
        "role": "PROFESSOR"
      },
      "reply_count": 5,
      "view_count": 25,
      "like_count": 3,
      "status": "active",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

## 💬 **Reply Responses**

### **Create Reply Response**

```json
{
  "message": "Reply created successfully",
  "data": {
    "_id": "reply_id",
    "discussion_id": "discussion_id",
    "content": "Always use const and let instead of var",
    "created_by": "user_id",
    "created_by_role": "STUDENT",
    "created_by_user": {
      "_id": "user_id",
      "first_name": "Sarah",
      "last_name": "Johnson",
      "email": "sarah.johnson@school.com",
      "role": "STUDENT"
    },
    "parent_reply_id": null,
    "like_count": 0,
    "status": "active",
    "created_at": "2024-01-15T11:00:00Z"
  }
}
```

### **Get Replies Response**

```json
{
  "message": "Replies retrieved successfully",
  "data": [
    {
      "_id": "reply_id",
      "discussion_id": "discussion_id",
      "content": "Always use const and let instead of var",
      "created_by": "user_id",
      "created_by_role": "STUDENT",
      "created_by_user": {
        "_id": "user_id",
        "first_name": "Sarah",
        "last_name": "Johnson",
        "email": "sarah.johnson@school.com",
        "role": "STUDENT"
      },
      "parent_reply_id": null,
      "like_count": 2,
      "status": "active",
      "created_at": "2024-01-15T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "totalPages": 2
  }
}
```

## 👍 **Like Responses**

### **Toggle Like Response**

```json
{
  "message": "Like added successfully",
  "liked": true,
  "liked_by_user": {
    "_id": "user_id",
    "first_name": "Mike",
    "last_name": "Davis",
    "email": "mike.davis@school.com",
    "role": "STUDENT"
  }
}
```

## 🚨 **Report Responses**

### **Create Report Response**

```json
{
  "message": "Content reported successfully",
  "data": {
    "_id": "report_id",
    "entity_type": "discussion",
    "entity_id": "discussion_id",
    "report_type": "inappropriate_content",
    "reason": "This content violates community guidelines",
    "reported_by": "user_id",
    "reported_by_role": "STUDENT",
    "reported_by_user": {
      "_id": "user_id",
      "first_name": "Lisa",
      "last_name": "Wilson",
      "email": "lisa.wilson@school.com",
      "role": "STUDENT"
    },
    "status": "pending",
    "created_at": "2024-01-15T12:00:00Z"
  }
}
```

### **Get Reports Response (Admin Only)**

```json
{
  "message": "Reports retrieved successfully",
  "data": [
    {
      "_id": "report_id",
      "entity_type": "discussion",
      "entity_id": "discussion_id",
      "report_type": "inappropriate_content",
      "reason": "This content violates community guidelines",
      "reported_by": "reporter_user_id",
      "reported_by_role": "STUDENT",
      "reported_by_user": {
        "_id": "reporter_user_id",
        "first_name": "Lisa",
        "last_name": "Wilson",
        "email": "lisa.wilson@school.com",
        "role": "STUDENT"
      },
      "reported_content_creator": {
        "_id": "creator_user_id",
        "first_name": "John",
        "last_name": "Smith",
        "email": "john.smith@school.com",
        "role": "PROFESSOR"
      },
      "status": "pending",
      "created_at": "2024-01-15T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

## 🎯 **User Details by Endpoint**

### **Discussions**

- ✅ **Create Discussion**: `created_by_user`
- ✅ **Get Discussions**: `created_by_user` for each discussion
- ✅ **Get Single Discussion**: `created_by_user`

### **Replies**

- ✅ **Create Reply**: `created_by_user`
- ✅ **Get Replies**: `created_by_user` for each reply

### **Likes**

- ✅ **Toggle Like**: `liked_by_user`

### **Reports**

- ✅ **Create Report**: `reported_by_user`
- ✅ **Get Reports**: `reported_by_user` + `reported_content_creator`

## 🔍 **User Details Fields**

### **Basic User Info**

```typescript
{
  _id: ObjectId,           // User ID
  first_name: string,      // First name
  last_name: string,       // Last name
  email: string,          // Email address
  role: string            // User role (STUDENT, PROFESSOR, etc.)
}
```

### **Context-Specific Fields**

- **`created_by_user`**: User who created the content
- **`reported_by_user`**: User who reported the content
- **`reported_content_creator`**: User who created the reported content
- **`liked_by_user`**: User who liked the content

## 🎨 **Frontend Usage Examples**

### **Display Discussion Author**

```javascript
// In your frontend component
const discussion = response.data;
const author = discussion.created_by_user;

return (
  <div>
    <h2>{discussion.title}</h2>
    <p>
      By: {author.first_name} {author.last_name} ({author.role})
    </p>
    <p>Email: {author.email}</p>
  </div>
);
```

### **Display Reply Author**

```javascript
// In your replies list
const replies = response.data;
return replies.map((reply) => (
  <div key={reply._id}>
    <p>{reply.content}</p>
    <small>
      By: {reply.created_by_user.first_name} {reply.created_by_user.last_name}(
      {reply.created_by_user.role})
    </small>
  </div>
));
```

### **Display Report Details**

```javascript
// In admin reports view
const reports = response.data;
return reports.map((report) => (
  <div key={report._id}>
    <p>
      Reported by: {report.reported_by_user.first_name}{' '}
      {report.reported_by_user.last_name}
    </p>
    <p>
      Content creator: {report.reported_content_creator.first_name}{' '}
      {report.reported_content_creator.last_name}
    </p>
  </div>
));
```

## 🚀 **Benefits**

1. **Complete User Context**: Every response includes user details
2. **Easy Frontend Integration**: No need for additional API calls
3. **Role Information**: Know the user's role for UI customization
4. **Contact Information**: Email available for admin purposes
5. **Audit Trail**: Full tracking of who did what

## 📊 **Performance Considerations**

- ✅ **Efficient Queries**: User details fetched in single queries
- ✅ **Selective Fields**: Only necessary user fields are fetched
- ✅ **Lean Queries**: Using `.lean()` for better performance
- ✅ **Caching Ready**: User details can be cached if needed

This comprehensive user details system makes it easy to display rich information about who created, liked, or reported content in your community module! 🎉✨
