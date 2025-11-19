import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ValidateFeedbackDto {
  @ApiProperty({
    description: 'Is the AI feedback approved?',
    example: true,
  })
  @IsBoolean()
  is_approved: boolean;

  @ApiPropertyOptional({
    description: 'Professor comments',
    example: 'Good analysis, but needs more depth in clinical reasoning section',
  })
  @IsOptional()
  @IsString()
  professor_comments?: string;

  @ApiPropertyOptional({
    description: 'Edited score (0-100)',
    example: 85,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  edited_score?: number;
}

