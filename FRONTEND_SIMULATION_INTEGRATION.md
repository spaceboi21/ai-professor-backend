# Student View Simulation - Frontend Integration Guide

## Overview

The backend has been updated to support a new **Student View Simulation** feature that allows Teachers and Administrators to access the platform exactly as a student experiences it. This document provides all the information needed to implement the frontend integration.

---

## Feature Summary

### Purpose
- Enable Teachers and School Administrators to test modules, review AI chat behavior, verify learning flows, preview quizzes, and validate content delivery
- All actions are in **READ-ONLY** mode - no real data updates
- Simulation activities are logged separately for audit purposes

### Who Can Use It
- **School Admin** (can simulate students in their school)
- **Professor** (can simulate students in their school)

---

## API Endpoints

**Base URL:** `/api/simulation`

### 1. Get Available Students for Simulation
```
GET /api/simulation/students
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 10) |
| search | string | No | Search by name, email, or student code |
| school_id | string | Yes (for Super Admin) | School ID to fetch students from |

**Response:**
```json
{
  "message": "Students available for simulation retrieved successfully",
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "email": "john.doe@school.edu",
      "first_name": "John",
      "last_name": "Doe",
      "student_code": "STU001",
      "profile_pic": "/uploads/profile.jpg",
      "year": 3,
      "status": "ACTIVE",
      "is_dummy_student": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### 2. Start Simulation
```
POST /api/simulation/start
```

**Request Body:**
```json
{
  "student_id": "507f1f77bcf86cd799439011",
  "simulation_mode": "READ_ONLY_IMPERSONATION",
  "purpose": "Testing module flow for quality assurance",
  "school_id": "507f1f77bcf86cd799439011" // Required only for SUPER_ADMIN
}
```

**Simulation Modes:**
| Mode | Description |
|------|-------------|
| `DUMMY_STUDENT` | Use for test/sample accounts |
| `READ_ONLY_IMPERSONATION` | View as a real student (read-only) |

**Response:**
```json
{
  "message": "Simulation started successfully",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "access_token_expires_in": 3600,
  "simulation_session_id": "507f1f77bcf86cd799439011",
  "simulation_mode": "READ_ONLY_IMPERSONATION",
  "simulated_student": {
    "id": "507f1f77bcf86cd799439011",
    "email": "john.doe@school.edu",
    "first_name": "John",
    "last_name": "Doe",
    "student_code": "STU001",
    "profile_pic": "/uploads/profile.jpg",
    "year": 3
  },
  "school": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Springfield University",
    "logo": "/uploads/logo.png"
  }
}
```

**Important:** After receiving this response, the frontend MUST:
1. Store the original tokens securely (for restoration after exiting simulation)
2. Replace the current tokens with the simulation tokens
3. Switch the UI to student view
4. Show the persistent "Exit Student View" button

---

### 3. Get Simulation Status
```
GET /api/simulation/status
```

**Response (In Simulation Mode):**
```json
{
  "message": "Currently in simulation mode",
  "is_simulation": true,
  "session": {
    "_id": "507f1f77bcf86cd799439011",
    "simulation_mode": "READ_ONLY_IMPERSONATION",
    "simulated_student_id": "507f1f77bcf86cd799439012",
    "simulated_student_name": "John Doe",
    "started_at": "2024-01-15T10:00:00.000Z",
    "original_user_role": "SCHOOL_ADMIN"
  }
}
```

**Response (Not in Simulation):**
```json
{
  "message": "Not in simulation mode",
  "is_simulation": false
}
```

---

### 4. End Simulation
```
POST /api/simulation/end
```

**Note:** This endpoint MUST be called with the **simulation token** (not the original token).

**Response:**
```json
{
  "message": "Simulation ended successfully",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "session_summary": {
    "_id": "507f1f77bcf86cd799439011",
    "original_user_id": "507f1f77bcf86cd799439011",
    "original_user_role": "SCHOOL_ADMIN",
    "original_user_email": "admin@school.edu",
    "simulated_student_id": "507f1f77bcf86cd799439011",
    "simulated_student_email": "student@school.edu",
    "simulated_student_name": "John Doe",
    "school_id": "507f1f77bcf86cd799439011",
    "school_name": "Springfield University",
    "simulation_mode": "READ_ONLY_IMPERSONATION",
    "status": "ENDED",
    "started_at": "2024-01-15T10:00:00.000Z",
    "ended_at": "2024-01-15T11:00:00.000Z",
    "duration_seconds": 3600,
    "modules_viewed": 5,
    "quizzes_viewed": 3,
    "ai_chats_opened": 2,
    "pages_visited": ["/", "/modules", "/modules/abc123"]
  }
}
```

**After receiving this response:**
1. Replace current tokens with the original user tokens from the response
2. Switch UI back to Teacher/Admin dashboard
3. Remove the "Exit Student View" button
4. Optionally show session summary

---

### 5. Get Simulation History
```
GET /api/simulation/history
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 10) |

**Response:**
```json
{
  "message": "Simulation history retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "original_user_id": "507f1f77bcf86cd799439011",
      "original_user_role": "SCHOOL_ADMIN",
      "original_user_email": "admin@school.edu",
      "simulated_student_id": "507f1f77bcf86cd799439011",
      "simulated_student_email": "student@school.edu",
      "simulated_student_name": "John Doe",
      "school_id": "507f1f77bcf86cd799439011",
      "school_name": "Springfield University",
      "simulation_mode": "READ_ONLY_IMPERSONATION",
      "status": "ENDED",
      "started_at": "2024-01-15T10:00:00.000Z",
      "ended_at": "2024-01-15T11:00:00.000Z",
      "duration_seconds": 3600,
      "modules_viewed": 5,
      "quizzes_viewed": 3,
      "ai_chats_opened": 2,
      "pages_visited": ["/", "/modules", "/modules/abc123"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Frontend Implementation Checklist

### 1. "View as Student" Button
- [ ] Add button to Teacher Dashboard
- [ ] Add button to Administrator Dashboard
- [ ] Only show for users with roles: `SUPER_ADMIN`, `SCHOOL_ADMIN`, `PROFESSOR`

### 2. Student Selection Modal/Page
- [ ] Implement student search functionality
- [ ] Support pagination for student list
- [ ] Show student profile pictures, names, and codes
- [ ] Indicate dummy/test students vs real students
- [ ] Allow selection of simulation mode:
  - `DUMMY_STUDENT` for test accounts
  - `READ_ONLY_IMPERSONATION` for real student view
- [ ] Optional purpose/reason field for audit

### 3. Token Management
- [ ] Before starting simulation, store original tokens securely:
  ```javascript
  // Store original tokens
  localStorage.setItem('original_access_token', currentAccessToken);
  localStorage.setItem('original_refresh_token', currentRefreshToken);
  
  // Switch to simulation tokens
  localStorage.setItem('access_token', response.access_token);
  localStorage.setItem('refresh_token', response.refresh_token);
  ```
- [ ] Track simulation session ID
- [ ] On exit, restore original tokens from response (more secure than localStorage)

### 4. Simulation Mode UI
- [ ] Persistent "Exit Student View" banner/button visible at all times
- [ ] Visual indicator that user is in simulation mode (e.g., colored banner, badge)
- [ ] Show simulated student's name and profile
- [ ] Show original user role (e.g., "Viewing as Admin")
- [ ] Switch entire UI layout to match student interface

### 5. Read-Only Behavior
The backend enforces read-only mode, but frontend should also:
- [ ] Disable or hide submit buttons for quizzes
- [ ] Disable save/update buttons for assignments
- [ ] Show "Read-Only" indicators on forms
- [ ] Handle 403 errors gracefully with message:
  - English: "You are in read-only simulation mode. Write operations are not allowed."
  - French: "Vous êtes en mode simulation en lecture seule. Les opérations d'écriture ne sont pas autorisées."

### 6. AI Chat Simulation
- [ ] AI chat should work normally (responses are live)
- [ ] Chat logs are recorded separately as simulation sessions
- [ ] No impact on actual student performance reports

### 7. Check Simulation Status on App Load
- [ ] Call `GET /api/simulation/status` on app initialization
- [ ] If `is_simulation: true`, restore simulation UI state
- [ ] Show the "Exit Student View" button

### 8. Error Handling
| Status | Message |
|--------|---------|
| 400 | Already in simulation mode / Missing required fields |
| 403 | Only Teachers and Admins can start simulation |
| 403 | Write operation blocked in simulation mode |
| 404 | Student or school not found |

---

## JWT Token Payload in Simulation Mode

When in simulation mode, the JWT token contains additional fields:

```json
{
  "id": "student_id",
  "email": "student@school.edu",
  "role_id": "STUDENT_ROLE_ID",
  "role_name": "STUDENT",
  "school_id": "school_id",
  "is_simulation": true,
  "simulation_session_id": "session_id",
  "original_user_id": "teacher_or_admin_id",
  "original_user_role": "SCHOOL_ADMIN"
}
```

The frontend can decode the token to check `is_simulation` flag for UI decisions.

---

## User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   Teacher/Admin Dashboard                       │
│                                                                 │
│   ┌─────────────────────────────────┐                          │
│   │      "View as Student" Button   │                          │
│   └─────────────────────────────────┘                          │
│                       │                                         │
│                       ▼                                         │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │           Select Student Modal                           │  │
│   │  ┌─────────────────────────────────────────────────┐   │  │
│   │  │  Search: [________________]                      │   │  │
│   │  │                                                  │   │  │
│   │  │  ○ John Doe (STU001) - Year 3                   │   │  │
│   │  │  ○ Jane Smith (STU002) - Year 2                 │   │  │
│   │  │  ○ Test Student (TEST001) - Dummy               │   │  │
│   │  │                                                  │   │  │
│   │  │  Mode: [READ_ONLY_IMPERSONATION ▼]              │   │  │
│   │  │  Purpose: [Testing module flow______]           │   │  │
│   │  │                                                  │   │  │
│   │  │  [Cancel]              [Start Simulation]       │   │  │
│   │  └─────────────────────────────────────────────────┘   │  │
│   └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     STUDENT VIEW (SIMULATION)                   │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 🔴 SIMULATION MODE │ Viewing as: John Doe │ [Exit View]   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Student Dashboard                       │   │
│  │   (Full student interface - but READ-ONLY)               │   │
│  │                                                          │   │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐                 │   │
│  │   │ Modules │  │ Quizzes │  │ AI Chat │                 │   │
│  │   └─────────┘  └─────────┘  └─────────┘                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Note: All write operations will be blocked with 403 error     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Click "Exit View"
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Session Summary Modal (Optional)              │
│                                                                 │
│   Simulation Summary:                                           │
│   - Duration: 45 minutes                                        │
│   - Modules viewed: 5                                           │
│   - Quizzes viewed: 3                                           │
│   - AI chats opened: 2                                          │
│                                                                 │
│   [Close]                                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Teacher/Admin Dashboard                       │
│              (Restored with original tokens)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## State Management Suggestions

### React Context Example
```javascript
const SimulationContext = createContext();

const SimulationProvider = ({ children }) => {
  const [isSimulation, setIsSimulation] = useState(false);
  const [simulationData, setSimulationData] = useState(null);
  const [originalTokens, setOriginalTokens] = useState(null);

  const startSimulation = async (studentId, mode, purpose, schoolId) => {
    // Store original tokens
    const currentTokens = {
      access: localStorage.getItem('access_token'),
      refresh: localStorage.getItem('refresh_token'),
    };
    setOriginalTokens(currentTokens);

    // Call API
    const response = await api.post('/simulation/start', {
      student_id: studentId,
      simulation_mode: mode,
      purpose,
      school_id: schoolId,
    });

    // Switch tokens
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);

    // Update state
    setIsSimulation(true);
    setSimulationData(response);
  };

  const endSimulation = async () => {
    const response = await api.post('/simulation/end');

    // Restore original tokens from response
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);

    // Reset state
    setIsSimulation(false);
    setSimulationData(null);
    setOriginalTokens(null);

    return response.session_summary;
  };

  const checkSimulationStatus = async () => {
    const response = await api.get('/simulation/status');
    setIsSimulation(response.is_simulation);
    if (response.is_simulation) {
      setSimulationData(response.session);
    }
  };

  return (
    <SimulationContext.Provider
      value={{
        isSimulation,
        simulationData,
        startSimulation,
        endSimulation,
        checkSimulationStatus,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};
```

---

## Additional Notes

1. **Security:** The simulation tokens are separate from the original user's tokens. The backend validates simulation permissions and enforces read-only mode.

2. **Audit Trail:** All simulation activities are logged in the `activity_logs` collection with activity types:
   - `SIMULATION_STARTED`
   - `SIMULATION_ENDED`
   - `SIMULATION_WRITE_BLOCKED`

3. **Session Tracking:** The simulation session tracks:
   - Pages visited
   - Modules viewed
   - Quizzes viewed
   - AI chats opened
   - Duration

4. **Token Expiry:** Simulation tokens have the same expiry as regular tokens. If the token expires, the user will need to re-authenticate as their original role.

5. **Multiple Frontends:** This feature is primarily for the School Admin and Student interfaces. The simulation mode should seamlessly switch between the admin interface and the student interface.

---

## Questions or Issues?

If you encounter any issues or need clarification, please check:
1. The Swagger documentation at `/api/docs`
2. The backend logs for detailed error messages
3. The simulation session history for debugging


