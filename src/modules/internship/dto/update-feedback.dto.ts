import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateFeedbackDto {
  @ApiPropertyOptional({
    description: 'Updated overall score',
    example: 88,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  overall_score?: number;

  @ApiPropertyOptional({
    description: 'Updated strengths',
    example: ['Excellent rapport building', 'Clear communication'],
  })
  @IsOptional()
  strengths?: string[];

  @ApiPropertyOptional({
    description: 'Updated areas for improvement',
    example: ['Need more systematic assessment', 'Consider differential diagnosis'],
  })
  @IsOptional()
  areas_for_improvement?: string[];

  @ApiPropertyOptional({
    description: 'Updated technical assessment',
  })
  @IsOptional()
  @IsObject()
  technical_assessment?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Updated communication assessment',
  })
  @IsOptional()
  @IsObject()
  communication_assessment?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Updated clinical reasoning',
  })
  @IsOptional()
  @IsObject()
  clinical_reasoning?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Professor comments',
    example: 'Updated feedback based on re-evaluation',
  })
  @IsOptional()
  @IsString()
  professor_comments?: string;
}

