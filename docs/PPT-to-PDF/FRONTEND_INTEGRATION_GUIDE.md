# 🎨 Frontend Integration Guide - PPT to PDF API

## 🎯 Quick Implementation

### 1. File Type Detection Function

```typescript
// utils/fileHelpers.ts
export function isPowerPointFile(file: File): boolean {
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

### 2. API Service Functions

```typescript
// services/conversionApi.ts
export interface ConversionResponse {
  success: boolean;
  message: string;
  fileName: string; // Primary PDF filename (for database storage)
  originalFileName: string; // Original PPT filename (for archival)
  slideCount: number;
  fileSize: number;
  originalFileSize: number;
  conversionMethod: string;
  conversionTime: number;
  fileUrl: string; // Primary PDF URL (for database storage)
  originalFileUrl: string; // Original PPT URL (for reference)
}

export async function convertPowerPointToPdf(
  file: File, 
  authToken: string
): Promise<ConversionResponse> {
  const formData = new FormData();
  formData.append('pptFile', file);

  const response = await fetch('/api/conversion/convert', {
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

  return response.json();
}

// Your existing upload function
export async function uploadUsingExistingFlow(
  file: File, 
  authToken: string
): Promise<any> {
  // Your existing implementation
  // Could be direct S3 upload, URL generation, etc.
}
```

### 3. Main Upload Handler

```typescript
// services/uploadService.ts
import { isPowerPointFile } from '../utils/fileHelpers';
import { convertPowerPointToPdf, uploadUsingExistingFlow } from './conversionApi';

export async function handleFileUpload(file: File, authToken: string) {
  try {
    if (isPowerPointFile(file)) {
      console.log('📄 PowerPoint detected - using conversion API');
      const result = await convertPowerPointToPdf(file, authToken);
      
      return {
        type: 'conversion',
        success: true,
        data: result
      };
    } else {
      console.log('📎 Other file - using existing flow');
      const result = await uploadUsingExistingFlow(file, authToken);
      
      return {
        type: 'existing',
        success: true,
        data: result
      };
    }
  } catch (error) {
    return {
      type: 'error',
      success: false,
      error: error.message
    };
  }
}
```

## ⚛️ React Implementation

### Hook for File Upload

```tsx
// hooks/useFileUpload.ts
import { useState } from 'react';
import { handleFileUpload } from '../services/uploadService';

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File, authToken: string) => {
    setUploading(true);
    setError(null);
    setResult(null);
    setProgress('Preparing upload...');

    try {
      if (isPowerPointFile(file)) {
        setProgress('Converting PowerPoint to PDF...');
      } else {
        setProgress('Uploading file...');
      }

      const uploadResult = await handleFileUpload(file, authToken);
      
      if (uploadResult.success) {
        setResult(uploadResult);
        setProgress('');
      } else {
        setError(uploadResult.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setProgress('');
    }
  };

  return {
    uploading,
    progress,
    result,
    error,
    uploadFile,
    reset: () => {
      setResult(null);
      setError(null);
      setProgress('');
    }
  };
};
```

### React Component

```tsx
// components/FileUploader.tsx
import React from 'react';
import { useFileUpload } from '../hooks/useFileUpload';

interface FileUploaderProps {
  authToken: string;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  authToken,
  onSuccess,
  onError
}) => {
  const { uploading, progress, result, error, uploadFile, reset } = useFileUpload();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await uploadFile(file, authToken);
  };

  React.useEffect(() => {
    if (result?.success) {
      onSuccess?.(result);
    }
  }, [result, onSuccess]);

  React.useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  return (
    <div className="file-uploader">
      <input
        type="file"
        onChange={handleFileChange}
        disabled={uploading}
        accept=".ppt,.pptx,.pdf,.mp4,.avi,.mov,.doc,.docx,.xls,.xlsx,.jpg,.png"
      />
      
      {uploading && (
        <div className="upload-status">
          <div className="spinner" />
          <span>{progress}</span>
        </div>
      )}

      {result?.success && (
        <div className="upload-success">
          {result.type === 'conversion' ? (
            <div>
              ✅ Converted to PDF successfully!
              <br />
              📄 PDF: {result.data.fileName}
              <br />
              📁 Original: {result.data.originalFileName}
              <br />
              📊 Slides: {result.data.slideCount}
              <br />
              ⚡ Time: {result.data.conversionTime}ms
              <br />
              <a href={result.data.fileUrl} target="_blank" rel="noopener noreferrer">
                🔗 Download PDF
              </a>
              {' | '}
              <a href={result.data.originalFileUrl} target="_blank" rel="noopener noreferrer">
                📎 View Original
              </a>
              <br />
              <small>💾 Primary URL for database: {result.data.fileUrl}</small>
            </div>
          ) : (
            <div>
              ✅ File uploaded successfully!
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="upload-error">
          ❌ {error}
        </div>
      )}
    </div>
  );
};
```

## 🟢 Vue.js Implementation

### Vue Composition API

```vue
<!-- composables/useFileUpload.ts -->
<script lang="ts">
import { ref } from 'vue';
import { handleFileUpload } from '../services/uploadService';

export function useFileUpload() {
  const uploading = ref(false);
  const progress = ref('');
  const result = ref(null);
  const error = ref(null);

  const uploadFile = async (file: File, authToken: string) => {
    uploading.value = true;
    error.value = null;
    result.value = null;
    progress.value = 'Preparing upload...';

    try {
      if (isPowerPointFile(file)) {
        progress.value = 'Converting PowerPoint to PDF...';
      } else {
        progress.value = 'Uploading file...';
      }

      const uploadResult = await handleFileUpload(file, authToken);
      
      if (uploadResult.success) {
        result.value = uploadResult;
        progress.value = '';
      } else {
        error.value = uploadResult.error;
      }
    } catch (err) {
      error.value = err.message;
    } finally {
      uploading.value = false;
      progress.value = '';
    }
  };

  const reset = () => {
    result.value = null;
    error.value = null;
    progress.value = '';
  };

  return {
    uploading,
    progress,
    result,
    error,
    uploadFile,
    reset
  };
}
</script>
```

### Vue Component

```vue
<!-- components/FileUploader.vue -->
<template>
  <div class="file-uploader">
    <input
      type="file"
      @change="handleFileChange"
      :disabled="uploading"
      accept=".ppt,.pptx,.pdf,.mp4,.avi,.mov,.doc,.docx,.xls,.xlsx,.jpg,.png"
    />
    
    <div v-if="uploading" class="upload-status">
      <div class="spinner"></div>
      <span>{{ progress }}</span>
    </div>

    <div v-if="result?.success" class="upload-success">
      <div v-if="result.type === 'conversion'">
        ✅ Converted to PDF successfully!
        <br />
        📄 PDF: {{ result.data.fileName }}
        <br />
        📁 Original: {{ result.data.originalFileName }}
        <br />
        📊 Slides: {{ result.data.slideCount }}
        <br />
        ⚡ Time: {{ result.data.conversionTime }}ms
        <br />
        <a :href="result.data.fileUrl" target="_blank" rel="noopener noreferrer">
          🔗 Download PDF
        </a>
        |
        <a :href="result.data.originalFileUrl" target="_blank" rel="noopener noreferrer">
          📎 View Original
        </a>
        <br />
        <small>💾 Primary URL for database: {{ result.data.fileUrl }}</small>
      </div>
      <div v-else>
        ✅ File uploaded successfully!
      </div>
    </div>

    <div v-if="error" class="upload-error">
      ❌ {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFileUpload } from '../composables/useFileUpload';

const props = defineProps<{
  authToken: string;
}>();

const emit = defineEmits<{
  success: [result: any];
  error: [error: string];
}>();

const { uploading, progress, result, error, uploadFile, reset } = useFileUpload();

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  await uploadFile(file, props.authToken);
};

watch(result, (newResult) => {
  if (newResult?.success) {
    emit('success', newResult);
  }
});

watch(error, (newError) => {
  if (newError) {
    emit('error', newError);
  }
});
</script>
```

## 📱 Angular Implementation

### Service

```typescript
// services/file-upload.service.ts
import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { handleFileUpload } from './upload-service';

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  uploadFile(file: File, authToken: string): Observable<any> {
    return from(handleFileUpload(file, authToken));
  }
}
```

### Component

```typescript
// components/file-uploader.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FileUploadService } from '../services/file-upload.service';

