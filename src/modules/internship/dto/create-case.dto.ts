import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsObject,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

class CaseDocumentDto {
  @ApiProperty({ description: 'Document URL' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ description: 'Document type (pdf, image, etc.)' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: 'Document name' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

class EvaluationCriterionDto {
  @ApiProperty({ description: 'Evaluation criterion' })
  @IsString()
  @IsNotEmpty()
  criterion: string;

  @ApiProperty({ description: 'Weight (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  weight: number;
}

// NEW: Rich Assessment Criterion DTO
class AssessmentCriterionDto {
  @ApiProperty({ description: 'Unique criterion identifier', example: 'anamnesis' })
  @IsString()
  @IsNotEmpty()
  criterion_id: string;

  @ApiProperty({ description: 'Criterion name', example: 'Anamnesis' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'What to assess', example: 'Complete trauma/symptoms collection' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Maximum points for this criterion', example: 25 })
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  max_points: number;

  @ApiPropertyOptional({ description: 'Literature reference', example: 'Shapiro p.145' })
  @IsOptional()
  @IsString()
  reference_literature?: string;

  @ApiPropertyOptional({ description: 'Example of failure', example: 'Ignores bullying history' })
  @IsOptional()
  @IsString()
  ko_example?: string;

  @ApiPropertyOptional({ description: 'Example of success', example: 'Documents all traumas' })
  @IsOptional()
  @IsString()
  ok_example?: string;
}

// NEW: Literature Reference DTO
class LiteratureReferenceDto {
  @ApiProperty({ description: 'Title of the reference', example: 'Shapiro EMDR Manual' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Type of reference', enum: ['book', 'article', 'manual'] })
  @IsEnum(['book', 'article', 'manual'])
  type: 'book' | 'article' | 'manual';

  @ApiPropertyOptional({ description: 'Relevant pages', example: 'p.145-155' })
  @IsOptional()
  @IsString()
  relevant_pages?: string;

  @ApiPropertyOptional({ description: 'S3 URL of uploaded document' })
  @IsOptional()
  @IsString()
  s3_url?: string;

  @ApiPropertyOptional({ description: 'S3 key' })
  @IsOptional()
  @IsString()
  s3_key?: string;

  @ApiPropertyOptional({ description: 'Pinecone namespace', example: 'baby-ai', default: 'baby-ai' })
  @IsOptional()
  @IsString()
  pinecone_namespace?: string;

  @ApiProperty({ description: 'Priority level', enum: ['primary', 'secondary'], default: 'secondary' })
  @IsEnum(['primary', 'secondary'])
  priority: 'primary' | 'secondary';
}

// NEW: Patient State DTO (for Steps 2-3)
class PatientStateDto {
  @ApiPropertyOptional({ description: 'Current SUD level (0-10)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  @Type(() => Number)
  current_sud?: number | null;

  @ApiPropertyOptional({ description: 'Current VOC level (1-7)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(7)
  @Type(() => Number)
  current_voc?: number | null;

  @ApiPropertyOptional({ description: 'Is safe place established?', default: false })
  @IsOptional()
  @IsBoolean()
  safe_place_established?: boolean;

  @ApiPropertyOptional({ description: 'Trauma targets resolved', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trauma_targets_resolved?: string[];

  @ApiPropertyOptional({ description: 'Techniques mastered', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  techniques_mastered?: string[];

  @ApiPropertyOptional({ 
    description: 'Progress trajectory', 
    enum: ['improvement', 'stable', 'regression', 'breakthrough'] 
  })
  @IsOptional()
  @IsEnum(['improvement', 'stable', 'regression', 'breakthrough'])
  progress_trajectory?: 'improvement' | 'stable' | 'regression' | 'breakthrough' | null;
}

class SessionConfigDto {
  @ApiPropertyOptional({ 
    description: 'Session duration in minutes', 
    example: 90,
    default: 90 
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(15)
  @Max(300)
  session_duration_minutes?: number;

  @ApiPropertyOptional({ 
    description: 'Maximum sessions allowed (null = unlimited)', 
    example: null 
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  max_sessions_allowed?: number | null;

  @ApiPropertyOptional({ 
    description: 'Allow session pause', 
    example: true,
    default: true 
  })
  @IsOptional()
  allow_pause?: boolean;

  @ApiPropertyOptional({ 
    description: 'Auto-end session on timeout', 
    example: false,
    default: false 
  })
  @IsOptional()
  auto_end_on_timeout?: boolean;

  @ApiPropertyOptional({ 
    description: 'Warning before timeout (in minutes)', 
    example: 5,
    default: 5 
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(30)
  warning_before_timeout_minutes?: number;
}

export class CreateCaseDto {
  @ApiProperty({
    description: 'Title of the case',
    example: 'Case 1: Anxiety Disorder',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Description of the case',
    example: 'Patient presenting with severe anxiety symptoms',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Case content (rich text)',
    example: 'Detailed case study...',
  })
  @IsOptional()
  @IsString()
  case_content?: string;

  @ApiPropertyOptional({
    description: 'Array of case documents',
    type: [CaseDocumentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CaseDocumentDto)
  case_documents?: CaseDocumentDto[];

  @ApiProperty({
    description: 'Sequence number within internship',
    example: 1,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  sequence: number;

  // NEW: 3-Step Structure Fields
  @ApiProperty({
    description: 'Step in internship (1, 2, or 3)',
    example: 1,
    enum: [1, 2, 3],
    default: 1,
  })
  @IsNumber()
  @IsEnum([1, 2, 3])
  @Type(() => Number)
  step: 1 | 2 | 3;

  @ApiProperty({
    description: 'Case type',
    example: 'isolated',
    enum: ['isolated', 'progressive', 'realistic'],
  })
  @IsEnum(['isolated', 'progressive', 'realistic'])
  case_type: 'isolated' | 'progressive' | 'realistic';

  @ApiPropertyOptional({
    description: 'Patient base ID (for Steps 2-3, null for Step 1)',
    example: 'brigitte_fenurel',
  })
  @IsOptional()
  @IsString()
  patient_base_id?: string | null;

  @ApiProperty({
    description: 'Sequence within step (1-5 for Step 1, 1-7 for Step 2, 1-15 for Step 3)',
    example: 1,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  sequence_in_step: number;

  @ApiPropertyOptional({
    description: 'EMDR phase focus (for Step 2)',
    example: 'Phase 1-2',
  })
  @IsOptional()
  @IsString()
  emdr_phase_focus?: string | null;

  @ApiPropertyOptional({
    description: 'Session narrative (for Step 3)',
    example: 'Relapse after work stress',
  })
  @IsOptional()
  @IsString()
  session_narrative?: string | null;

  @ApiPropertyOptional({
    description: 'Patient simulation configuration',
    example: {
      patient_profile: { age: 35, gender: 'female', condition: 'anxiety' },
      scenario_type: 'clinical_interview',
      difficulty_level: 'intermediate',
    },
  })
  @IsOptional()
  @IsObject()
  patient_simulation_config?: {
    patient_profile: Record<string, any>;
    scenario_type: string;
    difficulty_level: string;
  };

  @ApiPropertyOptional({
    description: 'Array of supervisor prompts for GPT',
    example: ['Provide feedback on clinical approach', 'Evaluate communication skills'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supervisor_prompts?: string[];

  @ApiPropertyOptional({
    description: 'Array of therapist prompts for GPT',
    example: ['Guide on therapeutic techniques', 'Discuss case conceptualization'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  therapist_prompts?: string[];

  @ApiPropertyOptional({
    description: 'Evaluation criteria with weights (DEPRECATED - use assessment_criteria)',
    type: [EvaluationCriterionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvaluationCriterionDto)
  evaluation_criteria?: EvaluationCriterionDto[];

  // NEW: Rich Assessment Criteria (MUST total 100 points)
  @ApiPropertyOptional({
    description: 'Assessment criteria (NEW - must total 100 points)',
    type: [AssessmentCriterionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentCriterionDto)
  assessment_criteria?: AssessmentCriterionDto[];

  // NEW: Literature References
  @ApiPropertyOptional({
    description: 'Literature references for AI assessment',
    type: [LiteratureReferenceDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LiteratureReferenceDto)
  literature_references?: LiteratureReferenceDto[];

  // NEW: Pass Threshold
  @ApiPropertyOptional({
    description: 'Minimum score to pass (configurable per case)',
    example: 70,
    default: 70,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  pass_threshold?: number;

  // NEW: Patient State (for Steps 2-3)
  @ApiPropertyOptional({
    description: 'Patient state (for Steps 2-3 only)',
    type: PatientStateDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PatientStateDto)
  patient_state?: PatientStateDto | null;

  @ApiPropertyOptional({
    description: 'Session configuration (duration, pause settings, etc.)',
    type: SessionConfigDto,
    example: {
      session_duration_minutes: 90,
      max_sessions_allowed: null,
      allow_pause: true,
      auto_end_on_timeout: false,
      warning_before_timeout_minutes: 5,
    },
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SessionConfigDto)
  session_config?: SessionConfigDto;
}

