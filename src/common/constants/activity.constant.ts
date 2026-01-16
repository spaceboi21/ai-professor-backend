export enum ActivityTypeEnum {
  // User Management
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_STATUS_CHANGED = 'USER_STATUS_CHANGED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET = 'PASSWORD_RESET',

  // School Management
  SCHOOL_CREATED = 'SCHOOL_CREATED',
  SCHOOL_UPDATED = 'SCHOOL_UPDATED',
  SCHOOL_DELETED = 'SCHOOL_DELETED',
  SCHOOL_STATUS_CHANGED = 'SCHOOL_STATUS_CHANGED',

  // Student Management
  STUDENT_CREATED = 'STUDENT_CREATED',
  STUDENT_UPDATED = 'STUDENT_UPDATED',
  STUDENT_DELETED = 'STUDENT_DELETED',
  STUDENT_STATUS_CHANGED = 'STUDENT_STATUS_CHANGED',
  STUDENT_BULK_IMPORT = 'STUDENT_BULK_IMPORT',

  // Professor Management
  PROFESSOR_CREATED = 'PROFESSOR_CREATED',
  PROFESSOR_UPDATED = 'PROFESSOR_UPDATED',
  PROFESSOR_DELETED = 'PROFESSOR_DELETED',
  PROFESSOR_STATUS_CHANGED = 'PROFESSOR_STATUS_CHANGED',

  // Module Management
  MODULE_CREATED = 'MODULE_CREATED',
  MODULE_UPDATED = 'MODULE_UPDATED',
  MODULE_DELETED = 'MODULE_DELETED',
  MODULE_ASSIGNED = 'MODULE_ASSIGNED',
  MODULE_UNASSIGNED = 'MODULE_UNASSIGNED',

  // Chapter Management
  CHAPTER_CREATED = 'CHAPTER_CREATED',
  CHAPTER_UPDATED = 'CHAPTER_UPDATED',
  CHAPTER_DELETED = 'CHAPTER_DELETED',
  CHAPTER_REORDERED = 'CHAPTER_REORDERED',

  // Quiz Management
  QUIZ_CREATED = 'QUIZ_CREATED',
  QUIZ_UPDATED = 'QUIZ_UPDATED',
  QUIZ_DELETED = 'QUIZ_DELETED',
  QUIZ_ATTEMPTED = 'QUIZ_ATTEMPTED',
  QUIZ_STARTED = 'QUIZ_STARTED',
  QUIZ_SUBMITTED = 'QUIZ_SUBMITTED',

  // Anchor Tag Management
  ANCHOR_TAG_CREATED = 'ANCHOR_TAG_CREATED',
  ANCHOR_TAG_UPDATED = 'ANCHOR_TAG_UPDATED',
  ANCHOR_TAG_DELETED = 'ANCHOR_TAG_DELETED',
  ANCHOR_TAG_ATTEMPT_STARTED = 'ANCHOR_TAG_ATTEMPT_STARTED',
  ANCHOR_TAG_ATTEMPT_COMPLETED = 'ANCHOR_TAG_ATTEMPT_COMPLETED',
  ANCHOR_TAG_SKIPPED = 'ANCHOR_TAG_SKIPPED',

  // Progress Tracking
  PROGRESS_UPDATED = 'PROGRESS_UPDATED',
  PROGRESS_COMPLETED = 'PROGRESS_COMPLETED',
  MODULE_STARTED = 'MODULE_STARTED',
  MODULE_COMPLETED = 'MODULE_COMPLETED',
  CHAPTER_STARTED = 'CHAPTER_STARTED',
  CHAPTER_COMPLETED = 'CHAPTER_COMPLETED',

  // AI Chat
  AI_CHAT_STARTED = 'AI_CHAT_STARTED',
  AI_CHAT_MESSAGE_SENT = 'AI_CHAT_MESSAGE_SENT',
  AI_FEEDBACK_GIVEN = 'AI_FEEDBACK_GIVEN',

  // File Management
  FILE_UPLOADED = 'FILE_UPLOADED',
  FILE_DELETED = 'FILE_DELETED',

  // System Events
  SYSTEM_BACKUP = 'SYSTEM_BACKUP',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  DATABASE_MIGRATION = 'DATABASE_MIGRATION',
  CONFIGURATION_CHANGED = 'CONFIGURATION_CHANGED',

  // Notification Events
  NOTIFICATION_SENT = 'NOTIFICATION_SENT',
  NOTIFICATION_READ = 'NOTIFICATION_READ',

  // Security Events
  LOGIN_FAILED = 'LOGIN_FAILED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',

  // Simulation Events
  SIMULATION_STARTED = 'SIMULATION_STARTED',
  SIMULATION_ENDED = 'SIMULATION_ENDED',
  SIMULATION_WRITE_BLOCKED = 'SIMULATION_WRITE_BLOCKED',

  // Enrollment Events
  STUDENT_ENROLLED = 'STUDENT_ENROLLED',
  STUDENT_ENROLLED_BULK = 'STUDENT_ENROLLED_BULK',
  STUDENT_ENROLLED_ACADEMIC_YEAR = 'STUDENT_ENROLLED_ACADEMIC_YEAR',
  ENROLLMENT_WITHDRAWN = 'ENROLLMENT_WITHDRAWN',
  ENROLLMENT_COMPLETED = 'ENROLLMENT_COMPLETED',
}

