# Frontend Integration Guide: Enrollment Management System

## Overview

This document provides comprehensive instructions for integrating the **Enrollment Management System** into both the **Admin/School Admin Frontend** and the **Student Frontend**.

---

## 🎯 Feature Summary

The Enrollment Management System allows administrators to:
1. **Enroll students in individual modules** - Manual module assignment
2. **Enroll students in academic years** - Assign all modules for a year (1-5)
3. **Bulk enroll multiple students** - Mass enrollment operations
4. **Withdraw enrollments** - Remove students from modules
5. **View enrollment status** - See student's current enrollments
6. **View enrollment history** - Audit trail of all enrollments
7. **Get available students/modules** - For selection UIs

---

## 📡 API Endpoints

### Base URL: `/api/enrollment`

### 1. Enroll Student in Modules

```http
POST /api/enrollment/enroll-modules
Authorization: Bearer <token>
Content-Type: application/json

{
  "student_id": "507f1f77bcf86cd799439011",
  "module_ids": ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
  "school_id": "507f1f77bcf86cd799439014",  // Required for SUPER_ADMIN
  "notes": "Optional enrollment notes",
  "send_email_notification": true,
  "send_app_notification": true
}
```

**Response:**
```json
{
  "message": "Student enrolled successfully",
  "total_requested": 2,
  "successful": 2,
  "failed": 0,
  "skipped": 0,
  "batch_id": "uuid-batch-id",
  "results": [
    {
      "student_id": "...",
      "student_name": "John Doe",
      "module_id": "...",
      "module_title": "Module 1",
      "success": true,
      "enrollment_id": "..."
    }
  ]
}
```

### 2. Enroll Student in Academic Year

```http
POST /api/enrollment/enroll-academic-year
Authorization: Bearer <token>
Content-Type: application/json

{
  "student_id": "507f1f77bcf86cd799439011",
  "academic_year": 1,  // 1-5
  "school_id": "507f1f77bcf86cd799439014",  // Required for SUPER_ADMIN
  "notes": "Year 1 cohort enrollment",
  "send_email_notification": true,
  "send_app_notification": true
}
```

### 3. Bulk Enroll Students

```http
POST /api/enrollment/bulk-enroll
Authorization: Bearer <token>
Content-Type: application/json

{
  "enrollments": [
    {
      "student_id": "...",
      "module_ids": ["module1", "module2"]
    },
    {
      "student_id": "...",
      "academic_year": 2
    }
  ],
  "school_id": "...",  // Required for SUPER_ADMIN
  "notes": "Semester enrollment batch",
  "send_email_notification": true,
  "send_app_notification": true
}
```

### 4. Withdraw Enrollment

```http
POST /api/enrollment/withdraw
Authorization: Bearer <token>
Content-Type: application/json

{
  "enrollment_id": "507f1f77bcf86cd799439011",
  "reason": "Student transferred to different cohort",
  "school_id": "..."  // Required for SUPER_ADMIN
}
```

### 5. Get Student Enrollment Status

```http
GET /api/enrollment/status?student_id=507f1f77bcf86cd799439011&school_id=...
Authorization: Bearer <token>
```

