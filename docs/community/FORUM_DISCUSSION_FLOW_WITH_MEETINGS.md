# Forum Discussion Flow with Meeting Details Integration

## 🎯 **Overview**

The AI Professor platform's community module provides a comprehensive forum system that supports various types of discussions, including **meeting discussions** with integrated video platform details, scheduling, and duration information.

## 🏗️ **Architecture Overview**

### **Core Components**

- **Forum Discussions**: Base discussion system with multiple types
- **Meeting Integration**: Special handling for meeting-type discussions
- **User Management**: Role-based access control and user details
- **Attachment System**: File uploads for discussions and replies
- **Mention System**: @username mentions with notifications
- **Like & Pin System**: User interaction tracking

## 📋 **Discussion Types**

### **Supported Types**

1. **`DISCUSSION`** - General forum discussions
2. **`QUESTION`** - Questions seeking answers
3. **`CASE_STUDY`** - Case study discussions
4. **`ANNOUNCEMENT`** - Important announcements
5. **`MEETING`** - Video meeting discussions ⭐

### **Meeting Type Special Features**

- **Video Platform Integration**: Google Meet, Zoom, Teams, Other
- **Scheduling**: Set meeting date and time
- **Duration**: Meeting length in minutes
- **Platform-specific Links**: Direct video meeting URLs
- **Time-based Filtering**: Upcoming, past, today's meetings

## 🗄️ **Database Schema**

### **Forum Discussion Schema**

```typescript
{
  _id: ObjectId,
  title: string,                    // Discussion title
  content: string,                  // Discussion content
  type: DiscussionTypeEnum,         // Type (including MEETING)
  tags: string[],                   // Categorization tags
  created_by: ObjectId,             // Creator user ID
  created_by_role: RoleEnum,        // Creator role
  reply_count: number,              // Number of replies
  view_count: number,               // Number of views
  like_count: number,               // Number of likes

  // Meeting fields (only for meeting type)
  meeting_link?: string,            // Video meeting URL
  meeting_platform?: VideoPlatformEnum, // Platform (Google Meet, Zoom, etc.)
  meeting_scheduled_at?: Date,      // Scheduled meeting time
  meeting_duration_minutes?: number, // Meeting duration

  status: DiscussionStatusEnum,     // Active, Archived, etc.
  created_at: Date,                 // Creation timestamp
  updated_at: Date                  // Last update timestamp
}
```

### **Video Platform Enum**

```typescript
enum VideoPlatformEnum {
  GOOGLE_MEET = 'google_meet',
  ZOOM = 'zoom',
  TEAMS = 'teams',
  OTHER = 'other',
}
```

## 🚀 **API Endpoints**

### **Core Discussion Endpoints**

#### **1. Create Discussion**

```http
POST /api/community/discussions
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Weekly Therapy Session",
  "content": "Join us for our weekly group therapy session...",
  "type": "meeting",
  "tags": ["therapy", "group-session", "weekly"],
  "meeting_link": "https://meet.google.com/abc-defg-hij",
  "meeting_platform": "google_meet",
  "meeting_scheduled_at": "2024-01-15T10:00:00.000Z",
  "meeting_duration_minutes": 60
}
```

**Meeting Type Requirements:**

- `meeting_link`: Required video meeting URL
- `meeting_platform`: Required video platform
- `meeting_scheduled_at`: Required scheduled time
- `meeting_duration_minutes`: Required duration

**Access Control:**

- ✅ **Professors & Admins**: Can create meeting discussions
- ❌ **Students**: Cannot create meeting discussions

#### **2. Get All Discussions**

```http
GET /api/community/discussions?type=meeting&meeting_platform=google_meet
Authorization: Bearer <token>
```

**Enhanced Filtering Options:**

- `type`: Filter by discussion type
- `meeting_platform`: Filter by video platform
- `meeting_scheduled_from`: Filter from date
- `meeting_scheduled_until`: Filter until date
- `meeting_timing`: Filter by timing (upcoming, past, today)
- `search`: Search in title and content
- `tags`: Filter by tags
- `author_id`: Filter by author

#### **3. Get Single Discussion**

```http
GET /api/community/discussions/{id}
Authorization: Bearer <token>
```

**Response Includes:**

- All discussion details
- Meeting information (if meeting type)
- User details and interaction status
- Attachments and mentions
- Like and pin status

