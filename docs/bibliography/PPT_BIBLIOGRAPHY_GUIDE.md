# PowerPoint Bibliography with Anchor Tags

This guide explains how to use the new PowerPoint processing functionality in the bibliography module, which allows you to upload PowerPoint files and automatically create anchor tags for each slide.

## Overview

The PowerPoint bibliography system integrates with your existing bibliography and anchor tag modules to:

1. **Parse PowerPoint files** (.pptx, .ppt) and extract slide content
2. **Create bibliography items** with PowerPoint type
3. **Generate anchor points** for each slide automatically
4. **Store slide data** in a dedicated collection for easy access
5. **Integrate with existing anchor tag system** for quiz creation

## Features

- **Automatic slide parsing**: Extracts text, styling, and metadata from PowerPoint files
- **Slide-based anchor points**: Creates anchor tags for each slide with quiz integration
- **Content extraction**: Captures slide titles, text content, notes, and formatting
- **Metadata extraction**: Retrieves presentation title, author, creation date, etc.
- **Multi-tenant support**: Works with your existing tenant database architecture
- **Role-based access**: Professors and school admins can upload, students can view

## API Endpoints

### 1. Upload PowerPoint File

**POST** `/bibliography/ppt/upload`

Upload a PowerPoint file and automatically process it to create bibliography with anchor points.

**Request:**

```http
POST /bibliography/ppt/upload
Content-Type: multipart/form-data

file: [PowerPoint file]
module_id: "507f1f77bcf86cd799439011"
chapter_id: "507f1f77bcf86cd799439012"
title: "Introduction to Psychology"
description: "Comprehensive introduction to psychological concepts"
```

**Response:**

```json
{
  "bibliography": {
    "_id": "507f1f77bcf86cd799439013",
    "title": "Introduction to Psychology",
    "type": "POWERPOINT",
    "mime_type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "duration": 20,
    "path": "/uploads/bibliography/intro-psychology.pptx"
  },
  "pptData": {
    "totalSlides": 10,
    "metadata": {
      "title": "Introduction to Psychology",
      "author": "Dr. Smith",
      "createdDate": "2024-01-15T10:00:00.000Z",
      "totalSlides": 10
    },
    "slides": [
      {
        "slideNumber": 1,
        "title": "Welcome to Psychology",
        "content": [...],
        "notes": "Introduction slide"
      }
    ]
  },
  "anchorPoints": [...],
  "message": "PowerPoint processed successfully. 10 slides found with 10 anchor points created."
}
```

### 2. Get PowerPoint Anchor Points

**GET** `/bibliography/ppt/:bibliographyId/anchor-points`

Retrieve all anchor points associated with a PowerPoint bibliography.

**Response:**

```json
{
  "bibliography": {...},
  "anchorTags": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "title": "Welcome to Psychology",
      "content_type": "SLIDE",
      "content_reference": "slide-1",
      "slide_number": 1,
      "quiz_group_id": "507f1f77bcf86cd799439015"
    }
  ],
  "totalAnchorPoints": 10
}
```

### 3. Add Anchor Point to Specific Slide

**POST** `/bibliography/ppt/:bibliographyId/slides/:slideNumber/anchor-points`

Create an anchor point for a specific slide.

**Request:**

```json
{
  "quiz_group_id": "507f1f77bcf86cd799439015",
  "description": "Students must complete this quiz before proceeding",
  "is_mandatory": true
}
```

### 4. Get Slide Information

**GET** `/bibliography/ppt/:bibliographyId/slides/:slideNumber`

Get detailed information about a specific slide and its anchor points.

## How It Works

### 1. File Upload Process

1. **File Validation**: Checks file type (.pptx, .ppt) and size (max 100MB)
2. **PowerPoint Parsing**: Uses JSZip and xml2js to extract slide content
3. **Content Extraction**: Parses each slide for text, styling, and metadata
4. **Bibliography Creation**: Creates bibliography item with PowerPoint type
5. **Data Storage**: Stores parsed slide data in dedicated collection
6. **Anchor Point Generation**: Automatically creates anchor points for each slide

### 2. Slide Content Extraction

The system extracts:

- **Text content**: All text from shapes and text boxes
- **Styling**: Font size, family, color, bold, italic, alignment
- **Position**: Shape positions on slides
- **Notes**: Speaker notes if available
- **Metadata**: Title, author, creation date, keywords

