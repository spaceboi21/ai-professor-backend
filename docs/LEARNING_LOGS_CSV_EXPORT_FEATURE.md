# Learning Logs CSV Export Feature

## Overview

The Learning Logs module now supports CSV export functionality that allows users to export learning logs data with applied filters. This feature is optimized for handling large datasets and provides comprehensive data export capabilities.

## Features

### 1. CSV Export Endpoint
- **Endpoint**: `GET /learning-logs/export`
- **Authentication**: Required (JWT)
- **Authorization**: 
  - Students: Can export only their own learning logs
  - School Admins/Professors: Can export all students' learning logs
  - Super Admins: Can export all learning logs

### 2. File Download Endpoint
- **Endpoint**: `GET /learning-logs/download/:filename`
- **Purpose**: Download previously exported CSV files
- **Security**: Validates filename to prevent directory traversal

### 3. Supported Filters
All existing learning logs filters are supported for export:
- `text`: Filter by module title or description
- `module_id`: Filter by specific module
- `skill_gap`: Filter by skill gap type
- `start_date`: Filter by start date (YYYY-MM-DD)
- `end_date`: Filter by end date (YYYY-MM-DD)

## CSV Export Data Structure

The exported CSV includes the following columns:

### Student Information
- Student ID
- Student Name
- Student Email

### Module Information
- Module ID
- Module Title
- Module Subject
- Module Difficulty

### Session Information
- Session ID
- Session Status
- Session Start Date
- Session End Date

### Learning Analysis
- Primary Skill Gap
- Skill Gaps (semicolon-separated)
- Strengths (semicolon-separated)
- Areas for Improvement (semicolon-separated)
- Missed Opportunities (semicolon-separated)
- Suggestions (semicolon-separated)
- Keywords for Learning (semicolon-separated)

### Ratings
- Overall Rating
- Communication Rating
- Empathy Rating
- Professionalism Rating

### Additional Data
- Status
- Frequency
- Feedback Created At
- Feedback Updated At
- Can Review
- Has User Review
- Review Rating
- Review Feedback
- Reviewer Role
- Review Created At

## Usage Examples

### 1. Export All Learning Logs
```bash
GET /learning-logs/export
Authorization: Bearer <jwt_token>
```

### 2. Export with Filters
```bash
GET /learning-logs/export?text=child development&skill_gap=empathy&start_date=2024-01-01&end_date=2024-12-31
Authorization: Bearer <jwt_token>
```

### 3. Download Exported File
```bash
GET /learning-logs/download/learning-logs-export_2024-01-15T10-30-00-000Z.csv
Authorization: Bearer <jwt_token>
```

## Response Format

### Export Response
```json
{
  "filename": "learning-logs-export_2024-01-15T10-30-00-000Z.csv",
  "file_path": "/tmp/ai-professor-exports/learning-logs-export_2024-01-15T10-30-00-000Z.csv",
  "file_size": 1024,
  "record_count": 150,
  "exported_at": "2024-01-15T10:30:00.000Z",
  "applied_filters": {
    "text": "child development",
    "skill_gap": "empathy",
    "start_date": "2024-01-01",
    "end_date": "2024-12-31"
  }
}
```

## Technical Implementation

### 1. CSV Generation
- Uses a custom `CSVUtil` class for CSV generation
- Properly escapes CSV values to handle special characters
- Generates timestamped filenames to avoid conflicts

### 2. File Storage
- Files are stored in a temporary directory (`/tmp/ai-professor-exports/`)
- Automatic cleanup functionality available
- File size tracking for monitoring

### 3. Security Features
- Role-based access control
- Filename validation to prevent directory traversal
- JWT authentication required for all endpoints

### 4. Performance Optimizations
- No pagination applied for exports (gets all data)
- Efficient aggregation pipeline reuse
- Streaming file downloads for large files

## Error Handling

### Common Error Responses
- `404 Not Found`: No learning logs found for export
- `401 Unauthorized`: Invalid or missing JWT token
- `403 Forbidden`: Insufficient permissions
- `400 Bad Request`: Invalid filter parameters

## File Management

### Temporary File Cleanup
The system provides automatic cleanup functionality:
```typescript
// Clean up temporary CSV file
await csvUtil.cleanupCSVFile(filePath);
```

### File Size Monitoring
```typescript
// Get file size in bytes
const fileSize = csvUtil.getFileSize(filePath);
```

## Integration with Frontend

### 1. Export Workflow
1. Frontend calls export endpoint with filters
2. Backend generates CSV file and returns metadata
3. Frontend uses download endpoint to get the file
4. Frontend triggers file download in browser

### 2. Example Frontend Integration
```javascript
// Step 1: Export data
const exportResponse = await fetch('/learning-logs/export?text=child', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const exportData = await exportResponse.json();

// Step 2: Download file
const downloadUrl = `/learning-logs/download/${exportData.filename}`;
window.open(downloadUrl, '_blank');
```

## Monitoring and Logging

The export feature includes comprehensive logging:
- Export initiation with user details
- Pipeline stage count logging
- Export completion with file details
- Download requests with filename validation

## Future Enhancements

1. **Background Processing**: For very large exports, implement background job processing
2. **Email Notifications**: Send email when export is ready
3. **Export History**: Track export history for users
4. **Compression**: Add gzip compression for large files
5. **Cloud Storage**: Move files to cloud storage (S3) for persistence 