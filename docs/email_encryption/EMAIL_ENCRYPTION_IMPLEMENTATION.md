# Email Encryption Implementation

## Overview

This project now includes comprehensive email encryption and decryption functionality to ensure that all email addresses stored in the database are encrypted while maintaining seamless operation with the frontend.

## Features

- **Automatic Encryption**: All email addresses are automatically encrypted before being stored in the database
- **Automatic Decryption**: All email addresses are automatically decrypted when retrieved from the database
- **Transparent Operation**: The frontend continues to receive and send raw email addresses
- **Secure Storage**: Email addresses are stored in encrypted format using AES-256-GCM encryption
- **Backward Compatibility**: The system can handle both encrypted and unencrypted emails during migration

## Environment Variables

Add the following environment variable to your `.env` file:

```bash
EMAIL_ENCRYPTION_KEY=your-secure-encryption-key-here
```

**Important**: Use a strong, unique encryption key. This key should be at least 32 characters long and should be kept secure.

## Implementation Details

### 1. Email Encryption Utility (`src/common/utils/email-encryption.util.ts`)

The core encryption utility provides:
- `encryptEmail()`: Encrypts a raw email address
- `decryptEmail()`: Decrypts an encrypted email address
- `isEncrypted()`: Checks if a string is already encrypted
- `encryptIfNotEncrypted()`: Conditionally encrypts if not already encrypted
- `decryptIfEncrypted()`: Conditionally decrypts if encrypted

### 2. Email Encryption Service (`src/common/services/email-encryption.service.ts`)

A service layer that provides:
- `encryptEmailFields()`: Encrypts email fields in documents before database operations
- `decryptEmailFields()`: Decrypts email fields in documents after retrieval
- `encryptEmailInQuery()`: Encrypts emails in database queries
- `encryptEmailInUpdate()`: Encrypts emails in update operations

### 3. Updated Services

The following services have been updated to use email encryption:

#### Student Service (`src/modules/student/student.service.ts`)
- **createStudent()**: Encrypts email before storing
- **updateStudent()**: Encrypts email in queries and updates
- **bulkCreateStudents()**: Encrypts emails in bulk operations

#### Auth Service (`src/modules/auth/auth.service.ts`)
- **superAdminLogin()**: Encrypts email in login queries
- **schoolAdminLogin()**: Encrypts email in login queries
- **studentLogin()**: Encrypts email in login queries
- **forgotPassword()**: Encrypts email in password reset queries

#### JWT Strategy (`src/common/strategies/jwt.strategy.ts`)
- **validate()**: Encrypts email in token validation queries
- **validateStudentInTenant()**: Encrypts email in student validation

#### School Admin Service (`src/modules/school-admin/school-admin.service.ts`)
- **createSchoolAdmin()**: Encrypts both user and school emails

#### Professor Service (`src/modules/professor/professor.service.ts`)
- **createProfessor()**: Encrypts email before storing

## Database Operations

### Before Storage/Update
All email addresses are automatically encrypted before being stored in the database. This includes:
- Creating new users (students, professors, school admins)
- Updating existing user emails
- Bulk operations

### After Retrieval
All email addresses are automatically decrypted when retrieved from the database, ensuring the frontend receives raw email addresses.

### Query Operations
When searching for users by email, the system automatically encrypts the search term before querying the database.

## Migration Strategy

The implementation is designed to handle both encrypted and unencrypted emails during the transition period:

1. **New Records**: All new records will have encrypted emails
2. **Existing Records**: Can be gradually migrated to encrypted format
3. **Queries**: The system can handle both formats during migration

## Security Considerations

1. **Encryption Key**: Store the encryption key securely and never commit it to version control
2. **Key Rotation**: Plan for key rotation strategies
3. **Backup**: Ensure encrypted data is properly backed up
4. **Access Control**: Limit access to the encryption service

## Testing

To test the email encryption:

1. Create a new user with an email address
2. Check the database to verify the email is stored in encrypted format
3. Retrieve the user and verify the email is returned in raw format
4. Search for the user by email and verify it works correctly

## Troubleshooting

### Common Issues

1. **Missing Environment Variable**: Ensure `EMAIL_ENCRYPTION_KEY` is set
2. **Invalid Key**: Use a strong, unique encryption key
3. **Migration Issues**: The system handles both encrypted and unencrypted emails

### Debug Mode

To debug encryption issues, check the console logs for encryption/decryption errors.

## Future Enhancements

1. **Key Rotation**: Implement automatic key rotation
2. **Performance**: Optimize encryption/decryption for large datasets
3. **Audit Logging**: Add encryption operation logging
4. **Compression**: Consider compressing encrypted data for storage efficiency

## API Compatibility

All existing API endpoints continue to work exactly as before. The frontend does not need any changes to handle the encrypted emails, as the encryption/decryption is completely transparent.
