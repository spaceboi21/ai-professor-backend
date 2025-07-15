export enum ModuleVisibilityActionEnum {
  PUBLISH = 'PUBLISH',
  UNPUBLISH = 'UNPUBLISH',
}

export const MODULE_CONSTANTS = {
  MIN_CHAPTERS_REQUIRED: 1,
  MIN_QUIZ_GROUPS_REQUIRED: 1,
  DEFAULT_THUMBNAIL: '/uploads/default-module-thumbnail.jpg',
} as const;
