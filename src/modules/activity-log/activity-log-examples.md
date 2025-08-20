# Activity Log Language Support Examples

This document shows how to use the new English and French language support in the Activity Log service.

## Creating Activity Logs with Language Support

### Option 1: String Description (Backward Compatible)

```typescript
// Single string description - will be converted to both languages
await activityLogService.createActivityLog({
  activity_type: ActivityTypeEnum.USER_LOGIN,
  description: 'User logged in successfully',
  performed_by: userId,
  performed_by_role: RoleEnum.STUDENT,
  // ... other fields
});
```

### Option 2: Language-Specific Descriptions

```typescript
// Language-specific descriptions
await activityLogService.createActivityLog({
  activity_type: ActivityTypeEnum.USER_LOGIN,
  description: {
    en: 'User logged in successfully',
    fr: "L'utilisateur s'est connecté avec succès",
  },
  performed_by: userId,
  performed_by_role: RoleEnum.STUDENT,
  // ... other fields
});
```

### Option 3: Auto-Generated Descriptions (NEW!)

```typescript
// Automatically generate descriptions in both languages
await activityLogService.createActivityLogWithGeneratedDescription(
  ActivityTypeEnum.USER_LOGIN,
  {
    performed_by: userId,
    performed_by_role: RoleEnum.STUDENT,
    school_id: schoolId,
    is_success: true, // Will generate "User logged in successfully"
    // ... other context
  },
);

// For failed operations
await activityLogService.createActivityLogWithGeneratedDescription(
  ActivityTypeEnum.USER_LOGIN,
  {
    performed_by: userId,
    performed_by_role: RoleEnum.STUDENT,
    school_id: schoolId,
    is_success: false, // Will generate "User logged in failed"
    error_message: 'Invalid credentials',
    // ... other context
  },
);

// For module activities
await activityLogService.createActivityLogWithGeneratedDescription(
  ActivityTypeEnum.MODULE_ACCESSED,
  {
    performed_by: studentId,
    performed_by_role: RoleEnum.STUDENT,
    module_name: 'Introduction to Mathematics',
    module_id: moduleId,
    school_id: schoolId,
    is_success: true, // Will generate "User accessed module: Introduction to Mathematics successfully"
  },
);

// For chapter activities
await activityLogService.createActivityLogWithGeneratedDescription(
  ActivityTypeEnum.CHAPTER_ACCESSED,
  {
    performed_by: studentId,
    performed_by_role: RoleEnum.STUDENT,
    module_name: 'Introduction to Mathematics',
    chapter_name: 'Basic Algebra',
    module_id: moduleId,
    chapter_id: chapterId,
    school_id: schoolId,
  },
);
```

### Option 4: Generate Description Only

```typescript
// Just generate the description without creating the log
const descriptions = await activityLogService.generateDescription(
  ActivityTypeEnum.MODULE_CREATED,
  {
    performed_by: professorId,
    performed_by_role: RoleEnum.PROFESSOR,
    module_name: 'Advanced Calculus',
    school_id: schoolId,
  },
);

console.log(descriptions.en); // "John Doe created module: Advanced Calculus"
console.log(descriptions.fr); // "John Doe a créé le module: Advanced Calculus"
```

## Response Format

When retrieving activity logs, you'll now get both language versions:

```typescript
// Response structure
{
  id: "log_id",
  timestamp: "2024-01-01T00:00:00.000Z",
  activity_type: "USER_LOGIN",
  category: "AUTHENTICATION",
  level: "INFO",
  description_en: "User logged in successfully",
  description_fr: "L'utilisateur s'est connecté avec succès",
  performed_by: { /* user details */ },
  // ... other fields
}
```

## Search Functionality

The search now works across both languages:

```typescript
// Search will find matches in both English and French descriptions
const results = await activityLogService.getActivityLogs(currentUser, {
  search: 'logged in', // Will find both "logged in" and "connecté"
  // ... other filters
});
```

## Supported Activity Types

The system automatically generates descriptions for these activity types:

