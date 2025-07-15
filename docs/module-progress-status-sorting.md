# Module Progress Status Sorting

This document explains how to use the progress status sorting feature for modules, which allows students to sort modules based on their progress status.

## Overview

The progress status sorting feature enables students to sort modules based on their learning progress:
- **NOT_STARTED**: Student hasn't started the module yet (no entry in `student_module_progress` table)
- **IN_PROGRESS**: Student has started but not completed the module
- **COMPLETED**: Student has completed the module

## Sorting Behavior

### ASC (Ascending) Order
When `sortOrder=asc` is used with `sortBy=progress_status`:
1. **IN_PROGRESS** modules (highest priority)
2. **NOT_STARTED** modules (middle priority)  
3. **COMPLETED** modules (lowest priority)

### DESC (Descending) Order
When `sortOrder=desc` is used with `sortBy=progress_status`:
1. **COMPLETED** modules (highest priority)
2. **NOT_STARTED** modules (middle priority)
3. **IN_PROGRESS** modules (lowest priority)

## API Usage

### Endpoint
```
GET /api/modules
```

### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `sortBy` | string | No | Field to sort by. For progress sorting use `progress_status` | `progress_status` |
| `sortOrder` | string | No | Sort order: `asc` or `desc` | `asc` |
| `page` | number | No | Page number (default: 1) | `1` |
| `limit` | number | No | Items per page (default: 10, max: 100) | `10` |

### Example Requests

#### Sort by Progress Status (ASC) - Show In Progress First
```bash
curl -X GET "http://localhost:3000/api/modules?sortBy=progress_status&sortOrder=asc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Sort by Progress Status (DESC) - Show Completed First  
```bash
curl -X GET "http://localhost:3000/api/modules?sortBy=progress_status&sortOrder=desc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Combined with Pagination
```bash
curl -X GET "http://localhost:3000/api/modules?sortBy=progress_status&sortOrder=asc&page=1&limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Response Format

### For Students
When a student requests modules, each module includes progress information:

```json
{
  "message": "Modules retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Child Psychology Basics",
      "subject": "Psychology",
      "description": "Introduction to child psychology",
      "category": "Psychology",
      "duration": 480,
      "difficulty": "BEGINNER",
      "tags": ["psychology", "child-development"],
      "thumbnail": "/uploads/modules/child-psychology.jpg",
      "published": true,
      "published_at": "2024-01-15T10:00:00.000Z",
      "created_by": "507f1f77bcf86cd799439022",
      "created_by_role": "PROFESSOR",
      "created_at": "2024-01-10T08:00:00.000Z",
      "updated_at": "2024-01-15T10:00:00.000Z",
      "progress": {
        "_id": "507f1f77bcf86cd799439033",
        "student_id": "507f1f77bcf86cd799439044",
        "module_id": "507f1f77bcf86cd799439011",
        "status": "IN_PROGRESS",
        "started_at": "2024-01-20T09:00:00.000Z",
        "completed_at": null,
        "progress_percentage": 45,
        "chapters_completed": 3,
        "total_chapters": 8,
        "module_quiz_completed": false,
        "last_accessed_at": "2024-01-25T14:30:00.000Z",
        "created_at": "2024-01-20T09:00:00.000Z",
        "updated_at": "2024-01-25T14:30:00.000Z"
      }
    }
  ],
  "pagination_data": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "total_pages": 3,
    "has_next_page": true,
    "has_prev_page": false
  }
}
```

### Progress Status Values

| Status | Description |
|--------|-------------|
| `NOT_STARTED` | No progress record exists or status is explicitly set to NOT_STARTED |
| `IN_PROGRESS` | Module has been started but not completed |
| `COMPLETED` | Module has been fully completed |

### For Non-Students
Non-student users (admins, professors) do not receive progress information and cannot sort by progress status. If they attempt to sort by progress status, the system falls back to sorting by `created_at` in descending order.

## Access Control

- **Students**: Can sort by progress status and receive progress information in responses
- **School Admins**: Cannot sort by progress status (fallback to default sorting)
- **Professors**: Cannot sort by progress status (fallback to default sorting)  
- **Super Admins**: Cannot sort by progress status (fallback to default sorting)

## Database Structure

The progress status sorting relies on the `student_module_progress` collection:

```javascript
{
  _id: ObjectId,
  student_id: ObjectId, // Reference to student
  module_id: ObjectId,  // Reference to module
  status: String,       // NOT_STARTED | IN_PROGRESS | COMPLETED
  started_at: Date,
  completed_at: Date,
  progress_percentage: Number, // 0-100
  chapters_completed: Number,
  total_chapters: Number,
  module_quiz_completed: Boolean,
  last_accessed_at: Date,
  created_at: Date,
  updated_at: Date
}
```

## Frontend Integration

### React/JavaScript Example

```javascript
// State for sorting
const [sortBy, setSortBy] = useState('created_at');
const [sortOrder, setSortOrder] = useState('desc');