### **Meeting-Specific Endpoints**

#### **1. Get All Meeting Discussions**

```http
GET /api/community/discussions/meetings?meeting_timing=upcoming
Authorization: Bearer <token>
```

#### **2. Get Upcoming Meetings**

```http
GET /api/community/discussions/meetings/upcoming
Authorization: Bearer <token>
```

#### **3. Get Today's Meetings**

```http
GET /api/community/discussions/meetings/today
Authorization: Bearer <token>
```

## 🔍 **Enhanced Filtering & Sorting**

### **Meeting-Specific Filters**

#### **Platform Filtering**

```typescript
// Filter by video platform
filterDto.meeting_platform = VideoPlatformEnum.GOOGLE_MEET;
```

#### **Date Range Filtering**

```typescript
// Filter by date range
filterDto.meeting_scheduled_from = '2024-01-15T00:00:00.000Z';
filterDto.meeting_scheduled_until = '2024-01-31T23:59:59.999Z';
```

#### **Timing-Based Filtering**

```typescript
// Filter by timing
filterDto.meeting_timing = 'upcoming'; // Future meetings
filterDto.meeting_timing = 'past'; // Expired meetings
filterDto.meeting_timing = 'today'; // Today's meetings
```

### **Smart Sorting Algorithm**

```typescript
// Priority-based sorting
{
  is_pinned: -1,           // Pinned discussions first
  is_upcoming_meeting: -1, // Upcoming meetings second
  meeting_priority: 1,      // Sort by meeting time (earliest first)
  last_reply_date: -1       // Then by activity
}
```

## 📊 **Response Structure**

### **Discussion Response DTO**

```typescript
{
  _id: string,
  title: string,
  content: string,
  type: DiscussionTypeEnum,
  tags: string[],

  // Meeting fields (only for meeting type)
  meeting_link?: string,
  meeting_platform?: VideoPlatformEnum,
  meeting_scheduled_at?: Date,
  meeting_duration_minutes?: number,

  // User and interaction details
  created_by_user: DiscussionUserDto,
  is_pinned: boolean,
  has_liked: boolean,
  is_unread: boolean,

  // Metadata
  reply_count: number,
  view_count: number,
  like_count: number,
  created_at: Date,
  updated_at: Date
}
```

## 🔐 **Role-Based Access Control**

### **Students**

- ✅ View all active discussions (including meetings)
- ✅ Create regular discussions, questions, case studies
- ✅ Reply to discussions
- ✅ Like and pin discussions
- ❌ Create meeting discussions
- ❌ Access admin features

### **Professors**

- ✅ All student permissions
- ✅ Create meeting discussions
- ✅ Set meeting schedules and platforms
- ✅ Manage meeting details
- ❌ Archive discussions
- ❌ View reports

### **School Admins**

- ✅ All professor permissions
- ✅ Archive discussions
- ✅ View and manage reports
- ✅ Moderate content

### **Super Admins**

- ✅ All permissions across all schools

## 🎥 **Meeting Management Features**

### **Creating Meeting Discussions**

1. **Set Type**: Choose `type: "meeting"`
2. **Platform**: Select video platform (Google Meet, Zoom, Teams, Other)
3. **Schedule**: Set meeting date and time
4. **Duration**: Specify meeting length in minutes
5. **Link**: Provide platform-specific meeting URL

### **Meeting Discovery**

- **Upcoming Meetings**: Future meetings sorted by time
- **Today's Meetings**: Meetings scheduled for today
- **Platform Filtering**: Filter by specific video platforms
- **Date Range**: Filter by custom date ranges
- **Search**: Find meetings by title or content

### **Meeting Information Display**

- **Meeting Link**: Direct access to video platform
- **Platform Icon**: Visual platform identification
- **Scheduled Time**: Clear meeting timing
- **Duration**: Meeting length information
- **Creator Details**: Who organized the meeting

## 📱 **Frontend Integration**

### **Meeting Discussion Cards**

```typescript
// Example meeting discussion display
{
  title: "Weekly Therapy Session",
  type: "meeting",
  meeting_platform: "google_meet",
  meeting_scheduled_at: "2024-01-15T10:00:00.000Z",
  meeting_duration_minutes: 60,
  meeting_link: "https://meet.google.com/abc-defg-hij"
}
```

### **Meeting Filters UI**

