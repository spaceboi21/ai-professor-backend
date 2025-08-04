# Community Module

A comprehensive forum system for the AI Professor platform that allows students and professors to engage in discussions, share knowledge, and collaborate through various types of content including meetings.

## Features

### 🗨️ **Forum Discussions**

- **Multiple Types**: Discussion, Question, Case Study, Announcement, Meeting
- **Rich Content**: Title, content, tags, and metadata
- **Search & Filter**: Find discussions by type, tags, author, or search terms
- **Pagination**: Efficient handling of large datasets

### 💬 **Replies & Threading**

- **Nested Replies**: Support for threaded conversations
- **Reply Counts**: Automatic tracking of reply counts
- **User Attribution**: All replies show who created them

### 🎥 **Meeting Integration**

- **Video Sessions**: Professors can create meeting discussions with video links
- **Platform Support**: Google Meet, Zoom, Teams, and other platforms
- **Scheduling**: Set meeting times and durations
- **Participants**: Invite specific users to meetings

### 👍 **Like System**

- **Separate Schema**: Efficient like tracking without arrays
- **Toggle Functionality**: Like and unlike content
- **Count Tracking**: Automatic like count updates
- **Duplicate Prevention**: Users can't like the same content twice

### 📌 **Pin System**

- **Personal Pins**: Users can pin discussions for quick access
- **Separate Schema**: Efficient pin tracking without arrays
- **Toggle Functionality**: Toggle pin status with a single API call
- **Priority Display**: Pinned discussions appear at the top of lists
- **User-Specific**: Each user has their own pinned discussions
- **Pin Status**: Check if a discussion is pinned by current user

### 🚨 **Reporting System**

- **Content Moderation**: Report inappropriate content
- **Multiple Report Types**: Inappropriate content, spam, harassment, misleading
- **Admin Review**: School admins can review and manage reports
- **Status Tracking**: Track report status (pending, reviewed, resolved, dismissed)

### 👨‍💼 **Admin Controls**

- **Archive Discussions**: School admins can archive discussions
- **Report Management**: View and manage all reports
- **Content Moderation**: Handle reported content appropriately

## Database Schemas

### Forum Discussion Schema

```typescript
{
  _id: ObjectId,
  title: string,
  content: string,
  type: DiscussionTypeEnum, // discussion, question, case_study, announcement, meeting
  tags: string[],
  created_by: ObjectId,
  created_by_role: RoleEnum,
  reply_count: number,
  view_count: number,
  like_count: number,

  // Meeting fields (only for meeting type)
  meeting_link?: string,
  meeting_platform?: VideoPlatformEnum,
  meeting_scheduled_at?: Date,
  meeting_duration_minutes?: number,
  meeting_participants?: ObjectId[],

  status: DiscussionStatusEnum, // active, archived, reported, deleted
  archived_at?: Date,
  archived_by?: ObjectId,
  deleted_at?: Date,
  deleted_by?: ObjectId,

  created_at: Date,
  updated_at: Date
}
```

### Forum Reply Schema

```typescript
{
  _id: ObjectId,
  discussion_id: ObjectId,
  content: string,
  created_by: ObjectId,
  created_by_role: RoleEnum,
  parent_reply_id?: ObjectId, // For nested replies
  like_count: number,
  status: ReplyStatusEnum, // active, reported, deleted
  deleted_at?: Date,
  deleted_by?: ObjectId,

  created_at: Date,
  updated_at: Date
}
```

### Forum Like Schema

```typescript
{
  _id: ObjectId,
  entity_type: LikeEntityTypeEnum, // discussion, reply
  entity_id: ObjectId,
  liked_by: ObjectId,

  created_at: Date,
  updated_at: Date
}
```

### Forum Pin Schema

```typescript
{
  _id: ObjectId,
  discussion_id: ObjectId,
  pinned_by: ObjectId,

  created_at: Date,
  updated_at: Date
}
```

### Forum Report Schema

