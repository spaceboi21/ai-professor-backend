# Role-Based Access Control (RBAC) for Community Module

This document explains the role-based access control implementation for the community module, defining what each user role can do within the forum system.

## 🎯 **Role Hierarchy**

### **SUPER_ADMIN** (Highest Level)

- ✅ **Full access** across all schools
- ✅ **All permissions** of other roles
- ✅ **System-wide management**

### **SCHOOL_ADMIN** (School Level)

- ✅ **All professor permissions**
- ✅ **Content moderation** (archive discussions)
- ✅ **Report management** (view and handle reports)
- ✅ **School-specific management**

### **PROFESSOR** (Teaching Level)

- ✅ **All student permissions**
- ✅ **Create meeting discussions** with video links
- ✅ **View archived discussions**
- ✅ **Invite participants** to meetings

### **STUDENT** (Learning Level)

- ✅ **Basic forum participation**
- ✅ **Create discussions and replies**
- ✅ **Like/unlike content**
- ✅ **Report inappropriate content**

## 📋 **Detailed Permissions by Role**

### **STUDENT Permissions**

#### ✅ **Allowed Actions**

- **Create discussions** (except meetings)
- **Create replies** to discussions
- **Like/unlike** discussions and replies
- **Report** inappropriate content
- **View active discussions** only
- **View their own reported content**

#### ❌ **Restricted Actions**

- Cannot create **meeting discussions**
- Cannot view **archived discussions**
- Cannot view **reports**
- Cannot **archive discussions**
- Cannot view **reported content** from others

#### 🔍 **Content Visibility**

- **Active discussions** only
- **Their own reported content** (if any)
- **All replies** to visible discussions

---

### **PROFESSOR Permissions**

#### ✅ **Allowed Actions**

- **All student permissions**
- **Create meeting discussions** with video links
- **Invite participants** to meetings
- **View archived discussions**
- **View their own reported content**

#### ❌ **Restricted Actions**

- Cannot view **reports**
- Cannot **archive discussions**
- Cannot view **reported content** from others

#### 🔍 **Content Visibility**

- **Active discussions**
- **Archived discussions**
- **Their own reported content** (if any)
- **All replies** to visible discussions

---

### **SCHOOL_ADMIN Permissions**

#### ✅ **Allowed Actions**

- **All professor permissions**
- **Archive discussions**
- **View all reports**
- **Manage reported content**
- **View all content** (including reported)

#### 🔍 **Content Visibility**

- **All discussions** (active, archived, reported, deleted)
- **All replies**
- **All reports**

---

### **SUPER_ADMIN Permissions**

#### ✅ **Allowed Actions**

- **All permissions** across all schools
- **Cross-school management**
- **System-wide oversight**

#### 🔍 **Content Visibility**

- **All content** across all schools
- **All reports** across all schools

## 🔐 **API Endpoint Access by Role**

### **POST /community/discussions**

- ✅ **STUDENT**: Create regular discussions
- ✅ **PROFESSOR**: Create discussions + meetings
- ✅ **SCHOOL_ADMIN**: Create all types
- ✅ **SUPER_ADMIN**: Create all types

### **GET /community/discussions**

- ✅ **STUDENT**: View active discussions only
- ✅ **PROFESSOR**: View active + archived
- ✅ **SCHOOL_ADMIN**: View all discussions
- ✅ **SUPER_ADMIN**: View all discussions

### **GET /community/discussions/:id**

- ✅ **STUDENT**: View active discussions only
- ✅ **PROFESSOR**: View active + archived
- ✅ **SCHOOL_ADMIN**: View all discussions
- ✅ **SUPER_ADMIN**: View all discussions

### **POST /community/replies**

- ✅ **STUDENT**: Reply to visible discussions
- ✅ **PROFESSOR**: Reply to visible discussions
- ✅ **SCHOOL_ADMIN**: Reply to any discussion
- ✅ **SUPER_ADMIN**: Reply to any discussion

### **GET /community/discussions/:id/replies**

- ✅ **STUDENT**: View replies to visible discussions
- ✅ **PROFESSOR**: View replies to visible discussions
- ✅ **SCHOOL_ADMIN**: View all replies
- ✅ **SUPER_ADMIN**: View all replies

### **POST /community/like/:entityType/:entityId**

