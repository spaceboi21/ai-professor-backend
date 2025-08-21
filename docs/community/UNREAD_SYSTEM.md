# Forum Unread System

This document explains the simplified per-discussion unread tracking system for the community forum module.

## 🎯 **How It Works**

### **Per-Discussion Approach**

- ✅ **Track Per Discussion**: Each user has a "last viewed" timestamp for each discussion
- ✅ **Compare Timestamps**: New content created after user's last view is marked as unread
- ✅ **Automatic Tracking**: Views are automatically tracked when user fetches content
- ✅ **Optimized Performance**: Simple timestamp comparisons per discussion

## 📊 **Data Structure**

### **Forum View Schema**

```typescript
{
  user_id: ObjectId,           // User who viewed content
  discussion_id: ObjectId,      // Discussion that was viewed
  viewed_at: Date,             // When user last viewed this discussion
  created_at: Date,
  updated_at: Date
}
```

### **Response Structure**

```typescript
{
  _id: "discussion_id",
  title: "Discussion Title",
  content: "Discussion content...",
  created_by_user: { ... },
  is_unread: true,             // Whether this discussion is unread
  created_at: "2024-01-15T10:30:00Z"
}
```

## 🔧 **API Endpoints**

### **1. Get Discussions with Unread Status**

```http
GET /community/discussions
```

**Response:**

```json
{
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
      "is_unread": true, // New field
      "reply_count": 5,
      "view_count": 25,
      "like_count": 3,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### **2. Get Replies with Unread Status**

```http
GET /community/discussions/:id/replies
```

**Response:**

```json
{
  "data": [
    {
      "_id": "reply_id",
      "content": "Always use const and let instead of var",
      "created_by_user": {
        "first_name": "Sarah",
        "last_name": "Johnson",
        "email": "sarah@school.com",
        "image": "https://example.com/profile.jpg",
        "role": "STUDENT"
      },
      "is_unread": false, // New field
      "has_sub_replies": true,
      "sub_reply_count": 3,
      "created_at": "2024-01-15T11:00:00Z"
    }
  ]
}
```

### **3. Get Unread Counts**

```http
GET /community/unread-counts
```

**Response:**

```json
{
  "message": "Unread counts retrieved successfully",
  "data": {
    "unread_discussions": 5,
    "unread_replies": 12,
    "total_unread": 17
  }
}
```

## 🚀 **Automatic View Tracking**

### **When Content is Marked as Viewed**

- ✅ **View Discussion**: When user opens a discussion (GET `/discussions/:id`)
- ✅ **View Replies**: When user loads replies for a discussion (GET `/discussions/:id/replies`)
- ✅ **Automatic**: No manual action required from user
- ✅ **Per Discussion**: Each discussion is tracked separately

### **Unread Logic**

```typescript
// Per discussion logic
const isUnread = contentCreatedAt > userLastViewedAtForThisDiscussion;
```

## 🎨 **Frontend Usage**

### **Display Unread Indicators**

```javascript
// In your discussions list
const discussions = response.data;
return discussions.map((discussion) => (
  <div
    key={discussion._id}
    className={`discussion-item ${discussion.is_unread ? 'unread' : ''}`}
  >
    <h3>{discussion.title}</h3>
    {discussion.is_unread && <span className="unread-badge">NEW</span>}
    <p>
      By: {discussion.created_by_user.first_name}{' '}
      {discussion.created_by_user.last_name}
    </p>
  </div>
));
```

### **Display Unread Counts**

```javascript
// Get unread counts
const response = await fetch('/community/unread-counts');
const { data } = await response.json();

// Show in navigation
document.getElementById('unread-badge').textContent = data.total_unread;
```

### **CSS for Unread Styling**

```css
.discussion-item.unread {
  background-color: #f0f8ff;
  border-left: 3px solid #007bff;
}

.unread-badge {
  background-color: #dc3545;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: bold;
}
```

## 📈 **Performance Benefits**

### **1. Per-Discussion Tracking**

- ✅ **Granular Control**: Track each discussion separately
- ✅ **Efficient Queries**: Simple timestamp comparisons per discussion
- ✅ **No Array Updates**: No need to update arrays in main documents

### **2. Scalable Design**

- ✅ **User-Specific**: Each user has their own view tracking per discussion
- ✅ **Multi-Tenant**: Works across all schools
- ✅ **Real-time**: Updates immediately when content is viewed

### **3. Simple Logic**

- ✅ **Timestamp Comparison**: Simple date comparison per discussion
- ✅ **No Complex Counting**: No need to count individual items
- ✅ **Easy to Understand**: Straightforward implementation

## 🔄 **Data Flow**

### **1. User Views Discussion**

```typescript
// When user opens discussion
await markContentAsViewed(userId, discussionId, tenantConnection);
```

### **2. Check Unread Status**

```typescript
// When displaying content
const isUnread = await isContentUnread(
  userId,
  discussionId,
  contentCreatedAt,
  tenantConnection,
);
```

### **3. Update UI**

```javascript
// Frontend displays unread indicator
if (content.is_unread) {
  showUnreadBadge();
}
```

## 🎯 **Benefits**

1. **Per-Discussion**: Track unread status for each discussion separately
2. **Efficient**: Minimal database overhead per discussion
3. **User-Friendly**: Clear unread indicators per discussion
4. **Scalable**: Works for any number of users and discussions
5. **Automatic**: No separate API calls needed - views tracked automatically

This per-discussion unread system provides granular control while maintaining simplicity! 🎉✨