@Component({
  selector: 'app-file-uploader',
  template: `
    <div class="file-uploader">
      <input
        type="file"
        (change)="onFileChange($event)"
        [disabled]="uploading"
        accept=".ppt,.pptx,.pdf,.mp4,.avi,.mov,.doc,.docx,.xls,.xlsx,.jpg,.png"
      />
      
      <div *ngIf="uploading" class="upload-status">
        <div class="spinner"></div>
        <span>{{ progress }}</span>
      </div>

      <div *ngIf="result?.success" class="upload-success">
        <div *ngIf="result.type === 'conversion'">
          ✅ Converted to PDF successfully!
          <br />
          📄 PDF: {{ result.data.fileName }}
          <br />
          📁 Original: {{ result.data.originalFileName }}
          <br />
          📊 Slides: {{ result.data.slideCount }}
          <br />
          ⚡ Time: {{ result.data.conversionTime }}ms
          <br />
          <a [href]="result.data.fileUrl" target="_blank" rel="noopener noreferrer">
            🔗 Download PDF
          </a>
          |
          <a [href]="result.data.originalFileUrl" target="_blank" rel="noopener noreferrer">
            📎 View Original
          </a>
          <br />
          <small>💾 Primary URL for database: {{ result.data.fileUrl }}</small>
        </div>
        <div *ngIf="result.type !== 'conversion'">
          ✅ File uploaded successfully!
        </div>
      </div>

      <div *ngIf="error" class="upload-error">
        ❌ {{ error }}
      </div>
    </div>
  `
})
export class FileUploaderComponent {
  @Input() authToken!: string;
  @Output() success = new EventEmitter<any>();
  @Output() error = new EventEmitter<string>();

