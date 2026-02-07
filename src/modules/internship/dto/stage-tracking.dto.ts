import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StageStatusEnum } from 'src/database/schemas/tenant/internship-stage-progress.schema';

export class UpdateStageProgressDto {
  @ApiProperty({
    description: 'Stage number (1, 2, or 3)',
    example: 1,
    enum: [1, 2, 3],
  })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(3)
  stage_number: number;

  @ApiPropertyOptional({
    description: 'Stage status',
    enum: StageStatusEnum,
    example: StageStatusEnum.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(StageStatusEnum)
  status?: StageStatusEnum;

  @ApiPropertyOptional({
    description: 'Stage score (0-100)',
    example: 85,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  score?: number;

  @ApiPropertyOptional({
    description: 'Case ID associated with this stage',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  case_id?: string;

  @ApiPropertyOptional({
    description: 'Validation notes from professor',
    example: 'Good rapport building, needs work on pacing',
  })
  @IsOptional()
  @IsString()
  validation_notes?: string;

  @ApiPropertyOptional({
    description: 'Areas that need improvement',
    example: ['pacing', 'trauma target identification'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  needs_improvement_areas?: string[];

  @ApiPropertyOptional({
    description: 'Metrics for the stage (varies by stage)',
    example: {
      rapport_building: 8,
      safe_place_installation: 9,
      patient_engagement: 7,
    },
  })
  @IsOptional()
  metrics?: Record<string, number>;
}

export class ValidateStageDto {
  @ApiProperty({
    description: 'Stage number to validate (1, 2, or 3)',
    example: 1,
    enum: [1, 2, 3],
  })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(3)
  stage_number: number;

  @ApiProperty({
    description: 'Is the stage validated/approved?',
    example: true,
  })
  @IsBoolean()
  is_approved: boolean;

  @ApiPropertyOptional({
    description: 'Validation notes',
    example: 'Excellent safe place installation technique',
  })
  @IsOptional()
  @IsString()
  validation_notes?: string;

  @ApiPropertyOptional({
    description: 'Edited score (overrides AI score)',
    example: 90,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  edited_score?: number;

  @ApiPropertyOptional({
    description: 'Areas that need improvement',
    example: ['pacing', 'bilateral stimulation timing'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  needs_improvement_areas?: string[];
}

export class UpdateThresholdsDto {
  @ApiPropertyOptional({
    description: 'Minimum score required to pass a stage',
    example: 70,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  minimum_score_to_pass?: number;

  @ApiPropertyOptional({
    description: 'Minimum sessions required per stage',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  minimum_sessions_per_stage?: number;

  @ApiPropertyOptional({
    description: 'Require professor validation to complete stage',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  require_professor_validation?: boolean;
}

export class DashboardFiltersDto {
  @ApiPropertyOptional({
    description: 'Filter by stage status',
    enum: StageStatusEnum,
  })
  @IsOptional()
  @IsEnum(StageStatusEnum)
  stage_status?: StageStatusEnum;

  @ApiPropertyOptional({
    description: 'Filter by stage number',
    example: 1,
    enum: [1, 2, 3],
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(3)
  stage_number?: number;

  @ApiPropertyOptional({
    description: 'Filter students with score above this value',
    example: 70,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  min_score?: number;

  @ApiPropertyOptional({
    description: 'Filter students with score below this value',
    example: 90,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  max_score?: number;

  @ApiPropertyOptional({
    description: 'Include only completed stages',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  only_completed?: boolean;

  @ApiPropertyOptional({
    description: 'Include only validated stages',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  only_validated?: boolean;
}

export class ExportStageProgressDto {
  @ApiProperty({
    description: 'Export format',
    enum: ['pdf', 'csv'],
    example: 'csv',
  })
  @IsEnum(['pdf', 'csv'])
  format: 'pdf' | 'csv';

  @ApiPropertyOptional({
    description: 'Student IDs to export (empty = all students)',
    example: ['507f1f77bcf86cd799439011'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  student_ids?: string[];

  @ApiPropertyOptional({
    description: 'Include detailed metrics',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  include_details?: boolean;
}
