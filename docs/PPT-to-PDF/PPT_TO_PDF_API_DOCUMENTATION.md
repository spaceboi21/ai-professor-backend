# 📄 PPT to PDF Conversion API - Complete Documentation

## 🎯 Overview

This API provides direct PowerPoint to PDF conversion with immediate response containing the converted PDF URL. It's specifically designed for PPT/PPTX files and should be used instead of the regular file upload flow for PowerPoint presentations.

## 🔄 When to Use This API

**✅ Use PPT to PDF API for:**
- `.ppt` files (Microsoft PowerPoint 97-2003)
- `.pptx` files (Microsoft PowerPoint 2007+)

**❌ Use existing flow for:**
- PDF files
- Video files
- Word documents
- Excel spreadsheets
- Images
- Other file types

## 🚀 API Endpoints

### 1. Convert PPT/PPTX to PDF

**Endpoint:** `POST /conversion/convert`

**Headers:**
```http
Content-Type: multipart/form-data
Authorization: Bearer {your-jwt-token}
```

**Request Body:**
```typescript
FormData {
  pptFile: File // PowerPoint file (.ppt or .pptx)
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully converted 10 slides to PDF",
  "fileName": "presentation-1234567890.pdf",
  "originalFileName": "presentation-1234567890.pptx",
  "slideCount": 10,
  "fileSize": 2048000,
  "originalFileSize": 5120000,
  "conversionMethod": "LibreOffice-Direct (Ultra Fast)",
  "conversionTime": 3500,
  "fileUrl": "http://localhost:3000/uploads/bibliography/presentation-1234567890.pdf",
  "originalFileUrl": "http://localhost:3000/uploads/bibliography/presentation-1234567890.pptx"
}
```

**Error Responses:**
```json
// 400 Bad Request - Invalid file
{
  "statusCode": 400,
  "message": "Only PowerPoint files (.ppt, .pptx) are allowed",
  "error": "Bad Request"
}

// 400 Bad Request - File too large
{
  "statusCode": 400,
  "message": "File too large. Maximum size is 500MB",
  "error": "Bad Request"
}

// 500 Internal Server Error - Conversion failed
{
  "statusCode": 500,
  "message": "Conversion failed: LibreOffice process failed",
  "error": "Internal Server Error"
}
```

### 2. System Health Check

**Endpoint:** `GET /conversion/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "ppt-to-pdf-converter",
  "libreOfficeAvailable": true
}
```

### 3. System Information

**Endpoint:** `GET /conversion/system-info`

**Response:**
```json
{
  "platform": "win32",
  "nodeVersion": "v18.17.0",
  "nodeEnv": "development",
  "libreOffice": {
    "found": true,
    "path": "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "valid": true
  },
  "config": {
    "maxFileSize": 524288000,
    "conversionTimeout": 300000,
    "batchSize": 5,
    "maxConcurrent": 3
  }
}
```

## 🎨 Frontend Implementation

### 1. File Type Detection

```typescript
// Helper function to check if file is PowerPoint
function isPowerPointFile(file: File): boolean {
  const powerPointExtensions = ['.ppt', '.pptx'];
  const powerPointMimeTypes = [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];
  
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  const isValidExtension = powerPointExtensions.includes(fileExtension);
  const isValidMimeType = powerPointMimeTypes.includes(file.type);
  
  return isValidExtension || isValidMimeType;
}
```

### 2. Upload Handler with Route Decision

