# CSV Storage Service

This service provides a unified interface for storing and retrieving CSV files, with automatic environment-based routing:

- **Development**: Files are stored locally in `uploads/csv/` directory
- **Production**: Files are uploaded to AWS S3 in the `csv-exports/` folder

## Features

### Environment-Based Storage
- **Local Storage**: Files stored in `uploads/csv/` directory with static file serving
- **S3 Storage**: Files uploaded to S3 with proper content disposition for downloads
- **Automatic Routing**: Service automatically chooses storage method based on `NODE_ENV`

### Security Features
- Filename sanitization to prevent directory traversal
- Content-Type validation
- Proper error handling for both storage methods

### File Management
- Timestamped filenames for uniqueness
- Automatic cleanup of old files (local only)
- Signed URLs for S3 downloads (production)

## Usage

### Basic CSV Storage

```typescript
// Store CSV file
const result = await csvStorageService.storeCSV({
  filename: 'learning-logs-export',
  content: csvContent,
  includeTimestamp: true,
});

// Result contains:
// {
//   fileUrl: string,        // Download URL
//   filePath?: string,      // Local file path (dev only)
//   filename: string,       // Generated filename
//   size: number,           // File size in bytes
//   storageType: 'local' | 's3'
// }
```

### File Retrieval

```typescript
// Get file content for download
const { content, contentType } = await csvStorageService.getFileContent(filename);

// Generate download URL (S3 signed URL in production)
const downloadUrl = await csvStorageService.generateDownloadUrl(filename);
```

### Cleanup

```typescript
// Clean up old files (local only, default 24 hours)
await csvStorageService.cleanupOldFiles(24);
```

## Configuration

### Environment Variables

For S3 storage (production):
```
NODE_ENV=production
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET_NAME=your-bucket-name
```

For local storage (development):
```
NODE_ENV=development
# No additional configuration needed
```

## File Structure

### Local Storage (Development)
```
project-root/
├── uploads/
│   └── csv/
│       ├── learning-logs-export_2024-01-15T10-30-00-000Z.csv
│       └── other-exports_2024-01-15T11-45-00-000Z.csv
```

### S3 Storage (Production)
```
s3-bucket/
└── csv-exports/
    ├── learning-logs-export_2024-01-15T10-30-00-000Z.csv
    └── other-exports_2024-01-15T11-45-00-000Z.csv
```

## Integration with Learning Logs

The CSV storage service is integrated with the learning logs export feature:

1. **Export**: `GET /api/learning-logs/export` - Generates CSV and stores it
2. **Download**: `GET /api/learning-logs/download/:filename` - Downloads the stored file

### Example Flow

1. User requests CSV export with filters
2. System generates CSV content
3. File is stored using `CSVStorageService`
4. Response includes filename and metadata
5. User downloads file using the filename

## Error Handling

The service includes comprehensive error handling:

- **File Not Found**: Throws appropriate error for missing files
- **S3 Errors**: Handles AWS SDK errors gracefully
- **Permission Errors**: Validates file access permissions
- **Network Errors**: Handles connectivity issues for S3

## Performance Considerations

### Local Storage
- Fast file I/O operations
- No network latency
- Limited by disk space

### S3 Storage
- Network latency for uploads/downloads
- Virtually unlimited storage
- Automatic scaling
- CDN integration possible

## Security Considerations

### Local Storage
- Files stored in project directory
- Accessible via static file serving
- Consider file permissions and cleanup

### S3 Storage
- IAM roles and policies
- Bucket policies for access control
- Signed URLs for secure downloads
- Lifecycle policies for cleanup

## Monitoring

The service includes logging for:
- File storage operations
- File retrieval operations
- Error conditions
- Cleanup operations

## Future Enhancements

- [ ] CDN integration for faster downloads
- [ ] File compression for large exports
- [ ] Background cleanup jobs
- [ ] File encryption at rest
- [ ] Audit logging for file access 