import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';
import { BibliographyTypeEnum } from 'src/common/constants/bibliography-type.constant';

export class BibliographyFilterDto {
  @IsOptional()
  @IsMongoId({ message: 'Module ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by module ID',
    required: false,
  })
  module_id?: string | Types.ObjectId;

  @IsOptional()
  @IsMongoId({ message: 'Chapter ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'Filter by chapter ID',
    required: false,
  })
  chapter_id?: string | Types.ObjectId;

  @IsOptional()
  @IsString({ message: 'Text must be a string' })
  @ApiProperty({
    example: 'psychology',
    description: 'Search text in title and description',
    required: false,
  })
  text?: string;

  @IsOptional()
  @IsEnum(BibliographyTypeEnum, {
    message: 'Type must be a valid bibliography type',
  })
  @ApiProperty({
    enum: BibliographyTypeEnum,
    example: BibliographyTypeEnum.PDF,
    description: 'Filter by bibliography type',
    required: false,
  })
  type?: BibliographyTypeEnum;

  @IsOptional()
  @IsString({ message: 'Sort by must be a string' })
  @ApiProperty({
    enum: ['title', 'type', 'duration', 'sequence', 'created_at'],
    example: 'title',
    description: 'Sort by field',
    required: false,
  })
  sortBy?: string;

  @IsOptional()
  @IsString({ message: 'Sort order must be a string' })
  @ApiProperty({
    enum: ['asc', 'desc'],
    example: 'asc',
    description: 'Sort order',
    required: false,
  })
  sortOrder?: 'asc' | 'desc';
}