```typescript
interface ConversionResponse {
  success: boolean;
  message: string;
  fileName: string;
  slideCount: number;
  fileSize: number;
  originalFileSize: number;
  conversionMethod: string;
  conversionTime: number;
  fileUrl: string;
}

async function handleFileUpload(file: File, authToken: string) {
  try {
    // Check if file is PowerPoint
    if (isPowerPointFile(file)) {
      console.log('📄 PowerPoint file detected - using conversion API');
      return await convertPowerPointToPdf(file, authToken);
    } else {
      console.log('📎 Other file type - using existing flow');
      return await uploadUsingExistingFlow(file, authToken);
    }
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
}

// PowerPoint conversion function
async function convertPowerPointToPdf(file: File, authToken: string): Promise<ConversionResponse> {
  const formData = new FormData();
  formData.append('pptFile', file);

  const response = await fetch('/conversion/convert', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Conversion failed');
  }

  const result: ConversionResponse = await response.json();
  
  console.log('✅ Conversion completed!');
  console.log('📄 PDF File:', result.fileName);
  console.log('🔗 Download URL:', result.fileUrl);
  console.log('📊 Slides:', result.slideCount);
  console.log('⚡ Time:', result.conversionTime + 'ms');
  
  return result;
}

// Existing flow function (your current implementation)
async function uploadUsingExistingFlow(file: File, authToken: string) {
  // Your existing file upload logic here
  // This could be generating upload URLs, direct S3 upload, etc.
  console.log('Using existing upload flow for:', file.name);
  // ... your existing implementation
}
```

### 3. React Component Example

```tsx
import React, { useState } from 'react';

interface FileUploadProps {
  onUploadSuccess: (result: any) => void;
  onUploadError: (error: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess, onUploadError }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress('Preparing upload...');

    try {
      const authToken = localStorage.getItem('authToken'); // Your auth token
      
      if (isPowerPointFile(file)) {
        setUploadProgress('Converting PowerPoint to PDF...');
        const result = await convertPowerPointToPdf(file, authToken);
        
        onUploadSuccess({
          type: 'conversion',
          ...result
        });
      } else {
        setUploadProgress('Uploading file...');
        const result = await uploadUsingExistingFlow(file, authToken);
        
        onUploadSuccess({
          type: 'upload',
          ...result
        });
      }
    } catch (error) {
      onUploadError(error.message);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="file-upload">
      <input
        type="file"
        onChange={handleFileChange}
        disabled={uploading}
        accept=".ppt,.pptx,.pdf,.mp4,.avi,.mov,.doc,.docx,.xls,.xlsx"
      />
      {uploading && (
        <div className="upload-status">
          <div className="spinner" />
          <span>{uploadProgress}</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
```

### 4. Vue.js Component Example

```vue
<template>
  <div class="file-upload">
    <input
      type="file"
      @change="handleFileChange"
      :disabled="uploading"
      accept=".ppt,.pptx,.pdf,.mp4,.avi,.mov,.doc,.docx,.xls,.xlsx"
    />
    <div v-if="uploading" class="upload-status">
      <div class="spinner"></div>
      <span>{{ uploadProgress }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FileUpload',
  data() {
    return {
      uploading: false,
      uploadProgress: ''
    };
  },
  methods: {
    async handleFileChange(event) {
      const file = event.target.files[0];
      if (!file) return;

      this.uploading = true;
      this.uploadProgress = 'Preparing upload...';

      try {
        const authToken = this.$store.getters.authToken; // Your auth token
        
        if (this.isPowerPointFile(file)) {
          this.uploadProgress = 'Converting PowerPoint to PDF...';
          const result = await this.convertPowerPointToPdf(file, authToken);
          
          this.$emit('upload-success', {
            type: 'conversion',
            ...result
          });
        } else {
          this.uploadProgress = 'Uploading file...';
          const result = await this.uploadUsingExistingFlow(file, authToken);
          
          this.$emit('upload-success', {
            type: 'upload',
            ...result
          });
        }
      } catch (error) {
        this.$emit('upload-error', error.message);
      } finally {
        this.uploading = false;
        this.uploadProgress = '';
      }
    },
    
    isPowerPointFile(file) {
      // Same implementation as above
    },
    
    async convertPowerPointToPdf(file, authToken) {
      // Same implementation as above
    },
    
    async uploadUsingExistingFlow(file, authToken) {
      // Your existing implementation
    }
  }
};
</script>
```

## 🔧 Configuration

### Environment Variables

