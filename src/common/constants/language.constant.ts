export enum LanguageEnum {
  ENGLISH = 'en',
  FRENCH = 'fr',
}

export const DEFAULT_LANGUAGE = LanguageEnum.FRENCH;

export const SUPPORTED_LANGUAGES = [
  LanguageEnum.ENGLISH,
  LanguageEnum.FRENCH,
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
