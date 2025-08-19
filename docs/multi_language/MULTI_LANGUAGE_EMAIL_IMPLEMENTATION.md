# Multi-Language Email Implementation

## Overview

This implementation adds multi-language support for email templates in the AI Professor backend. The system now supports English and French email templates, with French as the default language. Additionally, portal URLs are now language-aware and automatically include the appropriate language suffix.

## Changes Made

### 1. Email Templates

#### Created French Templates:

- `src/mail/templates/credentials-email-fr.hbs` - French version of credentials email
- `src/mail/templates/forgot-password-email-fr.hbs` - French version of password reset email

#### Template Features:

- All text translated to French
- Maintains same styling and layout as English versions
- Uses French email subjects and greetings
- Includes security notices in French

### 2. Mail Service Updates

#### `src/mail/mail.service.ts`:

- Added `getTemplateName()` method to select appropriate template based on language
- Added `getEmailSubject()` method to translate email subjects
- Added `getPortalUrl()` method to generate language-specific portal URLs
- Updated `sendPasswordResetEmail()` to accept `preferredLanguage` parameter
- Updated `sendCredentialsEmail()` to accept `preferredLanguage` parameter
- Updated queue methods to handle language preference

#### Key Methods:

```typescript
private getTemplateName(baseTemplate: string, language: LanguageEnum): string
private getEmailSubject(baseSubject: string, language: LanguageEnum): string
private getPortalUrl(role: RoleEnum, language: LanguageEnum): string
```

### 3. Language-Specific Portal URLs

#### Portal URL Generation:

The system now automatically generates language-specific portal URLs based on user role and language preference:

- **Students**: `http://23.239.4.160:3000/fr/login` (French) or `http://23.239.4.160:3000/en/login` (English)
- **Professors/School Admins**: `http://23.239.4.160:3001/fr/login` (French) or `http://23.239.4.160:3001/en/login` (English)
- **Super Admins**: `http://23.239.4.160:3000/fr/login` (French) or `http://23.239.4.160:3000/en/login` (English)

#### URL Logic:

```typescript
private getPortalUrl(role: RoleEnum, language: LanguageEnum): string {
  let baseUrl: string;

  if (role === RoleEnum.STUDENT) {
    baseUrl = this.configService.get<string>('STUDENT_PORTAL_URL') || 'http://23.239.4.160:3000';
  } else if (role === RoleEnum.PROFESSOR || role === RoleEnum.SCHOOL_ADMIN) {
    baseUrl = this.configService.get<string>('SCHOOL_PORTAL_URL') || 'http://23.239.4.160:3001';
  } else {
    baseUrl = this.configService.get<string>('ADMIN_PORTAL_URL') || 'http://23.239.4.160:3000';
  }

  const languageSuffix = language === LanguageEnum.FRENCH ? '/fr' : '/en';
  return `${baseUrl}${languageSuffix}/login`;
}
```

### 4. Queue Processor Updates

#### `src/common/processors/mail-queue.processor.ts`:

- Updated job data interfaces to include `preferredLanguage`
- Modified processor to pass language preference to mail service

### 5. DTO Updates

#### Added `preferred_language` field to:

- `CreateStudentDto` - Optional field for student creation
- `CreateProfessorDto` - Optional field for professor creation
- `CreateSchoolAdminDto` - Optional field for school admin creation

#### Field Definition:

```typescript
@IsOptional()
@IsEnum(LanguageEnum, {
  message: 'Preferred language must be either "en" or "fr"',
})
@ApiProperty({
  description: 'Preferred language for the user interface',
  enum: LanguageEnum,
  example: LanguageEnum.FRENCH,
  required: false,
})
preferred_language?: LanguageEnum;
```

### 6. Service Updates

#### Updated Services:

- `AuthService` - Passes user language preference to password reset emails
- `StudentService` - Uses DTO language preference for credentials emails
- `ProfessorService` - Uses DTO language preference for credentials emails
- `SchoolAdminService` - Uses DTO language preference for credentials emails

