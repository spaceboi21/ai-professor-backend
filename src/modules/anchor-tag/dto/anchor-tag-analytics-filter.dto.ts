import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsMongoId, IsString, IsDateString } from 'class-validator';
import { Types } from 'mongoose';

export class AnchorTagAnalyticsFilterDto {
  @IsMongoId({ message: 'Module ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by module ID',
    required: false,
  })
  module_id?: string | Types.ObjectId;

  @IsMongoId({ message: 'Chapter ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'Filter by chapter ID',
    required: false,
  })
  chapter_id?: string | Types.ObjectId;

  @IsMongoId({ message: 'Bibliography ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    example: '507f1f77bcf86cd799439013',
    description: 'Filter by bibliography ID',
    required: false,
  })
  bibliography_id?: string | Types.ObjectId;

  @IsMongoId({ message: 'Anchor tag ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    example: '507f1f77bcf86cd799439014',
    description: 'Filter by specific anchor tag ID',
    required: false,
  })
  anchor_tag_id?: string | Types.ObjectId;

  @IsDateString({}, { message: 'Date from must be a valid ISO date string' })
  @IsOptional()
  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Filter by start date (ISO string format)',
    required: false,
  })
  date_from?: string;

  @IsDateString({}, { message: 'Date to must be a valid ISO date string' })
  @IsOptional()
  @ApiProperty({
    example: '2024-12-31T23:59:59.999Z',
    description: 'Filter by end date (ISO string format)',
    required: false,
  })
  date_to?: string;
}