  uploading = false;
  progress = '';
  result: any = null;
  errorMessage: string | null = null;

  constructor(private fileUploadService: FileUploadService) {}

  async onFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    this.uploading = true;
    this.errorMessage = null;
    this.result = null;
    this.progress = 'Preparing upload...';

    try {
      const uploadResult = await this.fileUploadService.uploadFile(file, this.authToken).toPromise();
      
      if (uploadResult.success) {
        this.result = uploadResult;
        this.success.emit(uploadResult);
      } else {
        this.errorMessage = uploadResult.error;
        this.error.emit(uploadResult.error);
      }
    } catch (err) {
      this.errorMessage = err.message;
      this.error.emit(err.message);
    } finally {
      this.uploading = false;
      this.progress = '';
    }
  }
}
```

## 🎨 CSS Styles

```css
/* styles/file-uploader.css */
.file-uploader {
  max-width: 500px;
  margin: 20px auto;
  padding: 20px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  text-align: center;
}

.file-uploader input[type="file"] {
  width: 100%;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.upload-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 15px;
  background-color: #f0f8ff;
  border-radius: 4px;
  margin: 10px 0;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.upload-success {
  padding: 15px;
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
  border-radius: 4px;
  margin: 10px 0;
}

.upload-error {
  padding: 15px;
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  margin: 10px 0;
}

.upload-success a {
  color: #007bff;
  text-decoration: none;
  font-weight: bold;
}

.upload-success a:hover {
  text-decoration: underline;
}
```

## 🧪 Testing Your Integration

### 1. Test File Detection

```typescript
// Test different file types
const testFiles = [
  { name: 'presentation.pptx', type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  { name: 'slideshow.ppt', type: 'application/vnd.ms-powerpoint' },
  { name: 'document.pdf', type: 'application/pdf' },
  { name: 'video.mp4', type: 'video/mp4' }
];

testFiles.forEach(fileData => {
  const file = new File([''], fileData.name, { type: fileData.type });
  const isPPT = isPowerPointFile(file);
  console.log(`${fileData.name}: ${isPPT ? '→ Conversion API' : '→ Existing Flow'}`);
});
```

### 2. Mock Testing

```typescript
// Mock the API for testing
const mockConversionResponse = {
  success: true,
  message: "Successfully converted 5 slides to PDF",
  fileName: "test-presentation-1234567890.pdf",
  slideCount: 5,
  fileSize: 1024000,
  originalFileSize: 2048000,
  conversionMethod: "LibreOffice-Direct (Ultra Fast)",
  conversionTime: 2500,
  fileUrl: "http://localhost:3000/uploads/converted-pdfs/test-presentation-1234567890.pdf"
};

// Use in development
if (process.env.NODE_ENV === 'development') {
  // Mock the conversion API
  window.mockConversion = () => mockConversionResponse;
}
```

---

## ✅ Integration Checklist

- [ ] **Copy file detection function** to your utils
- [ ] **Add conversion API service** functions
- [ ] **Update your existing upload handler** with routing logic
- [ ] **Test with PPT/PPTX files** (should use conversion API)
- [ ] **Test with other files** (should use existing flow)
- [ ] **Handle errors appropriately**
- [ ] **Add loading states and progress indicators**
- [ ] **Style the components** to match your design
- [ ] **Test in different browsers**
- [ ] **Verify mobile responsiveness**

This guide provides everything you need to integrate the PPT to PDF conversion API into your frontend while maintaining your existing file upload flow for other file types! 🚀
