# PPT to PDF Conversion Module

This module provides direct PPT to PDF conversion functionality using LibreOffice with async processing for optimal performance.

## Features

✅ **Direct Response** - Immediate PDF URL response after conversion  
✅ **Async Processing** - Non-blocking conversion in separate thread  
✅ **Cross-Platform Support** - Works on Windows, Linux, and macOS  
✅ **Automatic S3/Local Upload** - Uploads to S3 in production, local storage in development  
✅ **Ultra-Fast Conversion** - 3-5 seconds for typical presentations  
✅ **Error Handling** - Comprehensive error handling and fallback mechanisms  
✅ **Startup Validation** - Prevents server startup if LibreOffice is not available  
✅ **Rate Limiting** - Built-in rate limiting and file size validation  
✅ **Automatic Cleanup** - Cleans up temporary files automatically  

## API Endpoints

### Convert PPT to PDF
```http
POST /conversion/convert
Content-Type: multipart/form-data

{
  "pptFile": <PowerPoint file (.ppt or .pptx)>
}
```

**Response (Direct):**
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

### System Information
```http
GET /conversion/system-info
```

### Health Check
```http
GET /conversion/health
```

## Environment Variables

Add these to your `.env` file:

```env
# Conversion Settings
MAX_FILE_SIZE=52428800                # 50MB in bytes
CONVERSION_TIMEOUT=300000             # 5 minutes
TEMP_FILE_MAX_AGE=3600000            # 1 hour
TEMP_CLEANUP_INTERVAL=1800000        # 30 minutes
BATCH_SIZE=5
MAX_CONCURRENT=3

# LibreOffice (optional override)
LIBREOFFICE_PATH=

# Rate Limiting
RATE_LIMIT_TTL=900                   # 15 minutes
RATE_LIMIT_MAX=10

# Directories
UPLOAD_DIR=./uploads
TEMP_DIR=./temp

# AWS S3 (for production)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET_NAME=your_bucket_name
```

## Prerequisites

### LibreOffice Installation

The server will **NOT START** if LibreOffice is not installed.

**Windows:**
```bash
# Via Chocolatey
choco install libreoffice-fresh

# Or download from https://www.libreoffice.org/download/
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install libreoffice
```

**CentOS/RHEL:**
```bash
sudo yum install libreoffice
# or
sudo dnf install libreoffice
```

**macOS:**
```bash
# Via Homebrew
brew install --cask libreoffice

# Or download from https://www.libreoffice.org/download/
```

## How It Works

1. **Upload**: Client uploads PPT/PPTX file to `/conversion/convert`
2. **Process**: Conversion runs asynchronously in separate thread (non-blocking)
3. **Convert**: LibreOffice converts PPT to PDF with ultra-fast processing
4. **Upload**: PDF is uploaded to S3 (production) or saved locally (development)
5. **Response**: Client receives immediate response with PDF URL and metadata

## File Storage

**Both original PPT and converted PDF stored in bibliography folder:**

- **Production** (`NODE_ENV=production`): Files uploaded to S3 bucket `bibliography/` folder
- **Development**: Files saved to `./uploads/bibliography/` directory

**Priority:** PDF URL is primary for database storage, PPT URL is for archival reference.

## Error Handling

The API provides comprehensive error handling:

- **File validation**: Size, type, and format validation
- **LibreOffice errors**: Automatic fallback methods
- **Conversion failures**: Proper error reporting with cleanup
- **Storage errors**: S3 fallback to local storage
- **Cleanup errors**: Graceful handling with warnings

## Performance

- **Ultra-fast conversion**: 3-5 seconds for typical presentations
- **Direct response**: Immediate PDF URL after processing completion
- **Async processing**: Non-blocking separate thread execution
- **Optimized LibreOffice**: Fast direct conversion with fallback methods
- **Automatic cleanup**: Temporary files cleaned up automatically

## Monitoring

Monitor the conversion system using:

- **System Info**: `/conversion/system-info`
- **Health Check**: `/conversion/health`
- **Application logs**: Check conversion service logs

## Frontend Integration

```typescript
// Upload PPT file and get immediate response
const formData = new FormData();
formData.append('pptFile', file);

try {
  const response = await fetch('/conversion/convert', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('✅ Conversion completed!');
    console.log('📄 PDF File:', result.fileName);
    console.log('📁 Original File:', result.originalFileName);
    console.log('🔗 PDF URL (for database):', result.fileUrl);
    console.log('📎 Original PPT URL:', result.originalFileUrl);
    console.log('📊 Slides:', result.slideCount);
    console.log('⚡ Time:', result.conversionTime + 'ms');
    
    // IMPORTANT: Save result.fileUrl to database as primary URL
    // result.originalFileUrl is for archival reference only
    window.open(result.fileUrl, '_blank');
  }
} catch (error) {
  console.error('❌ Conversion failed:', error);
}
```

## Architecture

```
Frontend Upload → Controller → Service → Async Thread → LibreOffice → S3/Local → Response
     ↓              ↓           ↓            ↓             ↓           ↓         ↓
   File Validation  Direct      Non-blocking   Convert      Upload    File URL  Immediate
   Rate Limiting    Processing  Async Call     to PDF       Result    Generation Response
```

## Troubleshooting

1. **Server won't start**: Install LibreOffice
2. **Conversion fails**: Check LibreOffice installation and permissions
3. **S3 upload fails**: Check AWS credentials and bucket permissions
4. **Slow processing**: Check server resources and LibreOffice configuration
5. **Files not cleaned up**: Check temp directory permissions
