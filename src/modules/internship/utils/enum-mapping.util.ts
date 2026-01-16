/**
 * Utility functions for mapping French to English enum values
 * for patient simulation configuration
 */

// Valid scenario types expected by Python API
export enum ScenarioTypeEnum {
  INITIAL_CLINICAL_INTERVIEW = 'initial_clinical_interview',
  FOLLOW_UP_SESSION = 'follow_up_session',
  CRISIS_INTERVENTION = 'crisis_intervention',
  ASSESSMENT_SESSION = 'assessment_session',
  THERAPY_SESSION = 'therapy_session',
}

// Valid difficulty levels expected by Python API
export enum DifficultyLevelEnum {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

// Valid interview focus options
export enum InterviewFocusEnum {
  ASSESSMENT_AND_DIAGNOSIS = 'assessment_and_diagnosis',
  TREATMENT_PLANNING = 'treatment_planning',
  RAPPORT_BUILDING = 'rapport_building',
  SYMPTOM_MONITORING = 'symptom_monitoring',
  CRISIS_ASSESSMENT = 'crisis_assessment',
}

// Valid patient openness options
export enum PatientOpennessEnum {
  VERY_FORTHCOMING = 'very_forthcoming',
  MODERATELY_FORTHCOMING = 'moderately_forthcoming',
  GUARDED = 'guarded',
  VERY_RESISTANT = 'very_resistant',
}

// Mapping from French to English difficulty levels
const DIFFICULTY_MAPPING: Record<string, DifficultyLevelEnum> = {
  'débutant': DifficultyLevelEnum.BEGINNER,
  'debutant': DifficultyLevelEnum.BEGINNER,
  'beginner': DifficultyLevelEnum.BEGINNER,
  'intermédiaire': DifficultyLevelEnum.INTERMEDIATE,
  'intermediaire': DifficultyLevelEnum.INTERMEDIATE,
  'intermediate': DifficultyLevelEnum.INTERMEDIATE,
  'avancé': DifficultyLevelEnum.ADVANCED,
  'avance': DifficultyLevelEnum.ADVANCED,
  'advanced': DifficultyLevelEnum.ADVANCED,
  'expert': DifficultyLevelEnum.EXPERT,
};

// Mapping from French to English scenario types
const SCENARIO_TYPE_KEYWORDS: Record<string, ScenarioTypeEnum> = {
  'initial': ScenarioTypeEnum.INITIAL_CLINICAL_INTERVIEW,
  'première': ScenarioTypeEnum.INITIAL_CLINICAL_INTERVIEW,
  'premier': ScenarioTypeEnum.INITIAL_CLINICAL_INTERVIEW,
  'entretien': ScenarioTypeEnum.INITIAL_CLINICAL_INTERVIEW,
  'interview': ScenarioTypeEnum.INITIAL_CLINICAL_INTERVIEW,
  'suivi': ScenarioTypeEnum.FOLLOW_UP_SESSION,
  'follow': ScenarioTypeEnum.FOLLOW_UP_SESSION,
  'crise': ScenarioTypeEnum.CRISIS_INTERVENTION,
  'crisis': ScenarioTypeEnum.CRISIS_INTERVENTION,
  'urgence': ScenarioTypeEnum.CRISIS_INTERVENTION,
  'évaluation': ScenarioTypeEnum.ASSESSMENT_SESSION,
  'evaluation': ScenarioTypeEnum.ASSESSMENT_SESSION,
  'assessment': ScenarioTypeEnum.ASSESSMENT_SESSION,
  'thérapie': ScenarioTypeEnum.THERAPY_SESSION,
  'therapie': ScenarioTypeEnum.THERAPY_SESSION,
  'therapy': ScenarioTypeEnum.THERAPY_SESSION,
  'traitement': ScenarioTypeEnum.THERAPY_SESSION,
};

/**
 * Normalize difficulty level to English enum value
 * @param difficulty - Difficulty level in any language or format
 * @returns Normalized English difficulty level
 */
export function normalizeDifficultyLevel(difficulty: string): DifficultyLevelEnum {
  if (!difficulty) {
    return DifficultyLevelEnum.INTERMEDIATE; // Default
  }

  const normalized = difficulty.toLowerCase().trim();

  // Check direct mapping
  if (DIFFICULTY_MAPPING[normalized]) {
    return DIFFICULTY_MAPPING[normalized];
  }

  // If it's already a valid enum value
  if (Object.values(DifficultyLevelEnum).includes(normalized as DifficultyLevelEnum)) {
    return normalized as DifficultyLevelEnum;
  }

  // Default fallback
  return DifficultyLevelEnum.INTERMEDIATE;
}

/**
 * Normalize scenario type to English enum value
 * Handles both exact matches and keyword-based detection
 * @param scenarioType - Scenario type in any language or format
 * @returns Normalized English scenario type
 */
export function normalizeScenarioType(scenarioType: string): ScenarioTypeEnum {
  if (!scenarioType) {
    return ScenarioTypeEnum.INITIAL_CLINICAL_INTERVIEW; // Default
  }

  const normalized = scenarioType.toLowerCase().trim();

  // Check if it's already a valid enum value
  if (Object.values(ScenarioTypeEnum).includes(normalized as ScenarioTypeEnum)) {
    return normalized as ScenarioTypeEnum;
  }

  // Try keyword-based matching
  for (const [keyword, enumValue] of Object.entries(SCENARIO_TYPE_KEYWORDS)) {
    if (normalized.includes(keyword)) {
      return enumValue;
    }
  }

  // Default fallback
  return ScenarioTypeEnum.INITIAL_CLINICAL_INTERVIEW;
}

/**
 * Normalize interview focus to English enum value
 * @param focus - Interview focus in any format
 * @returns Normalized English interview focus
 */
export function normalizeInterviewFocus(focus: string): InterviewFocusEnum {
  if (!focus) {
    return InterviewFocusEnum.ASSESSMENT_AND_DIAGNOSIS; // Default
  }

  const normalized = focus.toLowerCase().trim().replace(/[_\s-]+/g, '_');

  // Check if it's already a valid enum value
  if (Object.values(InterviewFocusEnum).includes(normalized as InterviewFocusEnum)) {
    return normalized as InterviewFocusEnum;
  }

  // Default fallback
  return InterviewFocusEnum.ASSESSMENT_AND_DIAGNOSIS;
}

/**
 * Normalize patient openness to English enum value
 * @param openness - Patient openness in any format
 * @returns Normalized English patient openness
 */
export function normalizePatientOpenness(openness: string): PatientOpennessEnum {
  if (!openness) {
    return PatientOpennessEnum.MODERATELY_FORTHCOMING; // Default
  }

  const normalized = openness.toLowerCase().trim().replace(/[_\s-]+/g, '_');

  // Check if it's already a valid enum value
  if (Object.values(PatientOpennessEnum).includes(normalized as PatientOpennessEnum)) {
    return normalized as PatientOpennessEnum;
  }

  // Default fallback
  return PatientOpennessEnum.MODERATELY_FORTHCOMING;
}

/**
 * Normalize entire patient_simulation_config to ensure all enum values are in English
 * @param config - Patient simulation configuration object
 * @returns Normalized configuration with English enum values
 */
export function normalizePatientSimulationConfig(config: any): any {
  if (!config) {
    return config;
  }

  const normalized = { ...config };

  // Normalize scenario_type (always ensure it exists with default if missing)
  normalized.scenario_type = normalized.scenario_type 
    ? normalizeScenarioType(normalized.scenario_type)
    : ScenarioTypeEnum.INITIAL_CLINICAL_INTERVIEW;

  // Normalize difficulty_level (always ensure it exists with default if missing)
  normalized.difficulty_level = normalized.difficulty_level
    ? normalizeDifficultyLevel(normalized.difficulty_level)
    : DifficultyLevelEnum.INTERMEDIATE;

  // Normalize interview_focus (optional, provide default)
  normalized.interview_focus = normalized.interview_focus
    ? normalizeInterviewFocus(normalized.interview_focus)
    : InterviewFocusEnum.ASSESSMENT_AND_DIAGNOSIS;

  // Normalize patient_openness (optional, provide default)
  normalized.patient_openness = normalized.patient_openness
    ? normalizePatientOpenness(normalized.patient_openness)
    : PatientOpennessEnum.MODERATELY_FORTHCOMING;

  return normalized;
}

