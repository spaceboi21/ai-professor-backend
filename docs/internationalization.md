# Internationalized Error Messages

This project now supports internationalized error messages in English and French. The system automatically uses the user's preferred language to display error messages.

## Overview

The internationalization system consists of:

1. **Error Messages Constants** (`src/common/constants/error-messages.constant.ts`)
2. **Error Message Service** (`src/common/services/error-message.service.ts`)
3. **Common Module** (`src/common/common.module.ts`)

## How to Use

### 1. Inject ErrorMessageService

```typescript
import { ErrorMessageService } from 'src/common/services/error-message.service';

@Injectable()
export class YourService {
  constructor(private readonly errorMessageService: ErrorMessageService) {}
}
```

### 2. Use Error Messages

#### Basic Usage

```typescript
// Get error message in user's preferred language
throw new NotFoundException(
  this.errorMessageService.getMessage('SCHOOL', 'NOT_FOUND', user),
);
```

#### With Parameters

```typescript
// Get error message with parameters
throw new ConflictException(
  this.errorMessageService.getMessageWithParams(
    'CHAPTER',
    'TITLE_EXISTS',
    { title: title.trim() },
    user,
  ),
);
```

#### With Fallback Language

```typescript
// Get error message with specific language
const message = this.errorMessageService.getMessageWithLanguage(
  'AUTH',
  'INVALID_TOKEN_TYPE',
  LanguageEnum.ENGLISH,
);
```

### 3. Available Error Categories

- **AUTH**: Authentication and authorization errors
- **SCHOOL**: School-related errors
- **USER**: User-related errors
- **STUDENT**: Student-related errors
- **PROFESSOR**: Professor-related errors
- **MODULE**: Module-related errors
- **CHAPTER**: Chapter-related errors
- **BIBLIOGRAPHY**: Bibliography-related errors
- **AI_CHAT**: AI chat-related errors
- **COMMUNITY**: Community-related errors
- **LEARNING_LOGS**: Learning logs-related errors
- **NOTIFICATIONS**: Notification-related errors
- **GENERAL**: General errors

### 4. Adding New Error Messages

To add new error messages:

1. **Add to Error Messages Constants**:

```typescript
// In src/common/constants/error-messages.constant.ts
export const ERROR_MESSAGES: ErrorMessageCategory = {
  YOUR_CATEGORY: {
    YOUR_ERROR_KEY: {
      [LanguageEnum.ENGLISH]: 'Your error message in English',
      [LanguageEnum.FRENCH]: "Votre message d'erreur en français",
    },
  },
};
```

2. **Use in Service**:

```typescript
throw new BadRequestException(
  this.errorMessageService.getMessage('YOUR_CATEGORY', 'YOUR_ERROR_KEY', user),
);
```

### 5. User Language Preference

The system automatically uses the user's preferred language from their profile:

- `user.preferred_language` (defaults to French if not set)
- Supported languages: English (`en`) and French (`fr`)

### 6. Example Implementation

```typescript
@Injectable()
export class ExampleService {
  constructor(private readonly errorMessageService: ErrorMessageService) {}

  async findItem(id: string, user: JWTUserPayload) {
    const item = await this.itemModel.findById(id);

    if (!item) {
      throw new NotFoundException(
        this.errorMessageService.getMessage('ITEM', 'NOT_FOUND', user),
      );
    }

    if (item.isDeleted) {
      throw new BadRequestException(
        this.errorMessageService.getMessage('ITEM', 'ALREADY_DELETED', user),
      );
    }

    return item;
  }
}
```

## Benefits

1. **User-Friendly**: Error messages are displayed in the user's preferred language
2. **Consistent**: All error messages follow the same structure and format
3. **Maintainable**: Centralized error message management
4. **Extensible**: Easy to add new languages and error categories
5. **Type-Safe**: TypeScript interfaces ensure correct usage

## Migration Guide

To migrate existing hardcoded error messages:

1. **Find hardcoded error messages**:

```typescript
// Before
throw new NotFoundException('School not found');
```

2. **Replace with internationalized messages**:

```typescript
// After
throw new NotFoundException(
  this.errorMessageService.getMessage('SCHOOL', 'NOT_FOUND', user),
);
```

3. **Add to error messages constants** if the category/key doesn't exist.

## Notes

- The system defaults to French if no language preference is set
- Error messages with parameters use `{parameterName}` syntax
- All error messages are centralized in the constants file for easy maintenance
- The ErrorMessageService is globally available through the CommonModule