- ✅ **STUDENT**: Like visible content
- ✅ **PROFESSOR**: Like visible content
- ✅ **SCHOOL_ADMIN**: Like any content
- ✅ **SUPER_ADMIN**: Like any content

### **POST /community/report**

- ✅ **STUDENT**: Report inappropriate content
- ✅ **PROFESSOR**: Report inappropriate content
- ✅ **SCHOOL_ADMIN**: Report inappropriate content
- ✅ **SUPER_ADMIN**: Report inappropriate content

### **GET /community/reports** (Admin Only)

- ❌ **STUDENT**: Access denied
- ❌ **PROFESSOR**: Access denied
- ✅ **SCHOOL_ADMIN**: View all reports
- ✅ **SUPER_ADMIN**: View all reports

### **POST /community/discussions/:id/archive** (Admin Only)

- ❌ **STUDENT**: Access denied
- ❌ **PROFESSOR**: Access denied
- ✅ **SCHOOL_ADMIN**: Archive discussions
- ✅ **SUPER_ADMIN**: Archive discussions

## 🛡️ **Security Features**

### **Content Filtering**

- **Students** only see active discussions
- **Professors** see active and archived discussions
- **Admins** see all content including reported/deleted

### **Meeting Restrictions**

- Only **professors and admins** can create meeting discussions
- **Students** cannot create meetings but can participate

### **Report Privacy**

- Users can only see their own reported content
- **Admins** can see all reports and reported content

### **Cross-School Isolation**

- **SUPER_ADMIN** can access all schools
- **Other roles** are limited to their school

## 🔄 **Role-Based Content Flow**

### **Discussion Creation Flow**

```
STUDENT → Regular discussions only
PROFESSOR → Regular discussions + meetings
SCHOOL_ADMIN → All types + moderation
SUPER_ADMIN → All types + cross-school
```

### **Content Visibility Flow**

```
STUDENT → Active discussions only
PROFESSOR → Active + archived
SCHOOL_ADMIN → All content
SUPER_ADMIN → All content (all schools)
```

### **Moderation Flow**

```
STUDENT → Report content
PROFESSOR → Report content
SCHOOL_ADMIN → View reports + archive content
SUPER_ADMIN → Full moderation (all schools)
```

## 📊 **Role Comparison Matrix**

| Feature               | STUDENT | PROFESSOR | SCHOOL_ADMIN | SUPER_ADMIN |
| --------------------- | ------- | --------- | ------------ | ----------- |
| Create discussions    | ✅      | ✅        | ✅           | ✅          |
| Create meetings       | ❌      | ✅        | ✅           | ✅          |
| View active content   | ✅      | ✅        | ✅           | ✅          |
| View archived content | ❌      | ✅        | ✅           | ✅          |
| View reported content | ❌      | ❌        | ✅           | ✅          |
| Like content          | ✅      | ✅        | ✅           | ✅          |
| Report content        | ✅      | ✅        | ✅           | ✅          |
| View reports          | ❌      | ❌        | ✅           | ✅          |
| Archive discussions   | ❌      | ❌        | ✅           | ✅          |
| Cross-school access   | ❌      | ❌        | ❌           | ✅          |

## 🚨 **Error Handling**

### **403 Forbidden Responses**

- Student trying to create meeting discussion
- Non-admin trying to view reports
- Non-admin trying to archive discussions
- User trying to access content outside their role

### **400 Bad Request Responses**

- Invalid meeting data for non-professors
- Invalid role-based filtering

### **404 Not Found Responses**

- User trying to access content they can't see
- School not found for user

## 🔧 **Implementation Details**

### **Guard Implementation**

```typescript
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN)
```

### **Service-Level Validation**

```typescript
// Check if user can create meeting discussions
if (type === DiscussionTypeEnum.MEETING) {
  if (
    ![RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN].includes(
      user.role.name,
    )
  ) {
    throw new ForbiddenException(
      'Only professors and admins can create meeting discussions',
    );
  }
}
```

### **Content Filtering**

```typescript
// Role-based content filtering
if (user.role.name === RoleEnum.STUDENT) {
  filter.$or = [
    { status: DiscussionStatusEnum.ACTIVE },
    { status: DiscussionStatusEnum.REPORTED, created_by: user.id },
  ];
}
```

This RBAC system ensures that users can only access and modify content appropriate to their role, maintaining security and data integrity across the community module.
