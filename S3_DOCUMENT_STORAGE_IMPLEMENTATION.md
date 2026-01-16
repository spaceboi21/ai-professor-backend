# S3 Document Storage Implementation - Complete Guide

## ✅ What Has Been Implemented

### 1. S3 Service (`src/modules/internship/s3.service.ts`)
- ✅ Complete S3 integration using AWS SDK v3
- ✅ Upload documents to S3 with pattern: `internship-cases/{case_id}/{timestamp}_{uuid}_{filename}`
- ✅ Generate presigned URLs for secure document access (1 hour expiration)
- ✅ Delete documents from S3
- ✅ File validation (type and size - max 50MB)
- ✅ Allowed file types: PDF, DOC, DOCX, JPEG, PNG, WEBP

### 2. Database Schema Updates (`src/database/schemas/tenant/internship-case.schema.ts`)
- ✅ Enhanced `case_documents` array with:
  - `s3_key`: S3 object key for retrieval
  - `size`: File size in bytes
  - `uploaded_at`: Upload timestamp
- ✅ Added `pinecone_ingested`: Boolean flag for ingestion status
- ✅ Added `pinecone_ingested_at`: Timestamp of last ingestion

### 3. Case Service Methods (`src/modules/internship/internship-case.service.ts`)
- ✅ `uploadCaseDocument()`: Upload to S3, save to MongoDB, ingest to Python AI
- ✅ `getDocumentUrl()`: Generate presigned URL for document access
- ✅ `deleteDocument()`: Delete from S3 and MongoDB

### 4. DTOs (`src/modules/internship/dto/upload-case-document.dto.ts`)
- ✅ `UploadCaseDocumentDto`: For document upload requests
- ✅ `GetDocumentUrlDto`: For document URL requests

## 🔧 What Still Needs to Be Done

### 1. Install AWS SDK
```bash
cd /opt/ai/ai-professor-backend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 2. Add Controller Endpoints

Add these endpoints to `src/modules/internship/internship.controller.ts`:

```typescript
// Add to imports
import { UploadCaseDocumentDto } from './dto/upload-case-document.dto';

// Add these endpoints after existing case management endpoints

@Post('cases/:caseId/documents')
@Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
@ApiOperation({ summary: 'Upload document to case' })
@ApiParam({ name: 'caseId', type: String, description: 'Case ID' })
@ApiBody({ type: UploadCaseDocumentDto })
@ApiResponse({ status: 201, description: 'Document uploaded successfully' })
@ApiResponse({ status: 400, description: 'Bad request' })
async uploadCaseDocument(
  @Param('caseId') caseId: string,
  @Body() uploadDto: UploadCaseDocumentDto,
  @User() user: JWTUserPayload,
) {
  // Ensure case_id in body matches URL param
  uploadDto.case_id = caseId;
  return this.caseService.uploadCaseDocument(uploadDto, user);
}

@Get('cases/:caseId/documents/:documentIndex')
@Roles(
  RoleEnum.SUPER_ADMIN,
  RoleEnum.SCHOOL_ADMIN,
  RoleEnum.PROFESSOR,
  RoleEnum.STUDENT,
)
@ApiOperation({ summary: 'Get presigned URL for document download' })
@ApiParam({ name: 'caseId', type: String, description: 'Case ID' })
@ApiParam({ name: 'documentIndex', type: Number, description: 'Document index' })
@ApiResponse({ status: 200, description: 'Document URL generated successfully' })
@ApiResponse({ status: 404, description: 'Document not found' })
async getDocumentUrl(
  @Param('caseId') caseId: string,
  @Param('documentIndex') documentIndex: string,
  @User() user: JWTUserPayload,
) {
  return this.caseService.getDocumentUrl(caseId, parseInt(documentIndex), user);
}

@Delete('cases/:caseId/documents/:documentIndex')
@Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
@ApiOperation({ summary: 'Delete document from case' })
@ApiParam({ name: 'caseId', type: String, description: 'Case ID' })
@ApiParam({ name: 'documentIndex', type: Number, description: 'Document index' })
@ApiResponse({ status: 200, description: 'Document deleted successfully' })
@ApiResponse({ status: 404, description: 'Document not found' })
async deleteDocument(
  @Param('caseId') caseId: string,
  @Param('documentIndex') documentIndex: string,
  @User() user: JWTUserPayload,
) {
  return this.caseService.deleteDocument(caseId, parseInt(documentIndex), user);
}
```

### 3. Register S3 Service in Module

Update `src/modules/internship/internship.module.ts`:

```typescript
// Add to imports
import { InternshipS3Service } from './s3.service';

// Add to providers array
providers: [
  InternshipService,
  InternshipCaseService,
  InternshipSessionService,
  InternshipFeedbackService,
  InternshipLogbookService,
  PythonInternshipService,
  InternshipS3Service,  // <-- ADD THIS
],
```

### 4. Verify Environment Variables

Ensure your `.env` file has:
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET_NAME=your_bucket_name
AWS_REGION=us-east-1  # or your region
```

## 📋 Complete Document Upload Flow

### Flow Diagram:
```
1. Frontend sends document (base64 encoded)
   ↓
2. Backend receives at: POST /api/internship/cases/:caseId/documents
   ↓
3. Decode base64 → Buffer
   ↓
4. Upload to S3 → Get S3 URL
   ↓
5. Save document metadata to MongoDB case.case_documents[]
   ↓
6. Call Python AI: POST http://localhost:8000/api/v1/internship/cases/ingest
   Payload: {
     case_id, case_title, case_content,
     case_documents: [{ url: S3_URL, type, name }],
     metadata: {...}
   }
   ↓
7. Python AI downloads from S3, parses, chunks, uploads to Pinecone
   ↓
8. Mark case as pinecone_ingested: true
   ↓
9. Return success to frontend
```

