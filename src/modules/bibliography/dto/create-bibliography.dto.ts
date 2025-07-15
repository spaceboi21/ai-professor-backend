import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { Types } from 'mongoose';
import { BibliographyTypeEnum } from 'src/common/constants/bibliography-type.constant';

export class CreateBibliographyDto {
  @IsOptional()
  @IsMongoId({ message: 'School ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'School ID (required for super admin, optional for other roles)',
    required: false,
  })
  school_id?: string | Types.ObjectId;

  @IsMongoId({ message: 'Module ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Module ID is required' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the parent module',
  })
  module_id: string | Types.ObjectId;

  @IsMongoId({ message: 'Chapter ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Chapter ID is required' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'ID of the parent chapter',
  })
  chapter_id: string | Types.ObjectId;

  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @ApiProperty({
    example: 'Introduction to Psychology',
    description: 'Bibliography title',
  })
  title: string;

  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  @ApiProperty({
    example:
      'Comprehensive introduction to psychological concepts and theories.',
    description: 'Description of the bibliography item',
    required: false,
  })
  description?: string;

  @IsEnum(BibliographyTypeEnum, {
    message: 'Type must be a valid bibliography type',
  })
  @IsNotEmpty({ message: 'Type is required' })
  @ApiProperty({
    enum: BibliographyTypeEnum,
    example: BibliographyTypeEnum.PDF,
    description: 'Type of bibliography item',
  })
  type: BibliographyTypeEnum;

  @IsString({ message: 'MIME type must be a string' })
  @IsNotEmpty({ message: 'MIME type is required' })
  @ApiProperty({
    example: 'application/pdf',
    description: 'MIME type of the file',
  })
  mime_type: string;

  @IsString({ message: 'Path must be a string' })
  @IsNotEmpty({ message: 'Path is required' })
  @ApiProperty({
    example: '/uploads/bibliography/intro-psychology.pdf',
    description: 'File path or URL',
  })
  path: string;

  @IsOptional()
  @IsNumber({}, { message: 'Pages must be a number' })
  @Min(1, { message: 'Pages must be at least 1' })
  @ApiProperty({
    example: 25,
    description: 'Number of pages (for documents)',
    required: false,
  })
  pages?: number;

  @IsNumber({}, { message: 'Duration must be a number' })
  @IsNotEmpty({ message: 'Duration is required' })
  @Min(1, { message: 'Duration must be at least 1 minute' })
  @ApiProperty({
    example: 45,
    description: 'Duration in minutes',
  })
  duration: number;
}