- **USER_LOGIN** / **USER_LOGOUT**
- **MODULE_ACCESSED** / **MODULE_CREATED** / **MODULE_UPDATED** / **MODULE_DELETED**
- **CHAPTER_ACCESSED** / **CHAPTER_CREATED** / **CHAPTER_UPDATED** / **CHAPTER_DELETED**
- **QUIZ_COMPLETED**
- **USER_CREATED** / **USER_UPDATED** / **USER_DELETED**
- **SCHOOL_CREATED** / **SCHOOL_UPDATED** / **SCHOOL_DELETED**
- **PROFESSOR_ASSIGNED** / **PROFESSOR_UNASSIGNED**
- **STUDENT_ENROLLED** / **STUDENT_UNENROLLED**
- **FILE_UPLOADED** / **FILE_DELETED**
- **SETTINGS_UPDATED**
- **PASSWORD_CHANGED**
- **EMAIL_VERIFIED**
- **LOGIN_FAILED**
- **PERMISSION_DENIED**
- **SYSTEM_ERROR**

## Context Variables

The system automatically uses these context variables to generate meaningful descriptions:

- `performed_by` - User performing the action
- `target_user_id` - Target user (if applicable)
- `school_name` - School name
- `module_name` - Module name
- `chapter_name` - Chapter name
- `action` - Custom action description

## Migration Notes

- **Backward Compatible**: Existing string descriptions will continue to work
- **Auto-Conversion**: String descriptions are automatically converted to language objects
- **Database**: The description field now supports both string and object formats
- **Search**: Enhanced search functionality across both languages
- **Auto-Generation**: New method automatically creates descriptions in both languages

## Best Practices

1. **Use `createActivityLogWithGeneratedDescription`** for new activity logs
2. **Always provide context** for meaningful descriptions
3. **Test both languages** in your development environment
4. **Use consistent terminology** across your application
5. **Consider cultural context** when reviewing generated translations

## Error Handling

The system includes fallback mechanisms:

- If translation fails, uses simple fallback descriptions
- If user details can't be fetched, uses generic "User" placeholder
- If context is missing, uses activity type as fallback
- All errors are logged but don't break the main application flow

## Expected Database Structure

When using the new system, your activity logs will be stored in the database with descriptions in both languages, similar to how notifications work:

### Database Document Example:

```json
{
  "_id": {
    "$oid": "689abad2d79d2f3eef03e6ea"
  },
  "activity_type": "USER_LOGIN",
  "category": "AUTHENTICATION",
  "level": "INFO",
  "description": {
    "en": "John Doe logged in successfully",
    "fr": "John Doe s'est connecté avec succès"
  },
  "performed_by": {
    "$oid": "686b76d4ff4d893850b06644"
  },
  "performed_by_role": "PROFESSOR",
  "school_id": {
    "$oid": "686b5e79e4a3c29b94ac1341"
  },
  "school_name": "Anirudh International School",
  "is_success": true,
  "status": "SUCCESS",
  "created_at": {
    "$date": "2025-08-20T08:36:25.759Z"
  },
  "updated_at": {
    "$date": "2025-08-20T08:36:25.759Z"
  }
}
```

### Failed Operation Example:

```json
{
  "description": {
    "en": "John Doe logged in failed",
    "fr": "John Doe s'est connecté sans succès"
  },
  "is_success": false,
  "status": "ERROR",
  "error_message": "Invalid credentials"
}
```

## Testing the New System

To test if the multi-language descriptions are working:

1. **Check the database directly** - Look for the `description` field to contain an object with `en` and `fr` keys
2. **Use the API endpoints** - The responses should now include `description_en` and `description_fr` fields
3. **Monitor the logs** - Look for successful creation of activity logs with generated descriptions

## Troubleshooting

If descriptions are still showing as strings instead of multi-language objects:

1. **Check the interceptor** - Ensure it's using `createActivityLogWithGeneratedDescription`
2. **Verify the schema** - Make sure the database schema supports `Object` type for description
3. **Check the translation service** - Ensure it's properly injected and working
4. **Monitor the logs** - Look for any errors in description generation
