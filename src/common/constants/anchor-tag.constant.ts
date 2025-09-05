export enum AnchorTagTypeEnum {
  SLIDE = 'SLIDE',
  VIDEO = 'VIDEO',
  PDF = 'PDF',
  DOCUMENT = 'DOCUMENT',
}

export enum AnchorTagStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum AnchorTagQuestionTypeEnum {
  MULTI_SELECT = 'MULTI_SELECT',
  SINGLE_SELECT = 'SINGLE_SELECT',
  TEXT = 'TEXT',
  TRUE_FALSE = 'TRUE_FALSE',
  SCENARIO_BASED = 'SCENARIO_BASED',
}

export enum AnchorTagAttemptStatusEnum {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  FAILED = 'FAILED',
}

export enum AnchorTypeEnum {
  QUIZ = 'QUIZ',
  AI_CHAT = 'AI_CHAT',
}