export enum ActivityCategoryEnum {
  AUTHENTICATION = 'AUTHENTICATION',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  SCHOOL_MANAGEMENT = 'SCHOOL_MANAGEMENT',
  STUDENT_MANAGEMENT = 'STUDENT_MANAGEMENT',
  PROFESSOR_MANAGEMENT = 'PROFESSOR_MANAGEMENT',
  CONTENT_MANAGEMENT = 'CONTENT_MANAGEMENT',
  PROGRESS_TRACKING = 'PROGRESS_TRACKING',
  AI_INTERACTION = 'AI_INTERACTION',
  FILE_MANAGEMENT = 'FILE_MANAGEMENT',
  SYSTEM_ADMINISTRATION = 'SYSTEM_ADMINISTRATION',
  SECURITY = 'SECURITY',
  NOTIFICATION = 'NOTIFICATION',
  SIMULATION = 'SIMULATION',
  ENROLLMENT = 'ENROLLMENT',
}

export enum ActivityLevelEnum {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export const ACTIVITY_CATEGORY_MAPPING: Record<
  ActivityTypeEnum,
  ActivityCategoryEnum
> = {
  // Authentication
  [ActivityTypeEnum.USER_LOGIN]: ActivityCategoryEnum.AUTHENTICATION,
  [ActivityTypeEnum.USER_LOGOUT]: ActivityCategoryEnum.AUTHENTICATION,
  [ActivityTypeEnum.LOGIN_FAILED]: ActivityCategoryEnum.AUTHENTICATION,
  [ActivityTypeEnum.PASSWORD_CHANGED]: ActivityCategoryEnum.AUTHENTICATION,
  [ActivityTypeEnum.PASSWORD_RESET]: ActivityCategoryEnum.AUTHENTICATION,

  // User Management
  [ActivityTypeEnum.USER_CREATED]: ActivityCategoryEnum.USER_MANAGEMENT,
  [ActivityTypeEnum.USER_UPDATED]: ActivityCategoryEnum.USER_MANAGEMENT,
  [ActivityTypeEnum.USER_DELETED]: ActivityCategoryEnum.USER_MANAGEMENT,
  [ActivityTypeEnum.USER_STATUS_CHANGED]: ActivityCategoryEnum.USER_MANAGEMENT,

  // School Management
  [ActivityTypeEnum.SCHOOL_CREATED]: ActivityCategoryEnum.SCHOOL_MANAGEMENT,
  [ActivityTypeEnum.SCHOOL_UPDATED]: ActivityCategoryEnum.SCHOOL_MANAGEMENT,
  [ActivityTypeEnum.SCHOOL_DELETED]: ActivityCategoryEnum.SCHOOL_MANAGEMENT,
  [ActivityTypeEnum.SCHOOL_STATUS_CHANGED]:
    ActivityCategoryEnum.SCHOOL_MANAGEMENT,

  // Student Management
  [ActivityTypeEnum.STUDENT_CREATED]: ActivityCategoryEnum.STUDENT_MANAGEMENT,
  [ActivityTypeEnum.STUDENT_UPDATED]: ActivityCategoryEnum.STUDENT_MANAGEMENT,
  [ActivityTypeEnum.STUDENT_DELETED]: ActivityCategoryEnum.STUDENT_MANAGEMENT,
  [ActivityTypeEnum.STUDENT_STATUS_CHANGED]:
    ActivityCategoryEnum.STUDENT_MANAGEMENT,
  [ActivityTypeEnum.STUDENT_BULK_IMPORT]:
    ActivityCategoryEnum.STUDENT_MANAGEMENT,

  // Professor Management
  [ActivityTypeEnum.PROFESSOR_CREATED]:
    ActivityCategoryEnum.PROFESSOR_MANAGEMENT,
  [ActivityTypeEnum.PROFESSOR_UPDATED]:
    ActivityCategoryEnum.PROFESSOR_MANAGEMENT,
  [ActivityTypeEnum.PROFESSOR_DELETED]:
    ActivityCategoryEnum.PROFESSOR_MANAGEMENT,
  [ActivityTypeEnum.PROFESSOR_STATUS_CHANGED]:
    ActivityCategoryEnum.PROFESSOR_MANAGEMENT,

  // Content Management
  [ActivityTypeEnum.MODULE_CREATED]: ActivityCategoryEnum.CONTENT_MANAGEMENT,
  [ActivityTypeEnum.MODULE_UPDATED]: ActivityCategoryEnum.CONTENT_MANAGEMENT,
  [ActivityTypeEnum.MODULE_DELETED]: ActivityCategoryEnum.CONTENT_MANAGEMENT,
  [ActivityTypeEnum.MODULE_ASSIGNED]: ActivityCategoryEnum.CONTENT_MANAGEMENT,
  [ActivityTypeEnum.MODULE_UNASSIGNED]: ActivityCategoryEnum.CONTENT_MANAGEMENT,
  [ActivityTypeEnum.CHAPTER_CREATED]: ActivityCategoryEnum.CONTENT_MANAGEMENT,
  [ActivityTypeEnum.CHAPTER_UPDATED]: ActivityCategoryEnum.CONTENT_MANAGEMENT,
  [ActivityTypeEnum.CHAPTER_DELETED]: ActivityCategoryEnum.CONTENT_MANAGEMENT,
  [ActivityTypeEnum.CHAPTER_REORDERED]: ActivityCategoryEnum.CONTENT_MANAGEMENT,
  [ActivityTypeEnum.QUIZ_CREATED]: ActivityCategoryEnum.CONTENT_MANAGEMENT,
  [ActivityTypeEnum.QUIZ_UPDATED]: ActivityCategoryEnum.CONTENT_MANAGEMENT,
  [ActivityTypeEnum.QUIZ_DELETED]: ActivityCategoryEnum.CONTENT_MANAGEMENT,
  [ActivityTypeEnum.QUIZ_ATTEMPTED]: ActivityCategoryEnum.CONTENT_MANAGEMENT,
  [ActivityTypeEnum.QUIZ_STARTED]: ActivityCategoryEnum.CONTENT_MANAGEMENT,
  [ActivityTypeEnum.QUIZ_SUBMITTED]: ActivityCategoryEnum.CONTENT_MANAGEMENT,

  // Anchor Tag Management
  [ActivityTypeEnum.ANCHOR_TAG_CREATED]:
    ActivityCategoryEnum.CONTENT_MANAGEMENT,
  [ActivityTypeEnum.ANCHOR_TAG_UPDATED]:
    ActivityCategoryEnum.CONTENT_MANAGEMENT,
  [ActivityTypeEnum.ANCHOR_TAG_DELETED]:
    ActivityCategoryEnum.CONTENT_MANAGEMENT,
  [ActivityTypeEnum.ANCHOR_TAG_ATTEMPT_STARTED]:
    ActivityCategoryEnum.PROGRESS_TRACKING,
  [ActivityTypeEnum.ANCHOR_TAG_ATTEMPT_COMPLETED]:
    ActivityCategoryEnum.PROGRESS_TRACKING,
  [ActivityTypeEnum.ANCHOR_TAG_SKIPPED]: ActivityCategoryEnum.PROGRESS_TRACKING,

  // Progress Tracking
  [ActivityTypeEnum.PROGRESS_UPDATED]: ActivityCategoryEnum.PROGRESS_TRACKING,
  [ActivityTypeEnum.PROGRESS_COMPLETED]: ActivityCategoryEnum.PROGRESS_TRACKING,
  [ActivityTypeEnum.MODULE_STARTED]: ActivityCategoryEnum.PROGRESS_TRACKING,
  [ActivityTypeEnum.MODULE_COMPLETED]: ActivityCategoryEnum.PROGRESS_TRACKING,
  [ActivityTypeEnum.CHAPTER_STARTED]: ActivityCategoryEnum.PROGRESS_TRACKING,
  [ActivityTypeEnum.CHAPTER_COMPLETED]: ActivityCategoryEnum.PROGRESS_TRACKING,

  // AI Interaction
  [ActivityTypeEnum.AI_CHAT_STARTED]: ActivityCategoryEnum.AI_INTERACTION,
  [ActivityTypeEnum.AI_CHAT_MESSAGE_SENT]: ActivityCategoryEnum.AI_INTERACTION,
  [ActivityTypeEnum.AI_FEEDBACK_GIVEN]: ActivityCategoryEnum.AI_INTERACTION,

  // File Management
  [ActivityTypeEnum.FILE_UPLOADED]: ActivityCategoryEnum.FILE_MANAGEMENT,
  [ActivityTypeEnum.FILE_DELETED]: ActivityCategoryEnum.FILE_MANAGEMENT,

  // System Administration
  [ActivityTypeEnum.SYSTEM_BACKUP]: ActivityCategoryEnum.SYSTEM_ADMINISTRATION,
  [ActivityTypeEnum.SYSTEM_MAINTENANCE]:
    ActivityCategoryEnum.SYSTEM_ADMINISTRATION,
  [ActivityTypeEnum.DATABASE_MIGRATION]:
    ActivityCategoryEnum.SYSTEM_ADMINISTRATION,
  [ActivityTypeEnum.CONFIGURATION_CHANGED]:
    ActivityCategoryEnum.SYSTEM_ADMINISTRATION,

  // Notification
  [ActivityTypeEnum.NOTIFICATION_SENT]: ActivityCategoryEnum.NOTIFICATION,
  [ActivityTypeEnum.NOTIFICATION_READ]: ActivityCategoryEnum.NOTIFICATION,

  // Security
  [ActivityTypeEnum.UNAUTHORIZED_ACCESS]: ActivityCategoryEnum.SECURITY,
  [ActivityTypeEnum.SUSPICIOUS_ACTIVITY]: ActivityCategoryEnum.SECURITY,

  // Simulation
  [ActivityTypeEnum.SIMULATION_STARTED]: ActivityCategoryEnum.SIMULATION,
  [ActivityTypeEnum.SIMULATION_ENDED]: ActivityCategoryEnum.SIMULATION,
  [ActivityTypeEnum.SIMULATION_WRITE_BLOCKED]: ActivityCategoryEnum.SIMULATION,

  // Enrollment
  [ActivityTypeEnum.STUDENT_ENROLLED]: ActivityCategoryEnum.ENROLLMENT,
  [ActivityTypeEnum.STUDENT_ENROLLED_BULK]: ActivityCategoryEnum.ENROLLMENT,
  [ActivityTypeEnum.STUDENT_ENROLLED_ACADEMIC_YEAR]: ActivityCategoryEnum.ENROLLMENT,
  [ActivityTypeEnum.ENROLLMENT_WITHDRAWN]: ActivityCategoryEnum.ENROLLMENT,
  [ActivityTypeEnum.ENROLLMENT_COMPLETED]: ActivityCategoryEnum.ENROLLMENT,
};

export const ACTIVITY_LEVEL_MAPPING: Record<
  ActivityTypeEnum,
  ActivityLevelEnum
> = {
  // Info level activities
  [ActivityTypeEnum.USER_LOGIN]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.USER_LOGOUT]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.USER_CREATED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.USER_UPDATED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.SCHOOL_CREATED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.SCHOOL_UPDATED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.STUDENT_CREATED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.STUDENT_UPDATED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.PROFESSOR_CREATED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.PROFESSOR_UPDATED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.MODULE_CREATED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.MODULE_UPDATED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.CHAPTER_CREATED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.CHAPTER_UPDATED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.QUIZ_CREATED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.QUIZ_UPDATED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.PROGRESS_UPDATED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.PROGRESS_COMPLETED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.MODULE_STARTED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.MODULE_COMPLETED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.CHAPTER_STARTED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.CHAPTER_COMPLETED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.AI_CHAT_STARTED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.AI_CHAT_MESSAGE_SENT]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.AI_FEEDBACK_GIVEN]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.FILE_UPLOADED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.NOTIFICATION_SENT]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.NOTIFICATION_READ]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.PASSWORD_CHANGED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.PASSWORD_RESET]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.SYSTEM_BACKUP]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.SYSTEM_MAINTENANCE]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.DATABASE_MIGRATION]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.CONFIGURATION_CHANGED]: ActivityLevelEnum.INFO,

  // Anchor Tag Management
  [ActivityTypeEnum.ANCHOR_TAG_CREATED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.ANCHOR_TAG_UPDATED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.ANCHOR_TAG_ATTEMPT_STARTED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.ANCHOR_TAG_ATTEMPT_COMPLETED]: ActivityLevelEnum.INFO,

  // Warning level activities
  [ActivityTypeEnum.USER_DELETED]: ActivityLevelEnum.WARNING,
  [ActivityTypeEnum.SCHOOL_DELETED]: ActivityLevelEnum.WARNING,
  [ActivityTypeEnum.STUDENT_DELETED]: ActivityLevelEnum.WARNING,
  [ActivityTypeEnum.PROFESSOR_DELETED]: ActivityLevelEnum.WARNING,
  [ActivityTypeEnum.MODULE_DELETED]: ActivityLevelEnum.WARNING,
  [ActivityTypeEnum.CHAPTER_DELETED]: ActivityLevelEnum.WARNING,
  [ActivityTypeEnum.QUIZ_DELETED]: ActivityLevelEnum.WARNING,
  [ActivityTypeEnum.FILE_DELETED]: ActivityLevelEnum.WARNING,
  [ActivityTypeEnum.USER_STATUS_CHANGED]: ActivityLevelEnum.WARNING,
  [ActivityTypeEnum.SCHOOL_STATUS_CHANGED]: ActivityLevelEnum.WARNING,
  [ActivityTypeEnum.STUDENT_STATUS_CHANGED]: ActivityLevelEnum.WARNING,
  [ActivityTypeEnum.PROFESSOR_STATUS_CHANGED]: ActivityLevelEnum.WARNING,
  [ActivityTypeEnum.MODULE_ASSIGNED]: ActivityLevelEnum.WARNING,
  [ActivityTypeEnum.MODULE_UNASSIGNED]: ActivityLevelEnum.WARNING,
  [ActivityTypeEnum.CHAPTER_REORDERED]: ActivityLevelEnum.WARNING,
  [ActivityTypeEnum.QUIZ_ATTEMPTED]: ActivityLevelEnum.WARNING,
  [ActivityTypeEnum.QUIZ_STARTED]: ActivityLevelEnum.WARNING,
  [ActivityTypeEnum.QUIZ_SUBMITTED]: ActivityLevelEnum.WARNING,
  [ActivityTypeEnum.STUDENT_BULK_IMPORT]: ActivityLevelEnum.WARNING,
  [ActivityTypeEnum.ANCHOR_TAG_DELETED]: ActivityLevelEnum.WARNING,
  [ActivityTypeEnum.ANCHOR_TAG_SKIPPED]: ActivityLevelEnum.WARNING,

  // Error level activities
  [ActivityTypeEnum.LOGIN_FAILED]: ActivityLevelEnum.ERROR,
  [ActivityTypeEnum.UNAUTHORIZED_ACCESS]: ActivityLevelEnum.ERROR,

  // Critical level activities
  [ActivityTypeEnum.SUSPICIOUS_ACTIVITY]: ActivityLevelEnum.CRITICAL,

  // Simulation level activities
  [ActivityTypeEnum.SIMULATION_STARTED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.SIMULATION_ENDED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.SIMULATION_WRITE_BLOCKED]: ActivityLevelEnum.WARNING,

  // Enrollment level activities
  [ActivityTypeEnum.STUDENT_ENROLLED]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.STUDENT_ENROLLED_BULK]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.STUDENT_ENROLLED_ACADEMIC_YEAR]: ActivityLevelEnum.INFO,
  [ActivityTypeEnum.ENROLLMENT_WITHDRAWN]: ActivityLevelEnum.WARNING,
  [ActivityTypeEnum.ENROLLMENT_COMPLETED]: ActivityLevelEnum.INFO,
};
