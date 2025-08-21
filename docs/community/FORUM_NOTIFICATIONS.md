# Forum Notifications System

This document explains the comprehensive notification system for the community forum module, covering all forum activities that trigger notifications.

## 🎯 **Notification Types**

### **1. New Discussion Notifications**

- **Trigger**: When someone creates a new forum discussion
- **Recipients**: All students and professors in the school (except the creator)
- **Type**: `FORUM_NEW_DISCUSSION`

### **2. New Reply Notifications**

- **Trigger**: When someone replies to a discussion
- **Recipients**: The discussion creator (if different from replier)
- **Type**: `FORUM_NEW_REPLY`

### **3. New Sub-Reply Notifications**

- **Trigger**: When someone replies to a specific comment
- **Recipients**: The parent reply creator (if different from sub-replier)
- **Type**: `FORUM_NEW_SUB_REPLY`

### **4. Like Notifications**

- **Trigger**: When someone likes a discussion or reply
- **Recipients**: The content creator (if different from liker)
- **Type**: `FORUM_LIKE`

### **5. Report Notifications**

- **Trigger**: When someone reports content
- **Recipients**: All school admins and super admins
- **Type**: `FORUM_REPORT`

### **6. Discussion Archived Notifications**

- **Trigger**: When a discussion is archived by admin
- **Recipients**: The discussion creator
- **Type**: `FORUM_DISCUSSION_ARCHIVED`

## 📋 **Notification Structure**

### **Base Notification Fields**

```typescript
{
  recipient_type: 'STUDENT' | 'PROFESSOR',
  recipient_id: ObjectId,
  title: string,
  message: string,
  type: NotificationTypeEnum,
  status: 'UNREAD' | 'READ',
  metadata: Record<string, any>,
  created_at: Date,
  read_at: Date | null
}
```

## 🔔 **Notification Examples**

### **1. New Discussion Notification**

```json
{
  "recipient_type": "STUDENT",
  "recipient_id": "student_id",
  "title": "New Forum Discussion",
  "message": "John Smith started a new discussion: \"JavaScript Best Practices\"",
  "type": "FORUM_NEW_DISCUSSION",
  "metadata": {
    "discussion_id": "discussion_id",
    "discussion_title": "JavaScript Best Practices",
    "creator_id": "creator_id",
    "creator_name": "John Smith",
    "creator_role": "PROFESSOR"
  }
}
```

### **2. New Reply Notification**

```json
{
  "recipient_type": "PROFESSOR",
  "recipient_id": "professor_id",
  "title": "New Reply to Your Discussion",
  "message": "Sarah Johnson replied to your discussion: \"JavaScript Best Practices\"",
  "type": "FORUM_NEW_REPLY",
  "metadata": {
    "discussion_id": "discussion_id",
    "discussion_title": "JavaScript Best Practices",
    "reply_id": "reply_id",
    "reply_creator_id": "sarah_id",
    "reply_creator_name": "Sarah Johnson",
    "reply_creator_role": "STUDENT"
  }
}
```

### **3. New Sub-Reply Notification**

```json
{
  "recipient_type": "STUDENT",
  "recipient_id": "student_id",
  "title": "New Reply to Your Comment",
  "message": "Mike Davis replied to your comment in: \"JavaScript Best Practices\"",
  "type": "FORUM_NEW_SUB_REPLY",
  "metadata": {
    "discussion_id": "discussion_id",
    "discussion_title": "JavaScript Best Practices",
    "parent_reply_id": "parent_reply_id",
    "sub_reply_id": "sub_reply_id",
    "sub_reply_creator_id": "mike_id",
    "sub_reply_creator_name": "Mike Davis",
    "sub_reply_creator_role": "STUDENT"
  }
}
```

### **4. Like Notification**

```json
{
  "recipient_type": "PROFESSOR",
  "recipient_id": "professor_id",
  "title": "New Like on Your Content",
  "message": "Lisa Wilson liked your discussion: \"JavaScript Best Practices\"",
  "type": "FORUM_LIKE",
  "metadata": {
    "entity_type": "discussion",
    "entity_id": "discussion_id",
    "entity_title": "JavaScript Best Practices",
    "liker_id": "lisa_id",
    "liker_name": "Lisa Wilson",
    "liker_role": "STUDENT"
  }
}
```

#### **Like Notification for Reply**

```json
{
  "recipient_type": "STUDENT",
  "recipient_id": "student_id",
  "title": "New Like on Your Content",
  "message": "Mike Davis liked your comment",
  "type": "FORUM_LIKE",
  "metadata": {
    "entity_type": "reply",
    "entity_id": "reply_id",
    "entity_title": "your comment",
    "liker_id": "mike_id",
    "liker_name": "Mike Davis",
    "liker_role": "STUDENT",
    "discussion_id": "discussion_id"
  }
}
```

### **5. Report Notification**

```json
{
  "recipient_type": "PROFESSOR",
  "recipient_id": "admin_id",
  "title": "New Content Report",
  "message": "Alex Brown reported discussion by John Smith",
  "type": "FORUM_REPORT",
  "metadata": {
    "report_id": "report_id",
    "entity_type": "discussion",
    "entity_id": "discussion_id",
    "reporter_id": "alex_id",
    "reporter_name": "Alex Brown",
    "reporter_role": "STUDENT",
    "reported_content_creator_id": "john_id",
    "reported_content_creator_name": "John Smith",
    "reported_content_creator_role": "PROFESSOR",
    "report_reason": "inappropriate_content"
  }
}
```

## 🚀 **Notification Triggers**

### **1. Discussion Creation**

