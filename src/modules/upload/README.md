# Upload Module

This module handles file uploads for various purposes including profile pictures and bibliography files (PDFs and videos).

## Features

- **Profile Picture Uploads**: Secure upload URLs and direct file uploads for profile pictures
- **Bibliography File Uploads**: Support for PDF and video files for bibliography items
- **Multi-environment Support**: Different handling for development and production environments
- **File Validation**: Comprehensive file type and size validation
- **Security**: Secure file naming and path validation

## API Endpoints

### Profile Picture Uploads

#### Get Upload URL (Production)

- **POST** `/upload/profile-url`
- **Body**: `GetFileUploadUrl`
- **Description**: Generate presigned S3 upload URL for profile pictures

#### Direct Upload (Development)

- **POST** `/upload/profile`
- **Content-Type**: `multipart/form-data`
- **Description**: Direct file upload for development environment
- **File Types**: JPEG, PNG, WebP
- **Max Size**: 5MB

### Bibliography File Uploads

#### Get Upload URL (Production)

- **POST** `/upload/bibliography-url`
- **Body**: `GetBibliographyUploadUrl`
- **Description**: Generate presigned S3 upload URL for bibliography files

#### Direct Upload (Development)

- **POST** `/upload/bibliography`
- **Content-Type**: `multipart/form-data`
- **Description**: Direct file upload for development environment
- **File Types**: PDF, MP4, AVI, MOV, WMV, FLV, WebM
- **Max Size**: 100MB

### File Validation

#### Validate Uploaded File

- **GET** `/upload/validate-file?fileUrl=<url>`
- **Description**: Validate that an uploaded file exists and is valid

## File Types and Limits

### Profile Pictures

- **Allowed Types**: JPEG, JPG, PNG, WebP
- **Max Size**: 5MB (configurable via `MAXIMUM_FILE_SIZE`)

### Bibliography Files

- **Allowed Types**: PDF, MP4, AVI, MOV, WMV, FLV, WebM
- **Max Size**: 100MB (configurable via `MAXIMUM_BIBLIOGRAPHY_FILE_SIZE`)

## Usage Examples

### Upload Bibliography File (Development)

```bash
curl -X POST http://localhost:3000/upload/bibliography \
  -H "Authorization: Bearer <your-jwt-token>" \
  -F "file=@/path/to/your/document.pdf"
```

**Response:**

```json
{
  "fileUrl": "http://localhost:3000/uploads/bibliography/1712345678901-123456789.pdf",
  "key": "uploads/bibliography/1712345678901-123456789.pdf",
  "originalName": "document.pdf",
  "size": 2048576,
  "mimeType": "application/pdf"
}
```

### Get Upload URL (Production)

```bash
curl -X POST http://localhost:3000/upload/bibliography-url \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "introduction-to-psychology.pdf",
    "mimeType": "application/pdf",
    "fileType": "PDF"
  }'
```

**Response:**

```json
{
  "uploadUrl": "https://s3.amazonaws.com/bucket/bibliography/1712345678901-uuid-introduction-to-psychology.pdf?X-Amz-Algorithm=...",
  "fileUrl": "https://bucket.s3.amazonaws.com/bibliography/1712345678901-uuid-introduction-to-psychology.pdf"
}
```

## Integration with Bibliography Module

After uploading a file, use the returned `fileUrl` and `mimeType` to create a bibliography entry:

```bash
curl -X POST http://localhost:3000/bibliography \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "module_id": "507f1f77bcf86cd799439011",
    "chapter_id": "507f1f77bcf86cd799439012",
    "title": "Introduction to Psychology",
    "description": "Comprehensive introduction to psychological concepts",
    "type": "PDF",
    "mime_type": "application/pdf",
    "path": "http://localhost:3000/uploads/bibliography/1712345678901-123456789.pdf",
    "duration": 45
  }'
```

## Environment Variables

- `MAXIMUM_FILE_SIZE`: Maximum file size for profile pictures (default: 5MB)
- `MAXIMUM_BIBLIOGRAPHY_FILE_SIZE`: Maximum file size for bibliography files (default: 100MB)
- `AWS_S3_BUCKET_NAME`: S3 bucket name for production uploads
- `AWS_REGION`: AWS region for S3
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `BACKEND_URL`: Backend URL for development file serving

## Security Features

- **File Type Validation**: Only allowed file types are accepted
- **File Size Limits**: Configurable size limits prevent abuse
- **Secure File Naming**: Files are renamed with timestamps and UUIDs
- **Path Validation**: File URLs are validated to prevent path traversal
- **MIME Type Validation**: Server-side MIME type checking

## File Storage

### Development

- Files are stored locally in `./uploads/` directory
- Organized by type: `./uploads/profile-pics/` and `./uploads/bibliography/`

### Production

- Files are uploaded directly to AWS S3
- Presigned URLs are used for secure uploads
- Files are organized in S3 folders by type