```typescript
{
  _id: ObjectId,
  entity_type: ReportEntityTypeEnum, // discussion, reply
  entity_id: ObjectId,
  report_type: ReportTypeEnum, // inappropriate_content, spam, harassment, misleading, other
  reason: string,
  reported_by: ObjectId,
  reported_by_role: RoleEnum,
  status: ReportStatusEnum, // pending, reviewed, resolved, dismissed
  reviewed_by?: ObjectId,
  reviewed_at?: Date,
  admin_notes?: string,
  resolved_at?: Date,

  created_at: Date,
  updated_at: Date
}
```

## API Endpoints

### Discussions

#### Create Discussion

```http
POST /api/community/discussions
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Best practices for handling resistant patients",
  "content": "I would like to discuss effective strategies...",
  "type": "discussion",
  "tags": ["trauma", "resistance", "therapy"],
  "meeting_link": "https://meet.google.com/abc-defg-hij", // Only for meeting type
  "meeting_platform": "google_meet", // Only for meeting type
  "meeting_scheduled_at": "2024-01-15T10:00:00.000Z", // Only for meeting type
  "meeting_duration_minutes": 60, // Only for meeting type
  "meeting_participants": ["507f1f77bcf86cd799439011"] // Only for meeting type
}
```

#### Get All Discussions

```http
GET /api/community/discussions?type=discussion&search=trauma&tags[]=therapy&page=1&limit=10
Authorization: Bearer <token>
```

#### Get Single Discussion

```http
GET /api/community/discussions/:id
Authorization: Bearer <token>
```

### Replies

#### Create Reply

```http
POST /api/community/replies
Authorization: Bearer <token>
Content-Type: application/json

{
  "discussion_id": "507f1f77bcf86cd799439011",
  "content": "I have found that using motivational interviewing...",
  "parent_reply_id": "507f1f77bcf86cd799439012" // Optional for nested replies
}
```

#### Get Replies for Discussion

```http
GET /api/community/discussions/:id/replies?page=1&limit=20
Authorization: Bearer <token>
```

### Likes

#### Toggle Like

```http
POST /api/community/like/discussion/507f1f77bcf86cd799439011
Authorization: Bearer <token>
```

### Pins

#### Toggle Pin Status

```http
POST /api/community/discussions/toggle-pin
Authorization: Bearer <token>
Content-Type: application/json

{
  "discussion_id": "507f1f77bcf86cd799439011"
}
```

#### Get Pinned Discussions

```http
GET /api/community/discussions/pinned?page=1&limit=20
Authorization: Bearer <token>
```

#### Check Pin Status

```http
GET /api/community/discussions/:id/pin-status
Authorization: Bearer <token>
```

### Reports

#### Report Content

```http
POST /api/community/report
Authorization: Bearer <token>
Content-Type: application/json

{
  "entity_type": "discussion",
  "entity_id": "507f1f77bcf86cd799439011",
  "report_type": "inappropriate_content",
  "reason": "This content contains inappropriate language..."
}
```

#### Get Reports (Admin Only)

```http
GET /api/community/reports?page=1&limit=20
Authorization: Bearer <token>
```

### Admin Actions

#### Archive Discussion (Admin Only)

```http
POST /api/community/discussions/:id/archive
Authorization: Bearer <token>
```

## Query Parameters

### Discussion Filtering

- `type`: Filter by discussion type (discussion, question, case_study, announcement, meeting)
- `status`: Filter by status (active, archived, reported, deleted)
- `search`: Search in title and content
- `tags`: Filter by tags (array)
- `author_id`: Filter by author ID

### Pagination

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

## Role-Based Access

### Students

- ✅ Create discussions and replies
- ✅ Like/unlike content
- ✅ Report inappropriate content
- ✅ View all active discussions and replies
- ❌ Archive discussions
- ❌ View reports

### Professors

- ✅ All student permissions
- ✅ Create meeting discussions with video links
- ✅ Invite participants to meetings
- ❌ Archive discussions
- ❌ View reports