**Response:**
```json
{
  "student_id": "...",
  "student_name": "John Doe",
  "student_email": "john@example.com",
  "student_year": 1,
  "total_enrolled": 5,
  "active_enrollments": 4,
  "completed_modules": 1,
  "modules_by_year": {
    "1": 3,
    "2": 2
  },
  "enrollments": [
    {
      "id": "...",
      "module_id": "...",
      "module_title": "Module Title",
      "enrollment_type": "INDIVIDUAL",
      "status": "ACTIVE",
      "enrolled_by_name": "Admin Name",
      "enrolled_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 6. Get Enrollment History

```http
GET /api/enrollment/history?page=1&limit=20&student_id=...&module_id=...&enrollment_type=INDIVIDUAL&academic_year=1&start_date=2024-01-01&end_date=2024-12-31&school_id=...
Authorization: Bearer <token>
```

### 7. Get Available Students

```http
GET /api/enrollment/students?search=john&module_id=...&page=1&limit=20&school_id=...
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Available students retrieved successfully",
  "data": [
    {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "year": 1,
      "enrolled_modules_count": 3,
      "is_enrolled_in_module": false
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

### 8. Get Available Modules

```http
GET /api/enrollment/modules?student_id=...&year=1&page=1&limit=20&school_id=...
Authorization: Bearer <token>
```

### 9. Get Module Enrollment Summary

```http
GET /api/enrollment/summary?school_id=...
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Module enrollment summary retrieved successfully",
  "data": [
    {
      "module_id": "...",
      "module_title": "Introduction to Psychology",
      "module_year": 1,
      "total_enrolled": 45,
      "active": 40,
      "completed": 3,
      "withdrawn": 2
    }
  ]
}
```

---

## 🎨 Admin Frontend Implementation

### Where to Add: Admin Dashboard

Add a new tab/section called **"Manual Enrollment"** under **Student/Academic Management**.

### Required Components

#### 1. Manual Enrollment Tab (`ManualEnrollmentTab.tsx`)

```typescript
import React, { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';

interface Student {
  id: string;
  name: string;
  email: string;
  year: number;
  enrolled_modules_count: number;
  is_enrolled_in_module: boolean;
}

interface Module {
  id: string;
  title: string;
  subject: string;
  year: number;
  published: boolean;
  enrolled_count: number;
}

interface EnrollmentResult {
  student_id: string;
  student_name: string;
  module_id: string;
  module_title: string;
  success: boolean;
  enrollment_id?: string;
  error?: string;
  was_duplicate?: boolean;
}

export function ManualEnrollmentTab() {
  const [students, setStudents] = useState<Student[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [enrollmentType, setEnrollmentType] = useState<'individual' | 'academic_year'>('individual');
  const [academicYear, setAcademicYear] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<EnrollmentResult[]>([]);
  
  const api = useApi();

  // Fetch available students with search
  useEffect(() => {
    const fetchStudents = async () => {
      const response = await api.get('/enrollment/students', {
        params: { search: searchQuery, page: 1, limit: 50 }
      });
      setStudents(response.data.data);
    };
    
    const debounce = setTimeout(fetchStudents, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Fetch available modules
  useEffect(() => {
    const fetchModules = async () => {
      const response = await api.get('/enrollment/modules', {
        params: { year: enrollmentType === 'academic_year' ? academicYear : undefined }
      });
      setModules(response.data.data);
    };
    fetchModules();
  }, [enrollmentType, academicYear]);

  const handleEnroll = async () => {
    if (!selectedStudent) return;
    
    setIsLoading(true);
    try {
      let response;
      
      if (enrollmentType === 'individual') {
        response = await api.post('/enrollment/enroll-modules', {
          student_id: selectedStudent.id,
          module_ids: selectedModules,
          send_email_notification: true,
          send_app_notification: true
        });
      } else {
        response = await api.post('/enrollment/enroll-academic-year', {
          student_id: selectedStudent.id,
          academic_year: academicYear,
          send_email_notification: true,
          send_app_notification: true
        });
      }
      
      setResults(response.data.results);
      // Show success notification
      toast.success(`Enrolled successfully: ${response.data.successful} modules`);
    } catch (error) {
      toast.error('Enrollment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Manual Enrollment</h2>
      
      {/* Enrollment Type Toggle */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Enrollment Type</label>
        <div className="flex gap-4">
          <button
            onClick={() => setEnrollmentType('individual')}
            className={`px-4 py-2 rounded ${
              enrollmentType === 'individual' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100'
            }`}
          >
            Individual Modules
          </button>
          <button
            onClick={() => setEnrollmentType('academic_year')}
            className={`px-4 py-2 rounded ${
              enrollmentType === 'academic_year' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100'
            }`}
          >
            Academic Year / Cohort
          </button>
        </div>
      </div>

      {/* Student Search */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Search Student</label>
        <input
          type="text"
          placeholder="Search by name, email, or student code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-3 border rounded-lg"
        />
        
        {/* Student List */}
        <div className="mt-4 max-h-60 overflow-y-auto border rounded-lg">
          {students.map((student) => (
            <div
              key={student.id}
              onClick={() => setSelectedStudent(student)}
              className={`p-3 cursor-pointer hover:bg-gray-50 border-b ${
                selectedStudent?.id === student.id ? 'bg-primary/10' : ''
              }`}
            >
              <div className="font-medium">{student.name}</div>
              <div className="text-sm text-gray-500">
                {student.email} • Year {student.year} • {student.enrolled_modules_count} modules enrolled
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Module Selection (Individual) */}
      {enrollmentType === 'individual' && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Modules</label>
          <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto border rounded-lg p-3">
            {modules.map((module) => (
              <label
                key={module.id}
                className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                  selectedModules.includes(module.id) ? 'bg-primary/10' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedModules.includes(module.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedModules([...selectedModules, module.id]);
                    } else {
                      setSelectedModules(selectedModules.filter(id => id !== module.id));
                    }
                  }}
                />
                <div>
                  <div className="font-medium">{module.title}</div>
                  <div className="text-xs text-gray-500">
                    Year {module.year} • {module.enrolled_count} enrolled
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Academic Year Selection */}
      {enrollmentType === 'academic_year' && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Academic Year</label>
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(Number(e.target.value))}
            className="w-full p-3 border rounded-lg"
          >
            {[1, 2, 3, 4, 5].map((year) => (
              <option key={year} value={year}>Year {year}</option>
            ))}
          </select>
          <p className="text-sm text-gray-500 mt-2">
            This will enroll the student in all published modules for Year {academicYear}.
            Already completed or enrolled modules will be skipped.
          </p>
        </div>
      )}

      {/* Enroll Button */}
      <button
        onClick={handleEnroll}
        disabled={!selectedStudent || isLoading || (enrollmentType === 'individual' && selectedModules.length === 0)}
        className="w-full py-3 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
      >
        {isLoading ? 'Enrolling...' : 'Enroll Student'}
      </button>

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-6 border rounded-lg p-4">
          <h3 className="font-medium mb-3">Enrollment Results</h3>
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-2 rounded mb-2 ${
                result.success ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              <div className="flex justify-between">
                <span>{result.module_title}</span>
                <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                  {result.success ? (result.was_duplicate ? 'Already Enrolled' : 'Success') : 'Failed'}
                </span>
              </div>
              {result.error && (
                <div className="text-xs text-red-600">{result.error}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### 2. Enrollment History Component (`EnrollmentHistory.tsx`)

```typescript
import React, { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { DataTable } from '@/components/ui/DataTable';
import { format } from 'date-fns';

interface EnrollmentHistoryItem {
  id: string;
  student_name: string;
  student_email: string;
  module_title: string;
  enrollment_type: 'INDIVIDUAL' | 'ACADEMIC_YEAR' | 'BULK';
  status: 'ACTIVE' | 'COMPLETED' | 'WITHDRAWN';
  enrolled_by_name: string;
  enrolled_at: string;
  academic_year?: number;
  batch_id?: string;
}

export function EnrollmentHistory() {
  const [history, setHistory] = useState<EnrollmentHistoryItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 0 });
  const [filters, setFilters] = useState({
    enrollment_type: '',
    academic_year: '',
    start_date: '',
    end_date: ''
  });
  
  const api = useApi();

  useEffect(() => {
    fetchHistory();
  }, [pagination.page, filters]);

  const fetchHistory = async () => {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...filters
    };
    
    // Remove empty values
    Object.keys(params).forEach(key => {
      if (!params[key]) delete params[key];
    });
    
    const response = await api.get('/enrollment/history', { params });
    setHistory(response.data.data);
    setPagination({
      ...pagination,
      total: response.data.total,
      total_pages: response.data.total_pages
    });
  };

  const columns = [
    { key: 'student_name', header: 'Student' },
    { key: 'module_title', header: 'Module' },
    { 
      key: 'enrollment_type', 
      header: 'Type',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded text-xs ${
          value === 'INDIVIDUAL' ? 'bg-blue-100 text-blue-700' :
          value === 'ACADEMIC_YEAR' ? 'bg-purple-100 text-purple-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {value.replace('_', ' ')}
        </span>
      )
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded text-xs ${
          value === 'ACTIVE' ? 'bg-green-100 text-green-700' :
          value === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
          'bg-red-100 text-red-700'
        }`}>
          {value}
        </span>
      )
    },
    { key: 'enrolled_by_name', header: 'Enrolled By' },
    { 
      key: 'enrolled_at', 
      header: 'Date',
      render: (value: string) => format(new Date(value), 'MMM dd, yyyy HH:mm')
    }
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Enrollment History</h2>
      
      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={filters.enrollment_type}
          onChange={(e) => setFilters({ ...filters, enrollment_type: e.target.value })}
          className="p-2 border rounded"
        >
          <option value="">All Types</option>
          <option value="INDIVIDUAL">Individual</option>
          <option value="ACADEMIC_YEAR">Academic Year</option>
          <option value="BULK">Bulk</option>
        </select>
        
        <select
          value={filters.academic_year}
          onChange={(e) => setFilters({ ...filters, academic_year: e.target.value })}
          className="p-2 border rounded"
        >
          <option value="">All Years</option>
          {[1, 2, 3, 4, 5].map(year => (
            <option key={year} value={year}>Year {year}</option>
          ))}
        </select>
        
        <input
          type="date"
          value={filters.start_date}
          onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
          className="p-2 border rounded"
          placeholder="Start Date"
        />
        
        <input
          type="date"
          value={filters.end_date}
          onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
          className="p-2 border rounded"
          placeholder="End Date"
        />
      </div>

      <DataTable
        data={history}
        columns={columns}
        pagination={pagination}
        onPageChange={(page) => setPagination({ ...pagination, page })}
      />
    </div>
  );
}
```

#### 3. Student Enrollment Status Component (`StudentEnrollmentStatus.tsx`)

```typescript
import React, { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';

interface EnrollmentStatus {
  student_id: string;
  student_name: string;
  student_email: string;
  student_year: number;
  total_enrolled: number;
  active_enrollments: number;
  completed_modules: number;
  modules_by_year: Record<number, number>;
  enrollments: Array<{
    id: string;
    module_id: string;
    module_title: string;
    enrollment_type: string;
    status: string;
    enrolled_by_name: string;
    enrolled_at: string;
  }>;
}

interface Props {
  studentId: string;
}

export function StudentEnrollmentStatus({ studentId }: Props) {
  const [status, setStatus] = useState<EnrollmentStatus | null>(null);
  const api = useApi();

  useEffect(() => {
    const fetchStatus = async () => {
      const response = await api.get('/enrollment/status', {
        params: { student_id: studentId }
      });
      setStatus(response.data);
    };
    
    if (studentId) {
      fetchStatus();
    }
  }, [studentId]);

  if (!status) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold">{status.student_name}</h2>
          <p className="text-gray-500">{status.student_email}</p>
        </div>
        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full">
          Year {status.student_year}
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-3xl font-bold text-primary">{status.total_enrolled}</div>
          <div className="text-sm text-gray-500">Total Enrolled</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-3xl font-bold text-green-600">{status.active_enrollments}</div>
          <div className="text-sm text-gray-500">Active</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-3xl font-bold text-blue-600">{status.completed_modules}</div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-500 mb-2">By Year</div>
          {Object.entries(status.modules_by_year).map(([year, count]) => (
            <div key={year} className="text-sm">
              Year {year}: <span className="font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Enrollment List */}
      <h3 className="font-medium mb-3">Enrolled Modules</h3>
      <div className="space-y-2">
        {status.enrollments.map((enrollment) => (
          <div
            key={enrollment.id}
            className="flex justify-between items-center p-3 bg-white border rounded-lg"
          >
            <div>
              <div className="font-medium">{enrollment.module_title}</div>
              <div className="text-xs text-gray-500">
                Enrolled by {enrollment.enrolled_by_name} on{' '}
                {new Date(enrollment.enrolled_at).toLocaleDateString()}
              </div>
            </div>
            <span className={`px-2 py-1 rounded text-xs ${
              enrollment.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
              enrollment.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
              'bg-red-100 text-red-700'
            }`}>
              {enrollment.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 📱 Student Frontend Implementation

### Real-Time Dashboard Updates

When a student receives a new enrollment:
1. They get an **in-app notification** (if enabled)
2. They get an **email notification** (if enabled)
3. Their dashboard should show the new module

### Notification Handling

```typescript
// In your notification listener/handler
const handleNotification = (notification) => {
  if (notification.type === 'MODULE_ENROLLMENT' || 
      notification.type === 'ACADEMIC_YEAR_ENROLLMENT') {
    // Refresh the student's module list
    refetchModules();
    
    // Show toast notification
    toast.success(notification.title);
  }
};
```

### Module List Update

Ensure that when a student views their dashboard:
1. Modules appear **instantly** after enrollment
2. Status shows as **"Not Started"** for new enrollments
3. Learning path updates to include new modules

---

## 🔄 State Management

### Using React Query (Recommended)

```typescript
// hooks/useEnrollment.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export function useAvailableStudents(params: { search?: string; moduleId?: string }) {
  return useQuery({
    queryKey: ['enrollment-students', params],
    queryFn: () => api.get('/enrollment/students', { params }).then(r => r.data),
  });
}

export function useAvailableModules(params: { year?: number }) {
  return useQuery({
    queryKey: ['enrollment-modules', params],
    queryFn: () => api.get('/enrollment/modules', { params }).then(r => r.data),
  });
}

export function useEnrollStudentInModules() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: EnrollStudentModulesDto) => 
      api.post('/enrollment/enroll-modules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment-students'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-history'] });
    },
  });
}