```typescript
// Triggered in createDiscussion method
await this.notifyNewDiscussion(
  savedDiscussion,
  creator,
  schoolId,
  tenantConnection,
);
```

### **2. Reply Creation**

```typescript
// Triggered in createReply method
if (parent_reply_id) {
  // Sub-reply notification
  await this.notifyNewSubReply(...);
} else {
  // Top-level reply notification
  await this.notifyNewReply(...);
}
```

### **3. Like Action**

```typescript
// Triggered in toggleLike method when adding like
await this.notifyNewLike(
  newLike,
  liker,
  entityType,
  entity,
  entityCreator,
  schoolId,
);
```

### **4. Report Creation**

```typescript
// Triggered in reportContent method
await this.notifyNewReport(
  savedReport,
  reporter,
  reportedContent,
  reportedContentCreator,
  schoolId,
);
```

## 🎯 **Smart Notification Logic**

### **1. Self-Notification Prevention**

- ✅ **Discussion Creator**: Won't receive notifications about their own discussions
- ✅ **Reply Creator**: Won't receive notifications about their own replies
- ✅ **Liker**: Won't receive notifications about their own likes
- ✅ **Reporter**: Won't receive notifications about their own reports

### **2. Role-Based Recipients**

- ✅ **Students**: Receive notifications as `RecipientTypeEnum.STUDENT`
- ✅ **Professors**: Receive notifications as `RecipientTypeEnum.PROFESSOR`
- ✅ **Admins**: Receive report notifications as `RecipientTypeEnum.PROFESSOR`

### **3. Database Source Logic**

- ✅ **Students**: Notifications stored in tenant database
- ✅ **Professors/Admins**: Notifications stored in tenant database
- ✅ **Multi-tenant**: Each school has separate notification collections

## 📊 **Notification Metadata**

### **Discussion Notifications**

```typescript
{
  discussion_id: ObjectId,
  discussion_title: string,
  creator_id: ObjectId,
  creator_name: string,
  creator_role: string
}
```

### **Reply Notifications**

```typescript
{
  discussion_id: ObjectId,
  discussion_title: string,
  reply_id: ObjectId,
  reply_creator_id: ObjectId,
  reply_creator_name: string,
  reply_creator_role: string
}
```

### **Sub-Reply Notifications**

```typescript
{
  discussion_id: ObjectId,
  discussion_title: string,
  parent_reply_id: ObjectId,
  sub_reply_id: ObjectId,
  sub_reply_creator_id: ObjectId,
  sub_reply_creator_name: string,
  sub_reply_creator_role: string
}
```

### **Like Notifications**

```typescript
{
  entity_type: 'discussion' | 'reply',
  entity_id: ObjectId,
  entity_title: string,
  liker_id: ObjectId,
  liker_name: string,
  liker_role: string,
  discussion_id?: ObjectId // Only present when entity_type is 'reply'
}
```

### **Report Notifications**

```typescript
{
  report_id: ObjectId,
  entity_type: 'discussion' | 'reply',
  entity_id: ObjectId,
  reporter_id: ObjectId,
  reporter_name: string,
  reporter_role: string,
  reported_content_creator_id: ObjectId,
  reported_content_creator_name: string,
  reported_content_creator_role: string,
  report_reason: string
}
```

## 🔧 **Integration Points**

### **1. Community Service Integration**

```typescript
// Constructor injection
constructor(
  private readonly notificationsService: NotificationsService,
) {}
```

### **2. Module Integration**

```typescript
// Community module imports
imports: [NotificationsModule];
```

### **3. Error Handling**

```typescript
// Non-blocking notifications
try {
  await this.createForumNotification(...);
} catch (error) {
  this.logger.error('Error creating forum notification', error);
  // Don't throw error to avoid breaking main functionality
}
```

## 🎨 **Frontend Integration**

### **1. Display Notifications**

```javascript
// Get user notifications
const response = await fetch('/notifications?recipient_type=STUDENT');
const { data: notifications } = await response.json();

// Display forum notifications
const forumNotifications = notifications.filter((notification) =>
  notification.type.startsWith('FORUM_'),
);
```

### **2. Handle Notification Clicks**

```javascript
// Handle discussion notification click
function handleDiscussionNotification(notification) {
  const discussionId = notification.metadata.discussion_id;
  navigateTo(`/community/discussions/${discussionId}`);
}

// Handle reply notification click
function handleReplyNotification(notification) {
  const discussionId = notification.metadata.discussion_id;
  navigateTo(
    `/community/discussions/${discussionId}#reply-${notification.metadata.reply_id}`,
  );
}
```

### **3. Real-time Updates**

```javascript
// WebSocket or polling for real-time notifications
setInterval(async () => {
  const response = await fetch(
    '/notifications/unread-count?recipient_type=STUDENT',
  );
  const {
    data: { unread_count },
  } = await response.json();
  updateNotificationBadge(unread_count);
}, 30000); // Check every 30 seconds
```

## 🚀 **Benefits**

1. **Engagement**: Users stay informed about forum activity
2. **Responsiveness**: Quick notification of new content
3. **Moderation**: Admins get immediate alerts about reports
4. **Community**: Fosters active participation and discussion
5. **User Experience**: Personalized notifications based on user activity

## 📈 **Performance Considerations**

1. **Async Processing**: Notifications don't block main operations
2. **Bulk Operations**: Multiple notifications created efficiently
3. **Error Isolation**: Notification failures don't affect main functionality
4. **Database Optimization**: Proper indexing for notification queries

This comprehensive notification system ensures that all forum participants stay engaged and informed about community activity! 🎉✨