- **Platform Selector**: Dropdown for video platforms
- **Date Range Picker**: From/To date inputs
- **Timing Tabs**: Upcoming/Past/Today quick filters
- **Search Bar**: Text search functionality

### **Meeting Calendar View**

- **Timeline Display**: Chronological meeting list
- **Platform Icons**: Visual platform identification
- **Time Indicators**: Clear scheduling information
- **Quick Actions**: Join, Edit, Delete options

## 🚀 **Performance Optimizations**

### **Database Indexes**

```typescript
// Meeting-specific indexes
{ meeting_scheduled_at: 1, status: 1 }
{ type: 1, meeting_platform: 1 }
{ meeting_scheduled_at: 1, type: 1 }
```

### **Aggregation Pipeline**

- **Efficient Lookups**: Optimized user and interaction data
- **Smart Sorting**: Priority-based meeting ordering
- **Pagination**: Efficient large dataset handling

### **Caching Strategy**

- **User Interactions**: Cache like/pin status
- **Meeting Lists**: Cache filtered meeting results
- **User Details**: Cache user information

## 🔧 **Configuration & Customization**

### **Environment Variables**

```bash
# Meeting platform settings
MEETING_PLATFORMS_ENABLED=google_meet,zoom,teams,other
DEFAULT_MEETING_DURATION=60
MAX_MEETING_DURATION=480
```

### **Platform Integration**

- **Google Meet**: Direct meeting link support
- **Zoom**: Meeting ID and password handling
- **Teams**: Microsoft Teams integration
- **Custom**: Other platform support

## 📈 **Future Enhancements**

### **Planned Features**

- **Recurring Meetings**: Weekly/monthly meeting patterns
- **Meeting Reminders**: Email/notification reminders
- **Participant Management**: Invite specific users
- **Meeting Recording**: Post-meeting content
- **Integration APIs**: Calendar system integration

### **Advanced Meeting Features**

- **Meeting Templates**: Pre-configured meeting types
- **Resource Sharing**: Pre-meeting materials
- **Attendance Tracking**: Participant check-in
- **Meeting Notes**: Collaborative note-taking
- **Follow-up Actions**: Post-meeting tasks

## 🧪 **Testing & Validation**

### **Meeting Creation Tests**

- ✅ Valid meeting data creation
- ✅ Required field validation
- ✅ Platform enum validation
- ✅ Date format validation
- ✅ Role-based access control

### **Meeting Filtering Tests**

- ✅ Platform-based filtering
- ✅ Date range filtering
- ✅ Timing-based filtering
- ✅ Combined filter combinations
- ✅ Pagination with filters

### **Meeting Response Tests**

- ✅ Meeting fields inclusion
- ✅ Platform information display
- ✅ Scheduling details accuracy
- ✅ Duration information
- ✅ Meeting link accessibility

## 📚 **API Documentation**

### **Swagger Integration**

- **Complete DTOs**: Full request/response documentation
- **Meeting Examples**: Meeting-specific API examples
- **Filter Documentation**: All filtering options explained
- **Response Schemas**: Detailed response structures

### **API Examples**

- **Meeting Creation**: Complete meeting setup example
- **Filter Usage**: Various filtering scenarios
- **Response Handling**: How to process meeting data
- **Error Handling**: Common error scenarios

## 🔍 **Troubleshooting**

### **Common Issues**

1. **Meeting Fields Missing**: Ensure type is set to "meeting"
2. **Platform Validation**: Check platform enum values
3. **Date Format**: Use ISO 8601 date format
4. **Access Control**: Verify user role permissions
5. **Filter Issues**: Check filter parameter names

### **Debug Information**

- **Logging**: Detailed service method logging
- **Filter Queries**: MongoDB filter query logging
- **User Context**: Current user role and permissions
- **Validation Errors**: Detailed validation messages

## 📖 **Conclusion**

The forum discussion system with meeting integration provides a comprehensive platform for educational communities to:

- **Organize Discussions**: Multiple discussion types for different purposes
- **Manage Meetings**: Integrated video meeting management
- **Enhance Collaboration**: Rich content with attachments and mentions
- **Control Access**: Role-based permissions and security
- **Scale Efficiently**: Optimized database queries and caching

This system enables professors and administrators to create engaging meeting discussions while providing students with easy access to scheduled sessions and platform-specific meeting information.