export function useEnrollStudentInAcademicYear() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: EnrollStudentAcademicYearDto) => 
      api.post('/enrollment/enroll-academic-year', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment-students'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-history'] });
    },
  });
}

export function useWithdrawEnrollment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: WithdrawEnrollmentDto) => 
      api.post('/enrollment/withdraw', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment-history'] });
    },
  });
}

export function useEnrollmentHistory(params: GetEnrollmentHistoryDto) {
  return useQuery({
    queryKey: ['enrollment-history', params],
    queryFn: () => api.get('/enrollment/history', { params }).then(r => r.data),
  });
}

export function useStudentEnrollmentStatus(studentId: string) {
  return useQuery({
    queryKey: ['enrollment-status', studentId],
    queryFn: () => api.get('/enrollment/status', { params: { student_id: studentId } }).then(r => r.data),
    enabled: !!studentId,
  });
}
```

---

## 🛡️ Role-Based Access

### Allowed Roles for Enrollment

| Endpoint | SUPER_ADMIN | SCHOOL_ADMIN | PROFESSOR |
|----------|-------------|--------------|-----------|
| POST /enroll-modules | ✅ | ✅ | ✅ |
| POST /enroll-academic-year | ✅ | ✅ | ✅ |
| POST /bulk-enroll | ✅ | ✅ | ❌ |
| POST /withdraw | ✅ | ✅ | ✅ |
| GET /status | ✅ | ✅ | ✅ |
| GET /history | ✅ | ✅ | ✅ |
| GET /students | ✅ | ✅ | ✅ |
| GET /modules | ✅ | ✅ | ✅ |
| GET /summary | ✅ | ✅ | ✅ |

### SUPER_ADMIN Note

Super admins must always provide `school_id` in their requests since they manage multiple schools.

---

## ✅ Testing Checklist

### Admin Frontend

- [ ] Manual Enrollment tab is accessible
- [ ] Student search works with name, email, student code
- [ ] Can select individual modules for enrollment
- [ ] Can select academic year for bulk enrollment
- [ ] Enrollment confirmation shows success/failure for each module
- [ ] Duplicate enrollments show "Already Enrolled" message
- [ ] Enrollment history table displays correctly
- [ ] Filters work (type, year, date range)
- [ ] Pagination works
- [ ] Can view student enrollment status

### Student Frontend

- [ ] Newly enrolled modules appear immediately
- [ ] In-app notifications work for new enrollments
- [ ] Module status shows "Not Started"
- [ ] Learning path updates correctly

---

## 📞 Support

If you encounter any issues with the API or need clarification, please refer to the API documentation at `/api/docs` (Swagger UI) or contact the backend team.

