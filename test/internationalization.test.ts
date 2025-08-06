import { ErrorMessageService } from '../src/common/services/error-message.service';
import { LanguageEnum } from '../src/common/constants/language.constant';
import { JWTUserPayload } from '../src/common/types/jwr-user.type';

describe('Internationalization System', () => {
  let errorMessageService: ErrorMessageService;

  beforeEach(() => {
    errorMessageService = new ErrorMessageService();
  });

  describe('ErrorMessageService', () => {
    const mockUser: JWTUserPayload = {
      id: '1',
      email: 'test@example.com',
      school_id: 'school1',
      role: {
        id: '1',
        name: 'STUDENT' as any,
      },
      preferred_language: LanguageEnum.FRENCH,
    };

    const mockEnglishUser: JWTUserPayload = {
      ...mockUser,
      preferred_language: LanguageEnum.ENGLISH,
    };

    it('should return French error message for French user', () => {
      const message = errorMessageService.getMessage(
        'SCHOOL',
        'NOT_FOUND',
        mockUser,
      );
      expect(message).toBe('École non trouvée');
    });

    it('should return English error message for English user', () => {
      const message = errorMessageService.getMessage(
        'SCHOOL',
        'NOT_FOUND',
        mockEnglishUser,
      );
      expect(message).toBe('School not found');
    });

    it('should return French message by default when no language specified', () => {
      const message = errorMessageService.getMessageWithLanguage(
        'AUTH',
        'INVALID_TOKEN_TYPE',
      );
      expect(message).toBe('Type de jeton invalide');
    });

    it('should return English message when English language specified', () => {
      const message = errorMessageService.getMessageWithLanguage(
        'AUTH',
        'INVALID_TOKEN_TYPE',
        LanguageEnum.ENGLISH,
      );
      expect(message).toBe('Invalid token type');
    });

    it('should handle error messages with parameters', () => {
      const message = errorMessageService.getMessageWithParams(
        'CHAPTER',
        'TITLE_EXISTS',
        { title: 'Test Chapter' },
        mockUser,
      );
      expect(message).toBe(
        'Un chapitre avec le titre "Test Chapter" existe déjà dans ce module',
      );
    });

    it('should handle error messages with parameters in English', () => {
      const message = errorMessageService.getMessageWithParams(
        'CHAPTER',
        'TITLE_EXISTS',
        { title: 'Test Chapter' },
        mockEnglishUser,
      );
      expect(message).toBe(
        'Chapter with title "Test Chapter" already exists in this module',
      );
    });

    it('should return fallback message for non-existent category', () => {
      const message = errorMessageService.getMessage(
        'NON_EXISTENT',
        'NOT_FOUND',
        mockUser,
      );
      expect(message).toBe('Non trouvé');
    });

    it('should return fallback message for non-existent key', () => {
      const message = errorMessageService.getMessage(
        'SCHOOL',
        'NON_EXISTENT',
        mockUser,
      );
      expect(message).toBe('Non trouvé');
    });
  });
});
