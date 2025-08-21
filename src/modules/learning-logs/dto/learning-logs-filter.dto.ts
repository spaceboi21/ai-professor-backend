import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class LearningLogsFilterDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'child development',
    description:
      'Filter by text in module title or description (case-insensitive regex)',
    required: false,
  })
  text?: string;

  @IsOptional()
  @IsMongoId()
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by specific module ID',
    required: false,
  })
  module_id?: string | Types.ObjectId;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'empathy',
    description: 'Filter by skill gap type',
    required: false,
  })
  skill_gap?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: '2024-01-01',
    description: 'Filter by start date (YYYY-MM-DD)',
    required: false,
  })
  start_date?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: '2024-12-31',
    description: 'Filter by end date (YYYY-MM-DD)',
    required: false,
  })
  end_date?: string;
}
