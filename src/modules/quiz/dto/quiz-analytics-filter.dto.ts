import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class QuizAnalyticsFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by module ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId({ message: 'Module ID must be a valid MongoDB ObjectId' })
  module_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by chapter ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId({ message: 'Chapter ID must be a valid MongoDB ObjectId' })
  chapter_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by quiz group ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId({ message: 'Quiz Group ID must be a valid MongoDB ObjectId' })
  quiz_group_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by start date (ISO string)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date from must be a valid date string' })
  date_from?: string;

  @ApiPropertyOptional({
    description: 'Filter by end date (ISO string)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date to must be a valid date string' })
  date_to?: string;
}
