# Activity Logs - Quick Reference Guide

## 🚀 Quick Start
- **Base URL**: `/activity-logs`
- **Authentication**: JWT Bearer token required
- **Total APIs**: 4 endpoints

## 📋 API Endpoints Summary

| # | Endpoint | Method | Description | Permissions |
|---|----------|--------|-------------|-------------|
| 1 | `/activity-logs` | GET | List activity logs with filters & pagination | All roles |
| 2 | `/activity-logs/stats` | GET | Get activity statistics | Admin roles only |
| 3 | `/activity-logs/export` | GET | Export logs to CSV | Admin roles only |
| 4 | `/activity-logs/:id` | GET | Get specific log by ID | All roles |

## 🔐 Role Access Levels

| Role | Access Level | Can See |
|------|--------------|---------|
| **SUPER_ADMIN** | 🌍 Global | All logs across all schools |
| **SCHOOL_ADMIN** | 🏫 School | Logs for their school only |
| **PROFESSOR** | 👨‍🏫 Limited | School logs + their own activities |
| **STUDENT** | 👤 Personal | Only their own activity logs |

## 🎯 Key Features to Implement

### 1. **Main Table View** (`/activity-logs`)
- ✅ Pagination (page, limit)
- ✅ 15+ filter options
- ✅ Search functionality
- ✅ Role-based data filtering

### 2. **Statistics Dashboard** (`/activity-logs/stats`)
- ✅ Time period selector (default: 30 days)
- ✅ Category-based breakdown
- ✅ Success/Error counts
- ✅ Visual charts (bar, pie, line)

### 3. **Export Functionality** (`/activity-logs/export`)
- ✅ CSV download
- ✅ Apply current filters
- ✅ Progress indicator

### 4. **Detail View** (`/activity-logs/:id`)
- ✅ Full log information
- ✅ User details
- ✅ Technical metadata
- ✅ Access control

## 🔍 Essential Filter Parameters

```typescript
// Core Filters
activity_type: 'USER_LOGIN' | 'MODULE_CREATED' | 'QUIZ_ATTEMPTED' | ...
category: 'AUTHENTICATION' | 'USER_MANAGEMENT' | 'CONTENT_MANAGEMENT' | ...
level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
status: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO'

// Time Filters
start_date: 'YYYY-MM-DD'
end_date: 'YYYY-MM-DD'

// Entity Filters
school_id: string
target_user_id: string
module_id: string
chapter_id: string

// Search
search: string // Global search across multiple fields
```

## 📊 Data Structure Highlights

```typescript
interface ActivityLog {
  id: string;
  timestamp: string;
  activity_type: ActivityTypeEnum;
  category: ActivityCategoryEnum;
  level: ActivityLevelEnum;
  description: string;
  performed_by: UserInfo;
  school?: SchoolInfo;
  target_user?: UserInfo;
  module?: ModuleInfo;
  chapter?: ChapterInfo;
  is_success: boolean;
  status: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';
  // ... more fields
}
```

## 🎨 UI Components to Build

1. **Filter Panel**
   - Quick filters (Today, This Week, This Month)
   - Advanced filters (collapsible)
   - Filter chips with remove options

2. **Data Table**
   - Sortable columns
   - Status badges (color-coded)
   - User avatars/initials
   - Pagination controls

3. **Statistics Cards**
   - Activity counts by category
   - Success/Error ratios
   - Time period selector

4. **Export Controls**
   - Export button
   - Format selection
   - Progress indicator

## 🚨 Important Notes

- **Email Encryption**: Target user emails are encrypted in database
- **Performance**: Always use pagination (max 100 items per page)
- **Security**: Role-based access control is enforced server-side
- **Real-time**: Consider WebSocket integration for live updates
- **Mobile**: Ensure responsive design for all screen sizes

## 🧪 Testing Checklist

- [ ] Test all filter combinations
- [ ] Verify role-based access control
- [ ] Test pagination with different page sizes
- [ ] Verify CSV export functionality
- [ ] Test mobile responsiveness
- [ ] Test with large datasets
- [ ] Verify error handling

## 📚 Full Documentation

For complete implementation details, see: `ACTIVITY_LOGS_API_DOCUMENTATION.md`

---

**Ready to implement! 🚀** The Activity Logs module provides comprehensive activity tracking with robust filtering, role-based access control, and export capabilities.
