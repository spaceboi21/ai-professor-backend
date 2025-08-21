# Bulk Student Upload

This feature allows school administrators and super admins to upload multiple students at once using a CSV file.

## API Endpoint

```
POST /api/students/bulk
```

**Authentication:** Required (JWT Bearer Token)
**Authorization:** SUPER_ADMIN, SCHOOL_ADMIN roles only

## Request Format

The request must be a `multipart/form-data` with a CSV file.

### Headers

- `Authorization: Bearer <jwt_token>`
- `Content-Type: multipart/form-data`

### Body

- `file`: CSV file containing student data

## CSV Format

The CSV file should have the following columns:

| Column     | Required    | Description                  | Example                    | Notes                                                  |
| ---------- | ----------- | ---------------------------- | -------------------------- | ------------------------------------------------------ |
| first_name | Yes         | Student's first name         | "John"                     | Required for all users                                 |
| last_name  | No          | Student's last name          | "Doe"                      | Optional                                               |
| email      | Yes         | Student's email address      | "john.doe@student.com"     | Required for all users                                 |
| school_id  | Conditional | School ID (MongoDB ObjectId) | "60d21b4667d0d8992e610c85" | Required for SUPER_ADMIN, not allowed for SCHOOL_ADMIN |

### Role-Specific Requirements

#### For SCHOOL_ADMIN:

- **school_id column**: Should NOT be included in CSV
- **Behavior**: All students will be created for the school admin's own school
- **Example CSV**:

```csv
first_name,last_name,email
John,Doe,john.doe@student.com
Jane,Smith,jane.smith@student.com
```

#### For SUPER_ADMIN:

- **school_id column**: Should be included in CSV (unless super admin has a default school_id)
- **Behavior**: Can create students for any school by specifying school_id
- **Example CSV**:

```csv
first_name,last_name,email,school_id
John,Doe,john.doe@student.com,60d21b4667d0d8992e610c85
Jane,Smith,jane.smith@student.com,60d21b4667d0d8992e610c86
```

### Sample CSV Content

#### For School Admin:

```csv
first_name,last_name,email
John,Doe,john.doe@student.com
Jane,Smith,jane.smith@student.com
Mike,Johnson,mike.johnson@student.com
Sarah,,sarah@student.com
```

#### For Super Admin:

```csv
first_name,last_name,email,school_id
John,Doe,john.doe@student.com,60d21b4667d0d8992e610c85
Jane,Smith,jane.smith@student.com,60d21b4667d0d8992e610c85
Mike,Johnson,mike.johnson@student.com,60d21b4667d0d8992e610c86
Sarah,Williams,sarah.williams@student.com,60d21b4667d0d8992e610c85
```

## Response Format

```json
{
  "message": "Bulk student creation completed",
  "data": {
    "success": [
      {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@student.com",
        "school_id": "60d21b4667d0d8992e610c85"
      }
    ],
    "failed": [
      {
        "row": {
          "first_name": "Jane",
          "last_name": "Smith",
          "email": "jane.smith@student.com",
          "school_id": "60d21b4667d0d8992e610c85"
        },
        "error": "Email already exists in the system"
      }
    ],
    "total": 4,
    "successCount": 1,
    "failedCount": 3
  }
}
```

## Validation Rules

1. **Required Fields**: `first_name` and `email` are required for all users
2. **Email Format**: Must be a valid email address
3. **Email Uniqueness**: Email must not exist in the system (central users, global students, or tenant students)
4. **CSV Format**: Only CSV files are allowed (5MB max)
5. **Duplicate Emails**: Duplicate emails within the CSV file are not allowed
6. **Role-Specific Rules**:
   - **SCHOOL_ADMIN**: Cannot include school_id in CSV, students created for their school only
   - **SUPER_ADMIN**: Must provide school_id in CSV (unless they have a default school_id)
7. **School Validation**: School ID must exist and be valid

## Process Flow

1. **File Validation**: Check file type and size
2. **CSV Parsing**: Parse CSV content and validate format
3. **Role-Based Validation**: Check role-specific requirements (school_id handling)
4. **Data Validation**: Validate each row for required fields and email format
5. **Duplicate Check**: Check for duplicates within CSV
6. **System Check**: Check for existing emails in all databases
7. **School Validation**: Validate school exists and user has access
8. **Student Creation**: Create students one by one with error handling
9. **Email Sending**: Send credentials email to each successfully created student
10. **Result Compilation**: Return detailed success/failure report

## Error Handling

The system will:

- Continue processing even if some students fail to create
- Provide detailed error messages for each failed row
- Return a comprehensive report of successes and failures
- Send credentials emails only to successfully created students
- Validate school access based on user role

## Security Features

- File size limit: 5MB
- File type validation: Only CSV files
- Email format validation
- Duplicate email prevention
- Role-based access control
- School-specific access validation

## Example Usage

### cURL

```bash
curl -X POST \
  http://localhost:5000/api/students/bulk \
  -H "Authorization: Bearer <your_jwt_token>" \
  -F "file=@students.csv"
```

### JavaScript/Fetch

```javascript
const formData = new FormData();
formData.append('file', csvFile);

const response = await fetch('/api/students/bulk', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer ' + token,
  },
  body: formData,
});

const result = await response.json();
```

## Notes

- The system automatically generates strong passwords for each student
- Student codes are generated using the school name and timestamp
- All emails are converted to lowercase
- Failed students are logged with specific error reasons
- The process is designed to be idempotent - running the same CSV multiple times will only create new students
- School admins can only create students for their own school
- Super admins can create students for any school by specifying the school_id
