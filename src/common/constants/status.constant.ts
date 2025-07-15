export enum StatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export const DEFAULT_STATUS = StatusEnum.ACTIVE;

export enum ProgressStatusEnum {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ALL = 'ALL',
}

export enum AttemptStatusEnum {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  TIMEOUT = 'TIMEOUT',
  ABANDONED = 'ABANDONED',
}
