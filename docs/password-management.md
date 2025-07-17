# Password Management API

This document describes the password management functionality for school admins and professors in the AI Professor backend.

## Overview

The password management system provides two main features:
1. **Forget Password**: Allows users to request a password reset via email
2. **Reset Password**: Allows users to change their password with old password verification

## API Endpoints

### 1. Forget Password

**Endpoint**: `POST /auth/forgot-password`

**Description**: Request a password reset link to be sent to the user's email address.

**Request Body**:
```json
{
  "email": "admin@school.edu"
}
```

**Response**:
```json
{
  "message": "Password reset link has been sent to your email"
}
```

**Error Responses**:
- `404`: User not found with this email
- `400`: Account is deactivated

### 2. Reset Password Page

**URL**: `GET /static/reset-password?token=<reset_token>`

**Description**: Static HTML page served by the backend that allows users to set a new password using the reset token received via email.

**Features**:
- Password validation with real-time feedback
- Password confirmation matching
- Modern, responsive UI
- Client-side validation matching backend requirements
- Direct API integration with `/auth/set-new-password`

### 3. Set New Password API

**Endpoint**: `POST /auth/set-new-password`

**Description**: Set a new password using the reset token received via email.

**Request Body**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "new_password": "NewPassword123!"
}
```

**Response**:
```json
{
  "message": "Password updated successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "admin@school.edu",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

**Error Responses**:
- `400`: Invalid or expired token
- `404`: User not found

### 4. Reset Password (School Admin/Professor - Authenticated)

**Endpoint**: `POST /api/school-admin/reset-password`

**Description**: Reset password for authenticated school admin or professor with old password verification. User ID is extracted from JWT token.

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Request Body**:
```json
{
  "old_password": "OldPassword123!",
  "new_password": "NewPassword123!"
}
```

**Response**:
```json
{
  "message": "Password updated successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "admin@school.edu",
    "first_name": "John",
    "last_name": "Doe",
    "school_id": "507f1f77bcf86cd799439012",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses**:
- `404`: User not found
- `400`: Invalid old password

### 5. Reset Password (Student - Authenticated)

**Endpoint**: `POST /api/students/reset-password`

**Description**: Reset password for authenticated student with old password verification. User ID is extracted from JWT token.

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Request Body**:
```json
{
  "old_password": "OldPassword123!",
  "new_password": "NewPassword123!"
}
```

**Response**:
```json
{
  "message": "Password updated successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "student@school.edu",
    "first_name": "Alice",
    "last_name": "Smith",
    "student_code": "springfieldhigh-1703123456789",
    "school_id": "507f1f77bcf86cd799439012",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses**:
- `404`: Student not found
- `400`: Invalid old password

## Password Requirements

All passwords must meet the following criteria:
- At least 8 characters long
- Contains at least one uppercase letter
- Contains at least one lowercase letter
- Contains at least one number
- Contains at least one special character (@$!%*?&)

## Security Features

1. **Token Expiration**: Reset tokens are valid for 24 hours (configurable via JWT_EXPIRY)
2. **Password Hashing**: All passwords are hashed using bcrypt with 12 salt rounds
3. **Role Validation**: Only school admins and professors can use these endpoints
4. **Account Status Check**: Inactive accounts cannot reset passwords
5. **Email Verification**: Reset links are sent to verified email addresses

## Email Templates

The system uses the existing `forgot-password-email.hbs` template to send password reset emails. The template includes:
- Personalized greeting with user's name
- Reset password button/link
- Security notice for unintended requests

## Configuration

The following environment variables are used:
- `BACKEND_URL`: Base URL for the backend application (defaults to http://localhost:3000)
- `JWT_SECRET`: Secret key for JWT token generation
- `JWT_EXPIRY`: Token expiration time (defaults to 24h)

## Usage Flow

### Forget Password Flow:
1. User requests password reset via `/auth/forgot-password`
2. System validates email and user status
3. System generates reset token and sends email with backend URL
4. User clicks link in email which opens `/static/reset-password?token=<token>`
5. User enters new password and confirmation on the static page
6. Static page submits to `/auth/set-new-password` API
7. Password is updated and user sees success message

### Reset Password Flow:
1. Authenticated user calls `/school-admin/reset-password/:id`
2. System validates old password
3. System updates password with new hashed password

## Error Handling

The system provides comprehensive error handling:
- Invalid email addresses
- Non-existent users
- Inactive accounts
- Invalid/expired tokens
- Weak passwords
- Database errors

## Testing

To test the password management functionality:

1. **Forget Password Test**:
   ```bash
   curl -X POST http://localhost:3000/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@school.edu"}'
   ```

2. **Reset Password Page Test**:
   ```bash
   # Open in browser
   http://localhost:3000/static/reset-password?token=your-token
   ```

3. **Set New Password API Test**:
   ```bash
   curl -X POST http://localhost:3000/auth/set-new-password \
     -H "Content-Type: application/json" \
     -d '{"token": "your-token", "new_password": "NewPassword123!"}'
   ```

4. **Reset Password Test (School Admin/Professor)**:
   ```bash
   curl -X POST http://localhost:5000/api/school-admin/reset-password \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-jwt-token" \
     -d '{"old_password": "OldPassword123!", "new_password": "NewPassword123!"}'
   ```

5. **Reset Password Test (Student)**:
   ```bash
   curl -X POST http://localhost:5000/api/students/reset-password \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-jwt-token" \
     -d '{"old_password": "OldPassword123!", "new_password": "NewPassword123!"}'
   ``` 