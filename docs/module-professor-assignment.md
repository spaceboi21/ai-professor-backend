# Module-Professor Assignment System

## Overview

The Module-Professor Assignment System allows School Administrators to assign professors to modules and manage their access. This system provides comprehensive functionality for assignment management, access control, audit logging, and notifications.

## Features

### Core Functionality

- **Assign Professors to Modules**: School Admins can assign one or multiple professors to a single module
- **Unassign Professors**: Remove professors from modules
- **Multiple Module Support**: Professors can be assigned to multiple modules without restriction
- **Access Control**: Professors can only access modules they are assigned to
- **Assignment Management**: View and manage all assignments per module and per professor
- **Audit Trail**: Complete logging of all assignment and unassignment actions
- **Notifications**: Notify professors when they are assigned/unassigned from modules

### Security & Access Control

- **Role-Based Permissions**: Only SUPER_ADMIN and SCHOOL_ADMIN can manage assignments
- **School Isolation**: Users can only access data from their own school
- **Professor Access Control**: Professors can only access modules they are assigned to
- **Audit Logging**: All assignment actions are logged for accountability

## Database Schemas

### ModuleProfessorAssignment Schema

```typescript
{
  _id: ObjectId,
  module_id: ObjectId,           // Reference to Module
  professor_id: ObjectId,        // Reference to User (Professor)
  assigned_by: ObjectId,         // Reference to User who made assignment
  assigned_by_role: RoleEnum,    // Role of user who made assignment
  assigned_at: Date,             // When assignment was made
  unassigned_at: Date,           // When unassigned (if applicable)
  unassigned_by: ObjectId,       // Who unassigned (if applicable)
  unassigned_by_role: RoleEnum,  // Role of user who unassigned
  is_active: Boolean,            // Whether assignment is currently active
  deleted_at: Date,              // Soft delete timestamp
  created_at: Date,              // Document creation timestamp
  updated_at: Date               // Document update timestamp
}
```

### AssignmentAuditLog Schema

```typescript
{
  _id: ObjectId,
  module_id: ObjectId,           // Reference to Module
  professor_id: ObjectId,        // Reference to User (Professor)
  action: AssignmentActionEnum,  // ASSIGN or UNASSIGN
  performed_by: ObjectId,        // Reference to User who performed action
  performed_by_role: RoleEnum,   // Role of user who performed action
  action_description: String,    // Human-readable description
  previous_data: Object,         // Data before action
  new_data: Object,             // Data after action
  reason: String,               // Optional reason for action
  ip_address: String,           // IP address of requester
  user_agent: String,           // User agent of requester
  created_at: Date,             // When audit log was created
  updated_at: Date              // When audit log was updated
}
```

## API Endpoints

### Module Assignment Management

#### Assign Professors to Module

```http
POST /api/modules/assign-professors
Authorization: Bearer <token>
Content-Type: application/json

{
  "module_id": "507f1f77bcf86cd799439011",
  "assignments": [
    {
      "professor_id": "507f1f77bcf86cd799439012"
    },
    {
      "professor_id": "507f1f77bcf86cd799439013"
    }
  ]
}
```

**Response:**

```json
{
  "message": "Professor assignments processed",
  "data": {
    "module_id": "507f1f77bcf86cd799439011",
    "module_title": "Introduction to Psychology",
    "results": [
      {
        "professor_id": "507f1f77bcf86cd799439012",
        "status": "assigned",
        "message": "Professor assigned successfully"
      },
      {
        "professor_id": "507f1f77bcf86cd799439013",
        "status": "updated",
        "message": "Assignment updated successfully"
      }
    ],
    "audit_logs_created": 2
  }
}
```

#### Unassign Professor from Module

```http
POST /api/modules/unassign-professor
Authorization: Bearer <token>
Content-Type: application/json

{
  "module_id": "507f1f77bcf86cd799439011",
  "professor_id": "507f1f77bcf86cd799439012"
}
```

**Response:**

