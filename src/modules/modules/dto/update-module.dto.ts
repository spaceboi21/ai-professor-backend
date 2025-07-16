import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  IsMongoId,
} from 'class-validator';
import { DifficultyEnum } from 'src/common/constants/difficulty.constant';
import { Types } from 'mongoose';

export class UpdateModuleDto {
  @IsOptional()
  @IsMongoId({ message: 'School ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description:
      'School ID (required for super admin, optional for other roles)',
    required: false,
  })
  school_id?: string | Types.ObjectId;

  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @ApiProperty({
    example: 'Child and Adolescent Development Psychology',
    description: 'Title of the module',
    required: false,
  })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Subject must be a string' })
  @ApiProperty({
    example: 'Child Development',
    description: 'Subject of the module',
    required: false,
  })
  subject?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @ApiProperty({
    example:
      'This module covers the fundamental principles of child and adolescent development psychology, including cognitive, social, and emotional development stages.',
    description: 'Overview/intro shown in UI',
    required: false,
  })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Category must be a string' })
  @ApiProperty({
    example: 'Psychology',
    description: 'Category of the module',
    required: false,
  })
  category?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Duration must be a number' })
  @ApiProperty({
    example: 720,
    description: 'Duration in minutes (e.g. 720 for 12 hours)',
    required: false,
  })
  duration?: number;

  @IsOptional()
  @IsEnum(DifficultyEnum, {
    message: 'Difficulty must be BEGINNER, INTERMEDIATE, or ADVANCED',
  })
  @ApiProperty({
    example: DifficultyEnum.INTERMEDIATE,
    enum: DifficultyEnum,
    description: 'Difficulty level of the module',
    required: false,
  })
  difficulty?: DifficultyEnum;

  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @ApiProperty({
    example: ['psychology', 'child-development', 'cognitive-development'],
    description: 'Array of tags for better searching and filtering',
    required: false,
    type: [String],
  })
  tags?: string[];

  @IsOptional()
  @IsString({ message: 'Thumbnail must be a string' })
  @ApiProperty({
    example: '/images/module-thumbnails/child-development.jpg',
    description: 'Thumbnail image path for the module',
    required: false,
  })
  thumbnail?: string;
}