### Document Retrieval Flow:
```
1. Student/Teacher requests document
   ↓
2. GET /api/internship/cases/:caseId/documents/:documentIndex
   ↓
3. Backend generates presigned S3 URL (1 hour expiration)
   ↓
4. Return presigned URL to frontend
   ↓
5. Frontend uses URL to display/download document
```

## 🔒 Security Features

1. **Private S3 Bucket**: Documents are stored with ACL='private'
2. **Presigned URLs**: Temporary access (1 hour expiration)
3. **File Validation**: 
   - Type checking (only PDF, DOC, DOCX, images)
   - Size limit (50MB max)
4. **Access Control**: Role-based permissions on endpoints
5. **Unique Keys**: Prevents overwrites with timestamp + UUID

## 📝 API Examples

### Upload Document
```http
POST /api/internship/cases/507f1f77bcf86cd799439011/documents
Authorization: Bearer <token>
Content-Type: application/json

{
  "case_id": "507f1f77bcf86cd799439011",
  "file_name": "medical-records.pdf",
  "mime_type": "application/pdf",
  "file_size": 1048576,
  "file_content": "JVBERi0xLjQKJeLjz9MK..."  // base64 encoded
}

Response:
{
  "message": "Document uploaded successfully",
  "data": {
    "document": {
      "url": "https://bucket.s3.amazonaws.com/internship-cases/...",
      "s3_key": "internship-cases/507f1f77bcf86cd799439011/1702569600000_uuid_medical-records.pdf",
      "type": "application/pdf",
      "name": "medical-records.pdf",
      "size": 1048576,
      "uploaded_at": "2025-12-14T10:00:00.000Z"
    },
    "case_id": "507f1f77bcf86cd799439011"
  }
}
```

### Get Document URL
```http
GET /api/internship/cases/507f1f77bcf86cd799439011/documents/0
Authorization: Bearer <token>

Response:
{
  "message": "Document URL generated successfully",
  "data": {
    "url": "https://bucket.s3.amazonaws.com/internship-cases/...?X-Amz-Algorithm=...",
    "name": "medical-records.pdf",
    "type": "application/pdf",
    "size": 1048576,
    "expires_in": 3600
  }
}
```

### Delete Document
```http
DELETE /api/internship/cases/507f1f77bcf86cd799439011/documents/0
Authorization: Bearer <token>

Response:
{
  "message": "Document deleted successfully"
}
```

## 🐛 Error Handling

### S3 Upload Failures
- If S3 upload fails → Return error to user, don't save case
- Error message: "Failed to upload document: {error details}"

### Python AI Ingestion Failures
- If ingestion fails → LOG error but don't fail the operation
- Document is still saved in S3 and MongoDB
- Flag `pinecone_ingested` remains `false`
- Can retry ingestion later

### Document Not Found
- Returns 404 with message: "Document not found"
- Handles both missing case and missing document index

## 🔄 Migration for Existing Documents

For documents uploaded before S3 integration:
- They will have `url` but no `s3_key`
- `getDocumentUrl()` will return the stored URL directly (fallback)
- No presigned URL generation for old documents
- Consider migrating old documents to S3 in a background job

## 📊 Monitoring & Logging

The implementation includes comprehensive logging:
- Document upload success/failure
- S3 operations (upload, delete, presigned URL generation)
- Python AI ingestion status
- All errors with stack traces

Check logs with:
```bash
pm2 logs ai-professor-backend-5000 | grep "S3\|Document\|Pinecone"
```

## ✅ Testing Checklist

After implementation:
- [ ] Install AWS SDK packages
- [ ] Add controller endpoints
- [ ] Register S3 service in module
- [ ] Verify environment variables
- [ ] Rebuild: `npm run build`
- [ ] Restart: `pm2 restart ai-professor-backend-5000`
- [ ] Test document upload (PDF)
- [ ] Test document upload (DOC/DOCX)
- [ ] Test document upload (Image)
- [ ] Test file size limit (try >50MB)
- [ ] Test invalid file type
- [ ] Test document retrieval (presigned URL)
- [ ] Test document deletion
- [ ] Verify Python AI receives S3 URLs
- [ ] Verify Pinecone ingestion works
- [ ] Check S3 bucket for uploaded files

## 🚀 Deployment Steps

```bash
# 1. Install dependencies
cd /opt/ai/ai-professor-backend
source venv/bin/activate  # Activate environment
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# 2. Add controller endpoints (manual step - see above)

# 3. Register S3 service in module (manual step - see above)

# 4. Rebuild
npm run build

# 5. Restart
pm2 restart ai-professor-backend-5000

# 6. Check logs
pm2 logs ai-professor-backend-5000 --lines 100
```

## 📞 Support

If you encounter issues:
1. Check PM2 logs for errors
2. Verify AWS credentials are correct
3. Ensure S3 bucket exists and has proper permissions
4. Test S3 access with AWS CLI: `aws s3 ls s3://your-bucket-name`
5. Check Python AI backend is running: `curl http://localhost:8000/health`

---

**Implementation Status**: 90% Complete
- ✅ S3 Service
- ✅ Database Schema
- ✅ Service Methods
- ✅ DTOs
- ⏳ Controller Endpoints (needs manual addition)
- ⏳ Module Registration (needs manual addition)
- ⏳ NPM Packages (needs installation)

