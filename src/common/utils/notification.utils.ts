import { LanguageEnum } from '../constants/language.constant';
import { MultiLanguageContent } from '../../database/schemas/tenant/notification.schema';

/**
 * Get the appropriate language content from multi-language content
 * @param content - Multi-language content object
 * @param preferredLanguage - User's preferred language
 * @param fallbackLanguage - Fallback language if preferred language is not available
 * @returns The content in the preferred language or fallback
 */
export function getLocalizedContent(
  content: MultiLanguageContent,
  preferredLanguage: LanguageEnum,
  fallbackLanguage: LanguageEnum = LanguageEnum.ENGLISH,
): string {
  if (!content) {
    return '';
  }

  // Try to get content in preferred language
  if (content[preferredLanguage]) {
    return content[preferredLanguage];
  }

  // Fallback to English if preferred language is not available
  if (content[LanguageEnum.ENGLISH]) {
    return content[LanguageEnum.ENGLISH];
  }

  // Fallback to French if English is not available
  if (content[LanguageEnum.FRENCH]) {
    return content[LanguageEnum.FRENCH];
  }

  // If no content is available, return empty string
  return '';
}

/**
 * Create multi-language content object
 * @param englishContent - English version of the content
 * @param frenchContent - French version of the content
 * @returns MultiLanguageContent object
 */
export function createMultiLanguageContent(
  englishContent: string,
  frenchContent: string,
): MultiLanguageContent {
  return {
    en: englishContent,
    fr: frenchContent,
  };
}

/**
 * Validate multi-language content
 * @param content - Multi-language content to validate
 * @returns true if valid, false otherwise
 */
export function isValidMultiLanguageContent(
  content: any,
): content is MultiLanguageContent {
  return (
    content &&
    typeof content === 'object' &&
    typeof content.en === 'string' &&
    typeof content.fr === 'string' &&
    content.en.trim() !== '' &&
    content.fr.trim() !== ''
  );
}