### 3. Anchor Point Creation

For each slide, the system creates:

- **Content reference**: `slide-{number}` format
- **Quiz integration**: Links to quiz groups for assessment
- **Slide metadata**: Title, content summary, slide number
- **Mandatory flags**: Can be set to require completion

## Database Schema

### PPT Data Collection

```typescript
interface PptData {
  bibliography_id: ObjectId; // Reference to bibliography
  totalSlides: number; // Total number of slides
  slides: PptSlide[]; // Array of slide data
  metadata: PptMetadata; // Presentation metadata
  slideMapping: Map<number, string>; // Slide number to ID mapping
  created_by: ObjectId; // User who uploaded
  created_at: Date; // Creation timestamp
  updated_at: Date; // Last update timestamp
}
```

### Slide Structure

```typescript
interface PptSlide {
  slideNumber: number; // 1-based slide number
  title: string; // Slide title
  content: PptSlideContent[]; // Slide content items
  notes: string; // Speaker notes
  layout: string; // Slide layout type
  slideId: string; // Unique slide identifier
}
```

## Integration with Existing Systems

### Bibliography Module

- Extends existing bibliography types with `POWERPOINT`
- Maintains compatibility with current bibliography operations
- Integrates with module/chapter structure

### Anchor Tag Module

- Uses existing anchor tag creation system
- Maintains quiz group relationships
- Supports student progress tracking

### Upload System

- Integrates with existing file upload infrastructure
- Supports S3 storage for PowerPoint files
- Maintains file type validation

## Usage Examples

### For Professors

1. **Upload PowerPoint**: Use the upload endpoint to process presentations
2. **Review Slides**: Check extracted content and metadata
3. **Customize Anchor Points**: Modify quiz assignments and requirements
4. **Monitor Progress**: Track student completion through anchor tag system

### For Students

1. **View Presentations**: Access PowerPoint content through bibliography
2. **Complete Quizzes**: Take quizzes at designated anchor points
3. **Track Progress**: Monitor completion status across slides
4. **Access Content**: View slide content and notes

## Configuration

### File Size Limits

- **Maximum file size**: 100MB
- **Supported formats**: .pptx, .ppt
- **Processing timeout**: 5 minutes

### Storage

- **PPT data**: Stored in tenant-specific collections
- **File storage**: Uses existing S3/upload infrastructure
- **Data retention**: Follows existing deletion policies

## Error Handling

The system handles various error scenarios:

- **Invalid file format**: Returns 400 for non-PowerPoint files
- **File too large**: Returns 400 for files exceeding size limit
- **Processing errors**: Returns 500 for parsing failures
- **Missing data**: Returns 404 for non-existent resources
- **Permission errors**: Returns 403 for insufficient access

## Performance Considerations

- **Large files**: Processing time scales with file size and slide count
- **Memory usage**: Files are processed in chunks to manage memory
- **Database queries**: Optimized with proper indexing
- **Caching**: Consider implementing Redis for frequently accessed data

## Security Features

- **File validation**: Strict MIME type checking
- **Size limits**: Prevents abuse through large file uploads
- **Role-based access**: Different permissions for different user types
- **Tenant isolation**: Data is properly segregated by school
- **Input sanitization**: All extracted content is sanitized

## Troubleshooting

### Common Issues

1. **File not processing**: Check file format and size
2. **Missing slides**: Verify PowerPoint file integrity
3. **Anchor points not created**: Check quiz group availability
4. **Permission errors**: Verify user role and school access

### Debug Information

Enable debug logging to see detailed processing information:

```typescript
// In your service
this.logger.debug(`Processing slide ${slideNumber}: ${slideData.title}`);
```

## Future Enhancements

Potential improvements for the system:

1. **Image extraction**: Capture and store slide images
2. **Animation support**: Extract slide transition information
3. **Template recognition**: Identify slide templates and layouts
4. **Content analysis**: AI-powered content categorization
5. **Collaborative editing**: Real-time slide annotation
6. **Version control**: Track changes across presentation versions

## Support

For issues or questions about the PowerPoint bibliography system:

1. Check the logs for detailed error information
2. Verify file format and size requirements
3. Ensure proper database connections and permissions
4. Review user role and school access settings
