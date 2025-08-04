# Last Reply Tracking

This document explains the last reply tracking feature for forum discussions.

## 🎯 **How It Works**

### **Last Reply Tracking**

- ✅ **Track Last Activity**: Each discussion tracks when the last reply was made
- ✅ **Automatic Updates**: `last_reply_at` is updated whenever a new reply is created
- ✅ **Sort by Activity**: Discussions are sorted by last reply time, then by creation date
- ✅ **Last Reply Info**: Includes details about the most recent reply

## 📊 **Data Structure**

### **Discussion Schema Updates**

```typescript
{
  _id: ObjectId,
  title: string,
  content: string,
  // ... other fields
  last_reply_at: Date,        // When the last reply was made
  reply_count: number,         // Total number of replies
  // ... other fields
}
```

### **Response Structure**

```typescript
{
  _id: "discussion_id",
  title: "Discussion Title",
  content: "Discussion content...",
  created_by_user: { ... },
  is_unread: true,
  last_reply_at: "2024-01-15T14:30:00Z",
  last_reply: {
    reply_id: "reply_id",
    content: "Last reply content...",
    created_by_user: {
      first_name: "John",
      last_name: "Doe",
      email: "john@school.com",
      image: "https://example.com/profile.jpg",
      role: "STUDENT"
    },
    created_at: "2024-01-15T14:30:00Z"
  },
  reply_count: 5,
  created_at: "2024-01-15T10:30:00Z"
}
```

## 🔧 **API Response**

### **Get Discussions with Last Reply Info**

```http
GET /community/discussions
```

**Response:**

```json
{
  "message": "Discussions retrieved successfully",
  "data": [
    {
      "_id": "discussion_id",
      "title": "JavaScript Best Practices",
      "content": "What are the best practices...",
      "created_by_user": {
        "first_name": "John",
        "last_name": "Smith",
        "email": "john@school.com",
        "image": "https://example.com/profile.jpg",
        "role": "PROFESSOR"
      },
      "is_unread": true,
      "last_reply_at": "2024-01-15T14:30:00Z",
      "last_reply": {
        "reply_id": "reply_id",
        "content": "Always use const and let instead of var",
        "created_by_user": {
          "first_name": "Sarah",
          "last_name": "Johnson",
          "email": "sarah@school.com",
          "image": "https://example.com/profile.jpg",
          "role": "STUDENT"
        },
        "created_at": "2024-01-15T14:30:00Z"
      },
      "reply_count": 5,
      "view_count": 25,
      "like_count": 3,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

## 🚀 **Features**

### **1. Automatic Last Reply Tracking**

- ✅ **Update on Reply**: `last_reply_at` is updated when any reply is created
- ✅ **Sub-replies Count**: Sub-replies also update the last reply timestamp
- ✅ **Real-time**: Updates happen immediately when replies are posted

### **2. Smart Sorting**

- ✅ **Activity-Based**: Discussions are sorted by `last_reply_at` (most recent first)
- ✅ **Fallback Sorting**: If no replies, sort by `created_at`
- ✅ **Efficient**: Uses database indexes for fast sorting

### **3. Last Reply Information**

- ✅ **Reply Details**: Shows the content of the last reply
- ✅ **User Information**: Shows who made the last reply
- ✅ **Timestamp**: Shows when the last reply was made

## 🎨 **Frontend Usage**

### **Display Last Reply Info**

```javascript
// In your discussions list
const discussions = response.data;
return discussions.map((discussion) => (
  <div key={discussion._id} className="discussion-item">
    <h3>{discussion.title}</h3>
    <p>
      By: {discussion.created_by_user.first_name}{' '}
      {discussion.created_by_user.last_name}
    </p>

    {discussion.last_reply && (
      <div className="last-reply">
        <small>
          Last reply by {discussion.last_reply.created_by_user.first_name}{' '}
          {discussion.last_reply.created_by_user.last_name} -{' '}
          {new Date(discussion.last_reply.created_at).toLocaleDateString()}
        </small>
        <p className="last-reply-content">
          "{discussion.last_reply.content.substring(0, 100)}..."
        </p>
      </div>
    )}

    <div className="discussion-stats">
      <span>{discussion.reply_count} replies</span>
      <span>{discussion.view_count} views</span>
      <span>{discussion.like_count} likes</span>
    </div>
  </div>
));
```

### **CSS for Last Reply Styling**

```css
.last-reply {
  background-color: #f8f9fa;
  padding: 8px;
  border-radius: 4px;
  margin-top: 8px;
  border-left: 3px solid #6c757d;
}

.last-reply-content {
  font-style: italic;
  color: #6c757d;
  margin: 4px 0 0 0;
  font-size: 14px;
}

.discussion-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #6c757d;
  margin-top: 8px;
}
```

## 📈 **Performance Benefits**

### **1. Efficient Sorting**

- ✅ **Database Index**: Index on `last_reply_at` for fast sorting
- ✅ **Compound Index**: Index on `last_reply_at, created_at` for fallback sorting
- ✅ **Minimal Queries**: Single query with efficient sorting

### **2. Optimized Data**

- ✅ **Cached Info**: Last reply info is fetched efficiently
- ✅ **User Details**: User information is fetched once per reply
- ✅ **Lean Queries**: Uses lean() for better performance

### **3. Scalable Design**

- ✅ **Multi-Tenant**: Works across all schools
- ✅ **Real-time**: Updates immediately when replies are posted
- ✅ **User-Friendly**: Shows clear activity indicators

## 🔄 **Data Flow**

### **1. User Creates Reply**

```typescript
// When reply is created
await DiscussionModel.updateOne(
  { _id: discussion_id },
  {
    $inc: { reply_count: 1 },
    $set: { last_reply_at: new Date() },
  },
);
```

### **2. Fetch Discussions**

```typescript
// When fetching discussions
const discussions = await DiscussionModel.find(filter)
  .sort({ last_reply_at: -1, created_at: -1 })
  .lean();
```

### **3. Display Last Reply**

```javascript
// Frontend displays last reply info
if (discussion.last_reply) {
  showLastReplyInfo(discussion.last_reply);
}
```

## 🎯 **Benefits**

1. **Activity-Based Sorting**: Discussions with recent activity appear first
2. **Last Reply Info**: Users can see the most recent activity at a glance
3. **Efficient**: Uses database indexes for fast sorting
4. **User-Friendly**: Clear indication of recent activity
5. **Real-time**: Updates immediately when new replies are posted

This last reply tracking system provides users with clear visibility into discussion activity! 🎉✨
