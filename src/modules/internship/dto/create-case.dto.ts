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
    description: 'Evaluation criteria with weights',
    type: [EvaluationCriterionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvaluationCriterionDto)
  evaluation_criteria?: EvaluationCriterionDto[];
}

