# Bibliography Module

This module handles bibliography items within chapters and modules. Bibliography items can be various types of educational resources like PDFs, videos, slides, case studies, images, and links.

## Features

- **CRUD Operations**: Create, read, update, and delete bibliography items
- **Multi-tenant Support**: Each school has its own bibliography data
- **Role-based Access**: Different permissions for different user roles
- **Filtering & Sorting**: Advanced filtering and sorting capabilities
- **Soft Delete**: Bibliography items are soft deleted (not permanently removed)
- **Sequence Management**: Ensures unique sequence numbers within chapters
- **Validation**: Comprehensive input validation and error handling

## Schema

The bibliography schema includes:

- `module_id`: Reference to the parent module
- `chapter_id`: Reference to the parent chapter
- `title`: Bibliography item title
- `description`: Optional description
- `type`: Bibliography type (PDF, VIDEO, SLIDE, CASE_STUDY, IMAGE, LINK)
- `mime_type`: MIME type of the file
- `path`: File path or URL
- `pages`: Number of pages (for documents)
- `duration`: Duration in minutes
- `sequence`: Order within the chapter
- `created_by`: User who created the item
- `created_by_role`: Role of the creator
- `deleted_at`: Soft delete timestamp

## API Endpoints

### Create Bibliography

- **POST** `/bibliography`
- **Roles**: PROFESSOR, SCHOOL_ADMIN
- **Body**: `CreateBibliographyDto`

### Get All Bibliography

- **GET** `/bibliography`
- **Roles**: SUPER_ADMIN, SCHOOL_ADMIN, PROFESSOR, STUDENT
- **Query Parameters**:
  - `module_id` (optional): Filter by module
  - `chapter_id` (optional): Filter by chapter
  - `text` (optional): Search in title and description
  - `type` (optional): Filter by bibliography type
  - `sortBy` (optional): Sort field
  - `sortOrder` (optional): Sort order (asc/desc)
  - `page` (optional): Page number
  - `limit` (optional): Items per page

### Get Bibliography by ID

- **GET** `/bibliography/:id`
- **Roles**: SUPER_ADMIN, SCHOOL_ADMIN, PROFESSOR, STUDENT

### Update Bibliography

- **PATCH** `/bibliography/:id`
- **Roles**: PROFESSOR, SCHOOL_ADMIN
- **Body**: `UpdateBibliographyDto`

### Delete Bibliography

- **DELETE** `/bibliography/:id`
- **Roles**: PROFESSOR, SCHOOL_ADMIN
- **Note**: Soft delete (sets deleted_at timestamp)

### Reorder Bibliography Items

- **POST** `/bibliography/reorder`
- **Roles**: PROFESSOR, SCHOOL_ADMIN
- **Body**: `ReorderBibliographyItemsDto`
- **Note**: Reorders bibliography items within the same chapter

## Bibliography Types

- **PDF**: Document files
- **VIDEO**: Video files
- **SLIDE**: Presentation slides
- **CASE_STUDY**: Case study materials
- **IMAGE**: Image files
- **LINK**: External links

## Validation Rules

- Module and chapter must exist and be valid
- Chapter must belong to the specified module
- Sequence numbers are automatically assigned (use reorder endpoint to change order)
- Duration must be at least 1 minute
- Pages must be at least 1 (if provided)
- All required fields must be provided

## Error Handling

- **400 Bad Request**: Invalid input data
- **404 Not Found**: Module, chapter, or bibliography not found
- **409 Conflict**: Sequence number already exists in chapter

## Usage Examples

### Create a PDF bibliography

```json
{
  "module_id": "507f1f77bcf86cd799439011",
  "chapter_id": "507f1f77bcf86cd799439012",
  "title": "Introduction to Psychology",
  "description": "Comprehensive introduction to psychological concepts",
  "type": "PDF",
  "mime_type": "application/pdf",
  "path": "/uploads/bibliography/intro-psychology.pdf",
  "pages": 25,
  "duration": 45
}
```

### Create a video bibliography

```json
{
  "module_id": "507f1f77bcf86cd799439011",
  "chapter_id": "507f1f77bcf86cd799439012",
  "title": "Cognitive Development Video",
  "description": "Video explaining Piaget's theory",
  "type": "VIDEO",
  "mime_type": "video/mp4",
  "path": "/uploads/bibliography/cognitive-development.mp4",
  "duration": 30
}
```

### Reorder bibliography items

```json
{
  "bibliography_items": [
    {
      "bibliography_id": "507f1f77bcf86cd799439011",
      "new_sequence": 1
    },
    {
      "bibliography_id": "507f1f77bcf86cd799439012",
      "new_sequence": 2
    },
    {
      "bibliography_id": "507f1f77bcf86cd799439013",
      "new_sequence": 3
    }
  ]
}
```

## Database Indexes

- Compound index on `chapter_id` and `sequence` (unique)
- Index on `module_id`
- Index on `chapter_id`
- Index on `created_by`

## Security

- JWT authentication required for all endpoints
- Role-based access control
- Input validation and sanitization
- Soft delete prevents data loss
- Tenant isolation ensures data privacy