### School Admins

- ✅ All professor permissions
- ✅ Archive discussions
- ✅ View and manage reports
- ✅ Moderate content

### Super Admins

- ✅ All permissions across all schools

## Meeting Features

### Creating Meeting Discussions

When creating a discussion with `type: "meeting"`, the following fields are required:

```json
{
  "title": "Weekly Therapy Session",
  "content": "Join us for our weekly group therapy session...",
  "type": "meeting",
  "meeting_link": "https://meet.google.com/abc-defg-hij",
  "meeting_platform": "google_meet",
  "meeting_scheduled_at": "2024-01-15T10:00:00.000Z",
  "meeting_duration_minutes": 60,
  "meeting_participants": ["507f1f77bcf86cd799439011"]
}
```

### Supported Video Platforms

- `google_meet`: Google Meet
- `zoom`: Zoom
- `teams`: Microsoft Teams
- `other`: Other platforms

## Reporting System

### Report Types

- `inappropriate_content`: Content violates community guidelines
- `spam`: Unwanted promotional content
- `harassment`: Bullying or harassment
- `misleading`: False or misleading information
- `other`: Other issues

### Report Status Flow

1. **PENDING**: Initial status when report is created
2. **REVIEWED**: Admin has reviewed the report
3. **RESOLVED**: Issue has been resolved
4. **DISMISSED**: Report was dismissed as invalid

## Database Migration

To add the community schemas to existing tenant databases:

```bash
# Run migration for a specific tenant database
yarn migrate --type tenant --db-name school_abc_db

# Or run for all tenant databases
yarn migrate --type tenant
```

## Performance Optimizations

### Indexes

- Compound indexes for efficient filtering
- Unique indexes to prevent duplicate likes
- Text indexes for search functionality
- Date-based indexes for chronological sorting

### Pagination

- Efficient skip/limit queries
- Total count tracking
- Configurable page sizes

### User Details

- Automatic user information attachment
- Efficient user lookup caching
- Role-based data filtering

## Security Features

### Input Validation

- Comprehensive DTO validation
- Type checking for all inputs
- Sanitization of user content

### Access Control

- JWT-based authentication
- Role-based authorization
- School-specific data isolation

### Content Moderation

- Reporting system for inappropriate content
- Admin review workflow
- Archive functionality for problematic content

## Error Handling

### Common Error Responses

- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Duplicate operation (e.g., already liked)

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Invalid input data",
  "error": "Bad Request"
}
```

## Usage Examples

### Creating a Regular Discussion

```javascript
const response = await fetch('/api/community/discussions', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'CBT techniques for anxiety disorders',
    content: 'I would like to discuss effective CBT techniques...',
    type: 'discussion',
    tags: ['cbt', 'anxiety', 'therapy'],
  }),
});
```

### Creating a Meeting Discussion

```javascript
const response = await fetch('/api/community/discussions', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'Weekly Group Therapy Session',
    content: 'Join us for our weekly group therapy session...',
    type: 'meeting',
    tags: ['group-therapy', 'weekly'],
    meeting_link: 'https://meet.google.com/abc-defg-hij',
    meeting_platform: 'google_meet',
    meeting_scheduled_at: '2024-01-15T10:00:00.000Z',
    meeting_duration_minutes: 60,
    meeting_participants: ['507f1f77bcf86cd799439011'],
  }),
});
```

### Liking a Discussion

```javascript
const response = await fetch(
  '/api/community/like/discussion/507f1f77bcf86cd799439011',
  {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
    },
  },
);
```

### Reporting Content

```javascript
const response = await fetch('/api/community/report', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    entity_type: 'discussion',
    entity_id: '507f1f77bcf86cd799439011',
    report_type: 'inappropriate_content',
    reason: 'This content contains inappropriate language...',
  }),
});
```

This community module provides a comprehensive forum system that integrates seamlessly with the existing AI Professor platform, offering rich functionality for student and professor collaboration while maintaining proper security and moderation controls.