```json
{
  "message": "Professor unassigned successfully",
  "data": {
    "module_id": "507f1f77bcf86cd799439011",
    "module_title": "Introduction to Psychology",
    "professor_id": "507f1f77bcf86cd799439012",
    "professor_name": "Dr. John Smith",
    "audit_log_created": "507f1f77bcf86cd799439014"
  }
}
```

#### Get Module Assignments

```http
GET /api/modules/{moduleId}/assignments
Authorization: Bearer <token>
```

**Response:**

```json
{
  "message": "Module assignments retrieved successfully",
  "data": {
    "module_id": "507f1f77bcf86cd799439011",
    "module_title": "Introduction to Psychology",
    "assignments": [
      {
        "id": "507f1f77bcf86cd799439015",
        "professor_id": "507f1f77bcf86cd799439012",
        "professor_name": "Dr. John Smith",
        "professor_email": "john.smith@school.com",
        "assigned_at": "2024-01-15T10:30:00.000Z",
        "assigned_by": "507f1f77bcf86cd799439016"
      }
    ],
    "total_assignments": 1
  }
}
```

### Professor Assignment Management

#### Get Professor Assignments

```http
GET /api/professor/{professorId}/assignments?page=1&limit=10
Authorization: Bearer <token>
```

**Response:**

```json
{
  "message": "Professor assignments retrieved successfully",
  "data": {
    "professor_id": "507f1f77bcf86cd799439012",
    "professor_name": "Dr. John Smith",
    "professor_email": "john.smith@school.com",
    "assignments": [
      {
        "id": "507f1f77bcf86cd799439015",
        "module_id": "507f1f77bcf86cd799439011",
        "module_title": "Introduction to Psychology",
        "module_subject": "Psychology",
        "module_description": "Basic concepts of psychology",
        "module_category": "Social Sciences",
        "module_difficulty": "BEGINNER",
        "module_duration": 120,
        "module_tags": ["psychology", "intro"],
        "module_thumbnail": "https://example.com/thumbnail.jpg",
        "module_published": true,
        "assigned_at": "2024-01-15T10:30:00.000Z",
        "assigned_by": "507f1f77bcf86cd799439016"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "total_pages": 1,
      "has_next": false,
      "has_prev": false
    }
  }
}
```

#### Check Professor Module Access

```http
GET /api/professor/{professorId}/module-access/{moduleId}
Authorization: Bearer <token>
```

**Response:**

```json
{
  "has_access": true,
  "assignment_id": "507f1f77bcf86cd799439015"
}
```

### Audit Logs

#### Get Assignment Audit Logs

```http
GET /api/modules/assignments/audit-logs?module_id=507f1f77bcf86cd799439011&page=1&limit=10
Authorization: Bearer <token>
```

**Response:**

```json
{
  "message": "Assignment audit logs retrieved successfully",
  "data": {
    "audit_logs": [
      {
        "id": "507f1f77bcf86cd799439017",
        "module_id": "507f1f77bcf86cd799439011",
        "module_title": "Introduction to Psychology",
        "professor_id": "507f1f77bcf86cd799439012",
        "professor_name": "Dr. John Smith",
        "professor_email": "john.smith@school.com",
        "action": "ASSIGN",
        "performed_by": "507f1f77bcf86cd799439016",
        "performed_by_name": "Admin User",
        "performed_by_email": "admin@school.com",
        "performed_by_role": "SCHOOL_ADMIN",
        "action_description": "Assigned professor to module",
        "previous_data": {},
        "new_data": {
          "assigned_at": "2024-01-15T10:30:00.000Z",
          "assigned_by": "507f1f77bcf86cd799439016"
        },
        "reason": null,
        "created_at": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "total_pages": 1,
      "has_next": false,
      "has_prev": false
    }
  }
}
```

## Access Control

### Role-Based Permissions