```bash
# Conversion Settings
MAX_FILE_SIZE=524288000          # 500MB in bytes
CONVERSION_TIMEOUT=300000       # 5 minutes in ms
TEMP_FILE_MAX_AGE=3600000      # 1 hour in ms
TEMP_CLEANUP_INTERVAL=1800000  # 30 minutes in ms

# LibreOffice (optional - auto-detected if not provided)
LIBREOFFICE_PATH=/usr/bin/soffice

# Performance
BATCH_SIZE=5
MAX_CONCURRENT=3

# Rate Limiting
RATE_LIMIT_TTL=900  # 15 minutes
RATE_LIMIT_MAX=10   # 10 requests per TTL

# Storage
UPLOAD_DIR=./uploads
TEMP_DIR=./temp

# AWS S3 (for production)
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### File Storage Behavior

**Both original PPT and converted PDF are stored in the same location:**

**Development Environment:**
- Files saved to: `./uploads/bibliography/`
- PDF URL format: `http://localhost:3000/uploads/bibliography/filename.pdf`
- PPT URL format: `http://localhost:3000/uploads/bibliography/filename.pptx`

**Production Environment:**
- Files uploaded to: S3 bucket `bibliography/` folder
- PDF URL format: `https://bucket-name.s3.region.amazonaws.com/bibliography/filename.pdf`
- PPT URL format: `https://bucket-name.s3.region.amazonaws.com/bibliography/filename.pptx`

**Priority:** The PDF URL (`fileUrl`) is the primary URL for database storage, while the original PPT URL (`originalFileUrl`) is for archival reference.

## 📊 Performance & Limitations

### Performance Metrics
- **Conversion Time:** 3-5 seconds for typical presentations
- **File Size Limit:** 500MB maximum
- **Supported Formats:** PPT, PPTX
- **Rate Limiting:** 10 requests per 15 minutes per user

### System Requirements
- **LibreOffice:** Must be installed on server
- **Memory:** ~100MB per concurrent conversion
- **Disk Space:** Temporary files cleaned automatically

## 🚨 Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|--------|----------|
| `LibreOffice not found` | LibreOffice not installed | Install LibreOffice on server |
| `File too large` | File exceeds 500MB | Reduce file size or increase limit |
| `Only PowerPoint files allowed` | Wrong file type | Use only .ppt or .pptx files |
| `Conversion timeout` | Large file or server load | Try again or contact support |

### Frontend Error Handling

```typescript
try {
  const result = await convertPowerPointToPdf(file, authToken);
  // Handle success
} catch (error) {
  if (error.message.includes('File too large')) {
    alert('File is too large. Maximum size is 500MB.');
  } else if (error.message.includes('Only PowerPoint files')) {
    alert('Please select a PowerPoint file (.ppt or .pptx).');
  } else if (error.message.includes('LibreOffice not found')) {
    alert('Conversion service is temporarily unavailable. Please try again later.');
  } else {
    alert('Conversion failed. Please try again.');
  }
}
```

## 🔍 Testing

### Manual Testing

```bash
# Test with cURL
curl -X POST http://localhost:3000/conversion/convert \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "pptFile=@sample.pptx"

# Health check
curl http://localhost:3000/conversion/health

# System info
curl http://localhost:3000/conversion/system-info
```

### Frontend Testing

```typescript
// Test file detection
const testFiles = [
  new File([''], 'test.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }),
  new File([''], 'test.ppt', { type: 'application/vnd.ms-powerpoint' }),
  new File([''], 'test.pdf', { type: 'application/pdf' })
];

testFiles.forEach(file => {
  console.log(`${file.name}: ${isPowerPointFile(file) ? 'PPT API' : 'Existing Flow'}`);
});
```

## 📝 Integration Checklist

- [ ] **Install LibreOffice** on server
- [ ] **Configure environment variables**
- [ ] **Set up S3 credentials** (production)
- [ ] **Update frontend file detection logic**
- [ ] **Implement error handling**
- [ ] **Test with sample PPT/PPTX files**
- [ ] **Verify existing flow still works** for other files
- [ ] **Monitor server logs** for any issues

---

## 🎉 Summary

This API provides a seamless PowerPoint to PDF conversion experience with:
- ⚡ **Immediate response** with PDF URL
- 🔄 **Automatic routing** based on file type
- 🛡️ **Robust error handling**
- 📱 **Easy frontend integration**
- ⚖️ **Production-ready** with S3 support

The frontend logic automatically detects PowerPoint files and routes them to this conversion API, while all other files continue using your existing upload flow.
