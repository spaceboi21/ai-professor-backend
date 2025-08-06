import { Injectable } from '@nestjs/common';
import { LanguageEnum } from '../constants/language.constant';
import {
  getErrorMessage,
  getErrorMessageWithParams,
  getSuccessMessage,
  getSuccessMessageWithParams,
} from '../constants/error-messages.constant';
import { JWTUserPayload } from '../types/jwr-user.type';

@Injectable()
export class ErrorMessageService {
  /**
   * Get error message in user's preferred language
   * @param category - Error category (e.g., 'AUTH', 'SCHOOL', 'STUDENT')
   * @param key - Error key (e.g., 'NOT_FOUND', 'CREATE_FAILED')
   * @param user - User context to get preferred language
   * @returns Error message in user's preferred language
   */
  getMessage(category: string, key: string, user: JWTUserPayload): string {
    const language = user.preferred_language || LanguageEnum.FRENCH;
    return getErrorMessage(category, key, language);
  }

  /**
   * Get error message with parameters in user's preferred language
   * @param category - Error category
   * @param key - Error key
   * @param params - Parameters to replace in the message
   * @param user - User context to get preferred language
   * @returns Error message with parameters in user's preferred language
   */
  getMessageWithParams(
    category: string,
    key: string,
    params: Record<string, string>,
    user: JWTUserPayload,
  ): string {
    const language = user.preferred_language || LanguageEnum.FRENCH;
    return getErrorMessageWithParams(category, key, params, language);
  }

  /**
   * Get error message in specific language
   * @param category - Error category
   * @param key - Error key
   * @param language - Specific language to use
   * @returns Error message in specified language
   */
  getMessageWithLanguage(
    category: string,
    key: string,
    language: LanguageEnum,
  ): string {
    return getErrorMessage(category, key, language);
  }

  /**
   * Get error message with parameters in specific language
   * @param category - Error category
   * @param key - Error key
   * @param params - Parameters to replace in the message
   * @param language - Specific language to use
   * @returns Error message with parameters in specified language
   */
  getMessageWithParamsAndLanguage(
    category: string,
    key: string,
    params: Record<string, string>,
    language: LanguageEnum,
  ): string {
    return getErrorMessageWithParams(category, key, params, language);
  }

  /**
   * Get success message in user's preferred language
   * @param category - Success category (e.g., 'USER', 'SCHOOL', 'STUDENT')
   * @param key - Success key (e.g., 'RETRIEVED_SUCCESSFULLY', 'CREATED_SUCCESSFULLY')
   * @param user - User context to get preferred language
   * @returns Success message in user's preferred language
   */
  getSuccessMessage(
    category: string,
    key: string,
    user: JWTUserPayload,
  ): string {
    const language = user.preferred_language || LanguageEnum.FRENCH;
    return getSuccessMessage(category, key, language);
  }

  /**
   * Get success message with parameters in user's preferred language
   * @param category - Success category
   * @param key - Success key
   * @param params - Parameters to replace in the message
   * @param user - User context to get preferred language
   * @returns Success message with parameters in user's preferred language
   */
  getSuccessMessageWithParams(
    category: string,
    key: string,
    params: Record<string, string>,
    user: JWTUserPayload,
  ): string {
    const language = user.preferred_language || LanguageEnum.FRENCH;
    return getSuccessMessageWithParams(category, key, params, language);
  }

  /**
   * Get success message in specific language
   * @param category - Success category
   * @param key - Success key
   * @param language - Specific language to use
   * @returns Success message in specified language
   */
  getSuccessMessageWithLanguage(
    category: string,
    key: string,
    language: LanguageEnum,
  ): string {
    return getSuccessMessage(category, key, language);
  }

  /**
   * Get success message with parameters in specific language
   * @param category - Success category
   * @param key - Success key
   * @param params - Parameters to replace in the message
   * @param language - Specific language to use
   * @returns Success message with parameters in specified language
   */
  getSuccessMessageWithParamsAndLanguage(
    category: string,
    key: string,
    params: Record<string, string>,
    language: LanguageEnum,
  ): string {
    return getSuccessMessageWithParams(category, key, params, language);
  }
}
