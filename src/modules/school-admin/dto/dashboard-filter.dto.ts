import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class DashboardFilterDto {
  @ApiProperty({
    description: 'Filter by start date (YYYY-MM-DD)',
    required: false,
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  from_date?: string;

  @ApiProperty({
    description: 'Filter by end date (YYYY-MM-DD)',
    required: false,
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  to_date?: string;

  @ApiProperty({
    description: 'Filter by specific module ID',
    required: false,
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  module_id?: string;

  @ApiProperty({
    description: 'Filter by cohort/class name',
    required: false,
    example: 'Class of 2024',
  })
  @IsOptional()
  @IsString()
  cohort?: string;
} 