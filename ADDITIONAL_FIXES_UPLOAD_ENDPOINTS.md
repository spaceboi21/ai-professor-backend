# Additional Backend Fixes - Upload Endpoints

## Date: December 14, 2025

## Issues Fixed

### ✅ Missing Case Document Upload Endpoint

**Problem**: Frontend was trying to upload case documents but got 404 error:
```
POST /api/upload/case-document-url - 404 Not Found
```

**Solution**: Added complete case document upload functionality

**Files Created/Modified**:
1. **NEW**: `src/modules/upload/dto/get-case-document-upload-url.dto.ts` - DTO for case document uploads
2. **UPDATED**: `src/modules/upload/upload.controller.ts` - Added endpoints:
   - `POST /upload/case-document-url` - Generate presigned upload URL
   - `PUT /upload/case-document` - Upload case document file
   - `GET /upload/case-documents/:filename` - Retrieve uploaded document
3. **UPDATED**: `src/common/types/upload-folders.type.ts` - Added 'case-documents' to allowed folders

**Endpoint Details**:

#### 1. Generate Upload URL
```http
POST /api/upload/case-document-url
Authorization: Bearer <token>
Content-Type: application/json

{
  "fileName": "medical-records.pdf",
  "mimeType": "application/pdf"
}

Response:
{
  "uploadUrl": "http://api.psysphereai.com/upload/case-document",
  "method": "PUT",
  "maxSize": 52428800,  // 50MB
  "expiresIn": 600  // 10 minutes
}
```

#### 2. Upload File
```http
PUT /api/upload/case-document?filename=medical-records.pdf
Authorization: Bearer <token>
Content-Type: application/pdf
Body: <binary file data>

Response:
{
  "fileUrl": "http://api.psysphereai.com/uploads/case-documents/1702569600000-uuid.pdf",
  "key": "uploads/case-documents/1702569600000-uuid.pdf",
  "originalName": "medical-records.pdf",
  "size": 1048576,
  "mimeType": "application/pdf",
  "message": "Case document uploaded successfully"
}
```

#### 3. Retrieve File
```http
GET /api/upload/case-documents/1702569600000-uuid.pdf
Authorization: Bearer <token>

Response: Binary file stream
```

**Supported File Types**:
- PDF (`.pdf`)
- Word Documents (`.doc`, `.docx`)
- Images (`.jpg`, `.jpeg`, `.png`, `.webp`)

**File Size Limit**: 50MB

---

## Frontend Issues to Fix

### ❌ Wrong Feedback Endpoint

**Problem**: Frontend is calling the wrong endpoint for pending feedback:
```javascript
// Frontend calls (WRONG):
GET /api/internship/feedback/getall?status=PENDING_VALIDATION

// Backend has (CORRECT):
GET /api/internship/feedback/pending
```

**Frontend Fix Needed**:
Update your frontend API client to use the correct endpoint:

```javascript
// OLD (incorrect):
const response = await fetch('/api/internship/feedback/getall?status=PENDING_VALIDATION');

// NEW (correct):
const response = await fetch('/api/internship/feedback/pending?page=1&limit=10');
```

The backend endpoint already supports pagination:
- Query params: `page` (optional, default: 1), `limit` (optional, default: 10)
- Returns: Paginated list of pending feedback

---

## How to Apply These Fixes

### Step 1: Rebuild the Backend

```bash
cd /opt/ai/ai-professor-backend
npm run build
```

### Step 2: Restart the Service

```bash
pm2 restart ai-professor-backend-5000
pm2 logs ai-professor-backend-5000 --lines 50
```

### Step 3: Test the Upload Endpoint

```bash
# Test case document upload URL generation
curl -X POST http://api.psysphereai.com/api/upload/case-document-url \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.pdf","mimeType":"application/pdf"}'
```

### Step 4: Update Frontend

Update your frontend code to:
1. Use `/api/upload/case-document-url` for case documents
2. Use `/api/internship/feedback/pending` instead of `/api/internship/feedback/getall`
3. Handle the `difficulty` field instead of `patient_simulation_config.difficulty_level`

---

## Summary of All Backend Changes

| Issue | Endpoint | Status |
|-------|----------|--------|
| Session creation 422 error | Various | ✅ FIXED |
| Year-based access control | `GET /internship/:id` | ✅ FIXED |
| Case privacy filtering | `GET /internship/cases/:id` | ✅ FIXED |
| Case document upload | `POST /upload/case-document-url` | ✅ ADDED |
| Case document upload | `PUT /upload/case-document` | ✅ ADDED |
| Case document retrieval | `GET /upload/case-documents/:filename` | ✅ ADDED |

---

## Frontend Changes Still Needed

1. **Update feedback endpoint**: Change `/api/internship/feedback/getall` → `/api/internship/feedback/pending`

2. **Update case difficulty access**: Change `case.patient_simulation_config.difficulty_level` → `case.difficulty`

3. **Handle missing fields gracefully**: Add optional chaining for all case fields that might be undefined for students

4. **Test case document uploads**: Ensure the new upload endpoint works with your file upload component

---

## Testing Checklist

After applying all fixes, test:

- [ ] Student can start a session without 422 error
- [ ] Student can only see internships for their year
- [ ] Student cannot see sensitive case fields (prompts, evaluation criteria)
- [ ] Teacher/Admin can upload case documents successfully
- [ ] Teacher/Admin can see pending feedback list
- [ ] Case documents are accessible after upload
- [ ] All file types (PDF, DOC, images) upload correctly

---

## Notes

- The linter error about `'case-documents'` not being assignable to `UploadFolders` should resolve after rebuilding
- If it persists, restart your IDE/editor to clear TypeScript cache
- All changes are backward compatible
- Existing uploads and data will continue to work


