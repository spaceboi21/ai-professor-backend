import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsMongoId,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { Types } from 'mongoose';
import { BibliographyTypeEnum } from 'src/common/constants/bibliography-type.constant';

export class UpdateBibliographyDto {
  @IsOptional()
  @IsMongoId({ message: 'Module ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the parent module',
    required: false,
  })
  module_id?: string | Types.ObjectId;

  @IsOptional()
  @IsMongoId({ message: 'Chapter ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'ID of the parent chapter',
    required: false,
  })
  chapter_id?: string | Types.ObjectId;

  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @ApiProperty({
    example: 'Introduction to Psychology',
    description: 'Bibliography title',
    required: false,
  })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @ApiProperty({
    example:
      'Comprehensive introduction to psychological concepts and theories.',
    description: 'Description of the bibliography item',
    required: false,
  })
  description?: string;

  @IsOptional()
  @IsEnum(BibliographyTypeEnum, {
    message: 'Type must be a valid bibliography type',
  })
  @ApiProperty({
    enum: BibliographyTypeEnum,
    example: BibliographyTypeEnum.PDF,
    description: 'Type of bibliography item',
    required: false,
  })
  type?: BibliographyTypeEnum;

  @IsOptional()
  @IsString({ message: 'MIME type must be a string' })
  @ApiProperty({
    example: 'application/pdf',
    description: 'MIME type of the file',
    required: false,
  })
  mime_type?: string;

  @IsOptional()
  @IsString({ message: 'Path must be a string' })
  @ApiProperty({
    example: '/uploads/bibliography/intro-psychology.pdf',
    description: 'File path or URL',
    required: false,
  })
  path?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Pages must be a number' })
  @Min(1, { message: 'Pages must be at least 1' })
  @ApiProperty({
    example: 25,
    description: 'Number of pages (for documents)',
    required: false,
  })
  pages?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Duration must be a number' })
  @Min(1, { message: 'Duration must be at least 1 minute' })
  @ApiProperty({
    example: 45,
    description: 'Duration in minutes',
    required: false,
  })
  duration?: number;
}