| Endpoint                  | SUPER_ADMIN | SCHOOL_ADMIN | PROFESSOR | STUDENT |
| ------------------------- | ----------- | ------------ | --------- | ------- |
| Assign Professors         | ✅          | ✅           | ❌        | ❌      |
| Unassign Professors       | ✅          | ✅           | ❌        | ❌      |
| Get Module Assignments    | ✅          | ✅           | ❌        | ❌      |
| Get Professor Assignments | ✅          | ✅           | ✅        | ❌      |
| Check Module Access       | ✅          | ✅           | ✅        | ❌      |
| Get Audit Logs            | ✅          | ✅           | ❌        | ❌      |

### School Isolation

- All operations are scoped to the user's school
- Users can only access data from their own school
- Cross-school access is prevented

### Professor Access Control

- Professors can only access modules they are assigned to
- Module access is enforced in the `ModulesService.findModuleById()` method
- Unassigned professors receive a 404 error when trying to access modules

## Notifications

The system includes a notification framework for assignment events:

### Notification Types

- `assignment_created`: When a professor is first assigned to a module
- `assignment_updated`: When an existing assignment is updated
- `assignment_removed`: When a professor is unassigned from a module

### Notification Data

```typescript
{
  professor_id: ObjectId,
  type: string,
  module_title: string,
  timestamp: Date
}
```

## Audit Trail

### Audit Actions

- `ASSIGN`: Professor assigned to module
- `UNASSIGN`: Professor unassigned from module

### Audit Data

- Complete before/after data snapshots
- User information (who performed the action)
- Timestamps and IP addresses
- Action descriptions and optional reasons

## Usage Examples

### Assigning Multiple Professors to a Module

```javascript
const response = await fetch('/api/modules/assign-professors', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    module_id: '507f1f77bcf86cd799439011',
    assignments: [
      { professor_id: '507f1f77bcf86cd799439012' },
      { professor_id: '507f1f77bcf86cd799439013' },
    ],
  }),
});
```

### Checking Professor Access

```javascript
const response = await fetch(
  `/api/professor/${professorId}/module-access/${moduleId}`,
  {
    headers: {
      Authorization: 'Bearer ' + token,
    },
  },
);

const { has_access } = await response.json();
if (has_access) {
  // Allow access to module
} else {
  // Show access denied message
}
```

### Getting Assignment Audit Logs

```javascript
const response = await fetch(
  '/api/modules/assignments/audit-logs?module_id=507f1f77bcf86cd799439011&page=1&limit=10',
  {
    headers: {
      Authorization: 'Bearer ' + token,
    },
  },
);

const {
  data: { audit_logs },
} = await response.json();
audit_logs.forEach((log) => {
  console.log(`${log.action_description} by ${log.performed_by_name}`);
});
```

## Error Handling

### Common Error Responses

#### 404 - Not Found

```json
{
  "statusCode": 404,
  "message": "Module not found"
}
```

#### 400 - Bad Request

```json
{
  "statusCode": 400,
  "message": "Professor is not assigned to this module"
}
```

#### 403 - Forbidden

```json
{
  "statusCode": 403,
  "message": "Access denied - Only assigned professors can access this module"
}
```

## Database Indexes

### ModuleProfessorAssignment Indexes

- `{ module_id: 1, professor_id: 1 }` (unique compound index)
- `{ module_id: 1, is_active: 1 }`
- `{ professor_id: 1, is_active: 1 }`

### AssignmentAuditLog Indexes

- `{ module_id: 1, created_at: -1 }`
- `{ professor_id: 1, created_at: -1 }`
- `{ performed_by: 1, created_at: -1 }`
- `{ action: 1, created_at: -1 }`

## Security Considerations

1. **Input Validation**: All inputs are validated using class-validator
2. **SQL Injection Prevention**: Using Mongoose ODM with parameterized queries
3. **Authorization**: Role-based access control on all endpoints
4. **Audit Logging**: All assignment actions are logged for accountability
5. **School Isolation**: Data is properly scoped to user's school
6. **Error Handling**: Comprehensive error handling without information leakage