#### Key Changes:

- Extract `preferred_language` from DTOs
- Store language preference in user records
- Pass language preference to email services
- Fallback to admin's language preference if not specified

## Language Logic

### Default Behavior:

- **Default Language**: French (`fr`)
- **Fallback**: If no language specified, uses French
- **Template Selection**:
  - English: `credentials-email` (base name)
  - French: `credentials-email-fr` (with suffix)

### Email Subject Translation:

```typescript
const subjects = {
  'Password Reset Request': 'Demande de réinitialisation de mot de passe',
  'Welcome to AI Professor - Your Account Credentials':
    'Bienvenue chez AI Professor - Vos identifiants de compte',
};
```

### Portal URL Generation:

```typescript
// French users
Student: http://23.239.4.160:3000/fr/login
Professor/School Admin: http://23.239.4.160:3001/fr/login

// English users
Student: http://23.239.4.160:3000/en/login
Professor/School Admin: http://23.239.4.160:3001/en/login
```

## Environment Configuration

### Required Environment Variables:

```bash
# Portal URLs (base URLs without language suffix)
STUDENT_PORTAL_URL=http://23.239.4.160:3000
SCHOOL_PORTAL_URL=http://23.239.4.160:3001
ADMIN_PORTAL_URL=http://23.239.4.160:3000

# Other required variables
LOGO_URL=https://example.com/logo.png
```

## API Usage

### Creating Users with Language Preference:

#### Student Creation:

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "school_id": "60d21b4667d0d8992e610c85",
  "preferred_language": "fr"
}
```

#### Professor Creation:

```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane.smith@example.com",
  "school_id": "60d21b4667d0d8992e610c85",
  "preferred_language": "en"
}
```

#### School Admin Creation:

```json
{
  "school_name": "Springfield High",
  "school_email": "contact@springfieldhigh.edu",
  "school_website_url": "https://springfieldhigh.edu",
  "user_email": "admin@springfieldhigh.edu",
  "user_first_name": "Bob",
  "user_last_name": "Johnson",
  "preferred_language": "fr"
}
```

## Email Templates

### Credentials Email (French):

- Subject: "Bienvenue chez AI Professor - Vos identifiants de compte"
- Greeting: "Bonjour {{name}},"
- Content: French translations of all text
- Security notices in French
- Portal URL: `http://23.239.4.160:3000/fr/login` (students) or `http://23.239.4.160:3001/fr/login` (professors/admins)

### Password Reset Email (French):

- Subject: "Demande de réinitialisation de mot de passe"
- Greeting: "Bonjour {{userName}},"
- Button: "Réinitialiser votre mot de passe"
- Security notices in French

## Testing

### Test Script:

Run `node test-multi-language-emails.js` to verify:

- Default language is French
- Template name generation works correctly
- Email subject translation works
- Language enum values are correct
- Portal URL generation works correctly

### Manual Testing:

1. Create users with different language preferences
2. Verify emails are sent in correct language
3. Verify portal URLs include correct language suffix
4. Test password reset functionality
5. Verify fallback to French when no language specified

## Benefits

1. **User Experience**: Users receive emails in their preferred language
2. **Accessibility**: Supports French-speaking users
3. **Scalability**: Easy to add more languages in the future
4. **Consistency**: All email communications respect user language preference
5. **Default Safety**: Falls back to French if no preference specified
6. **Seamless Navigation**: Users are directed to language-specific portal URLs

## Future Enhancements

1. **More Languages**: Add support for additional languages
2. **Dynamic Templates**: Load templates from database
3. **Language Detection**: Auto-detect user language from browser
4. **Template Management**: Admin interface for managing email templates
5. **Localization**: Support for different date/time formats per language
6. **Portal URL Customization**: Allow custom portal URLs per school/organization
