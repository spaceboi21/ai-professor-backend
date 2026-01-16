// Workflow Step Types
export enum WorkflowStepTypeEnum {
  CASE_REVIEW = 'case_review',
  PATIENT_SIMULATION = 'patient_simulation',
  THERAPIST_CHAT = 'therapist_chat',
  SUPERVISOR_FEEDBACK = 'supervisor_feedback',
}

// Session Types
export enum SessionTypeEnum {
  PATIENT_INTERVIEW = 'patient_interview',
  THERAPIST_CONSULTATION = 'therapist_consultation',
  SUPERVISOR_FEEDBACK = 'supervisor_feedback',
}

// Session Status
export enum SessionStatusEnum {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  PENDING_VALIDATION = 'PENDING_VALIDATION',
}

// Message Roles
export enum MessageRoleEnum {
  STUDENT = 'student',
  AI_PATIENT = 'ai_patient',
  AI_THERAPIST = 'ai_therapist',
  AI_SUPERVISOR = 'ai_supervisor',
}

// Feedback Types
export enum FeedbackTypeEnum {
  AUTO_GENERATED = 'auto_generated',
  PROFESSOR_VALIDATED = 'professor_validated',
  PROFESSOR_EDITED = 'professor_edited',
}

// Feedback Status
export enum FeedbackStatusEnum {
  PENDING_VALIDATION = 'PENDING_VALIDATION',
  VALIDATED = 'VALIDATED',
  REVISED = 'REVISED',
}

// Internship Constants
export const INTERNSHIP_CONSTANTS = {
  MIN_CASES_REQUIRED: 1,
  MIN_WORKFLOW_STEPS: 1,
  MAX_CASES_PER_INTERNSHIP: 50,
  MAX_MESSAGES_PER_SESSION: 1000,
  SESSION_TIMEOUT_HOURS: 24,
};

// Internship Visibility Actions
export enum InternshipVisibilityActionEnum {
  PUBLISH = 'publish',
  UNPUBLISH = 'unpublish',
}

// Case Status for Student View
export enum CaseStatusEnum {
  LOCKED = 'LOCKED',
  UNLOCKED = 'UNLOCKED',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_FEEDBACK = 'AWAITING_FEEDBACK',
  COMPLETED = 'COMPLETED',
}

// Sort Options for Internships
export enum InternshipSortBy {
  TITLE = 'title',
  CREATED_AT = 'created_at',
  DURATION = 'duration',
  SEQUENCE = 'sequence',
  PROGRESS_STATUS = 'progress_status',
}

