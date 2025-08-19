# Multi-Language Notifications

This document describes the multi-language notification feature that allows storing and displaying notifications in multiple languages based on user preferences.

## Overview

The notification system now supports storing both English and French versions of notification titles and messages. When users fetch notifications, they receive content in their preferred language.

## Database Schema Changes

### Notification Schema Updates

The `Notification` schema has been updated to support multi-language content:

```typescript
// Multi-language content interface
export interface MultiLanguageContent {
  en: string;
  fr: string;
}

// Updated notification schema
export class Notification extends Document {
  // ... other fields ...

  @Prop({
    type: Object,
    required: true,
    validate: {
      validator: function (content: MultiLanguageContent) {
        return (
          content &&
          typeof content.en === 'string' &&
          typeof content.fr === 'string'
        );
      },
      message: 'Title must contain both English (en) and French (fr) versions',
    },
  })
  title: MultiLanguageContent;

  @Prop({
    type: Object,
    required: true,
    validate: {
      validator: function (content: MultiLanguageContent) {
        return (
          content &&
          typeof content.en === 'string' &&
          typeof content.fr === 'string'
        );
      },
      message:
        'Message must contain both English (en) and French (fr) versions',
    },
  })
  message: MultiLanguageContent;

  // ... other fields ...
}
```

## Utility Functions

### `getLocalizedContent(content, preferredLanguage, fallbackLanguage)`

Returns the appropriate language content from multi-language content based on user preference.

```typescript
import { getLocalizedContent } from 'src/common/utils/notification.utils';

const localizedTitle = getLocalizedContent(
  notification.title,
  user.preferred_language,
  LanguageEnum.ENGLISH,
);
```

### `createMultiLanguageContent(englishContent, frenchContent)`

Creates a multi-language content object.

```typescript
import { createMultiLanguageContent } from 'src/common/utils/notification.utils';

const multiLanguageTitle = createMultiLanguageContent(
  'New Module Available!',
  'Nouveau Module Disponible !',
);
```

### `isValidMultiLanguageContent(content)`

Validates if content is a valid multi-language content object.

## API Changes

### New Endpoint: Create Multi-Language Notification

**POST** `/notifications/multi-language`

Creates a notification with both English and French content.

**Request Body:**

```json
{
  "recipient_id": "507f1f77bcf86cd799439011",
  "recipient_type": "STUDENT",
  "title_en": "New Module Available!",
  "title_fr": "Nouveau Module Disponible !",
  "message_en": "A new module has been published and is now available.",
  "message_fr": "Un nouveau module a été publié et est maintenant disponible.",
  "type": "MODULE_PUBLISHED",
  "metadata": {
    "module_id": "507f1f77bcf86cd799439011",
    "module_title": "Mathematics"
  },
  "school_id": "507f1f77bcf86cd799439011"
}
```

### Updated Endpoints

#### GET `/notifications`

Now returns localized content based on the user's preferred language. The response automatically transforms multi-language content to show only the user's preferred language version.

**Response Example:**

```json
{
  "message": "Notifications retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "New Module Available!", // Localized based on user preference
      "message": "A new module has been published...", // Localized based on user preference
      "type": "MODULE_PUBLISHED",
      "status": "UNREAD",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination_data": {
    "total": 10,
    "page": 1,
    "limit": 10,
    "total_pages": 1
  }
}
```

## Service Methods

### `createMultiLanguageNotification()`

Creates a notification with multi-language content.

```typescript
await notificationsService.createMultiLanguageNotification(
  recipientId,
  RecipientTypeEnum.STUDENT,
  'New Module Available!',
  'Nouveau Module Disponible !',
  'A new module has been published...',
  'Un nouveau module a été publié...',
  NotificationTypeEnum.MODULE_PUBLISHED,
  metadata,
  schoolId,
);
```

### Updated `getNotifications()`

Automatically returns localized content based on user's preferred language.

### Updated `markNotificationAsRead()`

Returns the marked notification with localized content.

## Migration

### Running the Migration Script

To migrate existing single-language notifications to multi-language format:

1. Update the migration script with your database connection details
2. Run the migration:

```bash
npm run migrate:notifications
```

### Manual Migration

For existing notifications, you can manually update them:

```typescript
// Example: Update existing notification
await NotificationModel.findByIdAndUpdate(notificationId, {
  title: {
    en: 'Existing Title',
    fr: 'Existing Title', // Same as English for existing notifications
  },
  message: {
    en: 'Existing Message',
    fr: 'Existing Message', // Same as English for existing notifications
  },
});
```

## Usage Examples

### Creating Multi-Language Notifications

```typescript
// Using the service method
await notificationsService.createMultiLanguageNotification(
  studentId,
  RecipientTypeEnum.STUDENT,
  'Quiz Assigned',
  'Quiz Assigné',
  'You have been assigned a new quiz.',
  'Un nouveau quiz vous a été assigné.',
  NotificationTypeEnum.QUIZ_ASSIGNED,
  { quiz_id: quizId },
  schoolId,
);

// Using the API endpoint
const response = await fetch('/notifications/multi-language', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    recipient_id: studentId,
    recipient_type: 'STUDENT',
    title_en: 'Quiz Assigned',
    title_fr: 'Quiz Assigné',
    message_en: 'You have been assigned a new quiz.',
    message_fr: 'Un nouveau quiz vous a été assigné.',
    type: 'QUIZ_ASSIGNED',
    metadata: { quiz_id: quizId },
    school_id: schoolId,
  }),
});
```

### Retrieving Localized Notifications

```typescript
// The service automatically returns localized content
const notifications = await notificationsService.getNotifications(
  user, // Contains preferred_language
  RecipientTypeEnum.STUDENT,
);

// Notifications will contain localized title and message
console.log(notifications.data[0].title); // Shows content in user's preferred language
```

## Backward Compatibility

The system maintains backward compatibility:

1. **Existing single-language notifications** will continue to work
2. **New notifications** should use the multi-language format
3. **API responses** automatically handle both formats
4. **Migration script** can convert existing notifications

## Language Support

Currently supported languages:

- English (`en`)
- French (`fr`)

To add more languages, update:

1. `LanguageEnum` in `src/common/constants/language.constant.ts`
2. `MultiLanguageContent` interface
3. Validation functions
4. Utility functions

## Best Practices

1. **Always provide both languages** when creating new notifications
2. **Use meaningful translations** rather than machine translation
3. **Test both languages** in your development environment
4. **Consider cultural context** when translating content
5. **Keep translations consistent** across the application

## Error Handling

The system includes validation to ensure:

- Both English and French content are provided
- Content is properly formatted
- Fallback to English if preferred language is not available
- Graceful handling of missing or malformed content