// Function to fetch modules with progress sorting
const fetchModulesWithProgressSort = async () => {
  try {
    const params = new URLSearchParams({
      sortBy: 'progress_status',
      sortOrder: 'asc', // Show in-progress first
      page: '1',
      limit: '10'
    });
    
    const response = await fetch(`/api/modules?${params}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    setModules(data.data);
    setPagination(data.pagination_data);
  } catch (error) {
    console.error('Error fetching modules:', error);
  }
};

// Component for sorting dropdown
const ModuleSortDropdown = () => {
  return (
    <select 
      value={`${sortBy}-${sortOrder}`}
      onChange={(e) => {
        const [field, order] = e.target.value.split('-');
        setSortBy(field);
        setSortOrder(order);
      }}
    >
      <option value="created_at-desc">Newest First</option>
      <option value="title-asc">Title A-Z</option>
      <option value="difficulty-asc">Difficulty (Easy First)</option>
      <option value="progress_status-asc">Progress (In Progress First)</option>
      <option value="progress_status-desc">Progress (Completed First)</option>
    </select>
  );
};
```

### Display Progress Status

```javascript
const getProgressStatusDisplay = (progress) => {
  if (!progress) return { text: 'Not Started', color: 'gray' };
  
  switch (progress.status) {
    case 'NOT_STARTED':
      return { text: 'Not Started', color: 'gray' };
    case 'IN_PROGRESS':
      return { 
        text: `In Progress (${progress.progress_percentage}%)`, 
        color: 'blue' 
      };
    case 'COMPLETED':
      return { text: 'Completed', color: 'green' };
    default:
      return { text: 'Unknown', color: 'gray' };
  }
};

// Usage in component
const ModuleCard = ({ module }) => {
  const progressDisplay = getProgressStatusDisplay(module.progress);
  
  return (
    <div className="module-card">
      <h3>{module.title}</h3>
      <div className={`progress-badge ${progressDisplay.color}`}>
        {progressDisplay.text}
      </div>
      {module.progress && module.progress.status === 'IN_PROGRESS' && (
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${module.progress.progress_percentage}%` }}
          />
        </div>
      )}
    </div>
  );
};
```

## Performance Considerations

1. **Database Indexes**: The system includes optimized indexes on:
   - `student_module_progress.student_id`
   - `student_module_progress.module_id` 
   - `student_module_progress.status`

2. **Aggregation Pipeline**: Uses MongoDB aggregation with `$lookup` for efficient joining

3. **Fallback Behavior**: Non-students get simpler queries without progress lookup

## Error Handling

The system handles various edge cases:

- **Invalid Sort Field**: Falls back to default sorting by `created_at`
- **Non-Student Access**: Ignores progress sorting and uses default behavior
- **Missing Progress Records**: Treats as `NOT_STARTED` status
- **Database Errors**: Returns appropriate error responses

## Testing

### Manual Testing

1. **Create Test Data**: Ensure you have modules and student progress records
2. **Test ASC Sorting**: Verify IN_PROGRESS modules appear first
3. **Test DESC Sorting**: Verify COMPLETED modules appear first  
4. **Test Non-Student Access**: Ensure other user types can't sort by progress
5. **Test Pagination**: Verify sorting works across multiple pages

### Example Test Cases

```bash
# Test 1: ASC sorting for student
curl -X GET "http://localhost:3000/api/modules?sortBy=progress_status&sortOrder=asc" \
  -H "Authorization: Bearer STUDENT_TOKEN"

# Test 2: DESC sorting for student  
curl -X GET "http://localhost:3000/api/modules?sortBy=progress_status&sortOrder=desc" \
  -H "Authorization: Bearer STUDENT_TOKEN"

# Test 3: Progress sorting for admin (should fallback)
curl -X GET "http://localhost:3000/api/modules?sortBy=progress_status&sortOrder=asc" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## Troubleshooting

### Common Issues

1. **Progress not showing**: Check if user is a student and has valid progress records
2. **Sorting not working**: Verify `sortBy=progress_status` parameter is correctly sent
3. **Wrong order**: Confirm understanding of ASC vs DESC behavior for progress status
4. **Performance issues**: Check database indexes are properly created

### Debug Information

Enable debug logging to see aggregation pipeline:
```bash
# Set environment variable
DEBUG=modules:* npm start
```

The system will log the aggregation pipeline being used for troubleshooting. 