import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  IsMongoId,
} from 'class-validator';
import { DifficultyEnum } from 'src/common/constants/difficulty.constant';
import { Types } from 'mongoose';

export class CreateModuleDto {
  @IsOptional()
  @IsMongoId({ message: 'School ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description:
      'School ID (required for super admin, optional for other roles)',
    required: false,
  })
  school_id?: string | Types.ObjectId;

  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @ApiProperty({
    example: 'Child and Adolescent Development Psychology',
    description: 'Title of the module',
  })
  title: string;

  @IsString({ message: 'Subject must be a string' })
  @IsNotEmpty({ message: 'Subject is required' })
  @ApiProperty({
    example: 'Child Development',
    description: 'Subject of the module',
  })
  subject: string;

  @IsString({ message: 'Description must be a string' })
  @IsNotEmpty({ message: 'Description is required' })
  @ApiProperty({
    example:
      'This module covers the fundamental principles of child and adolescent development psychology, including cognitive, social, and emotional development stages.',
    description: 'Overview/intro shown in UI',
  })
  description: string;

  @IsString({ message: 'Category must be a string' })
  @IsOptional()
  @ApiProperty({
    example: 'Psychology',
    description: 'Category of the module',
    required: false,
  })
  category?: string;

  @IsNumber({}, { message: 'Duration must be a number' })
  @IsNotEmpty({ message: 'Duration is required' })
  @ApiProperty({
    example: 720,
    description: 'Duration in minutes (e.g. 720 for 12 hours)',
  })
  duration: number;

  @IsEnum(DifficultyEnum, {
    message: 'Difficulty must be BEGINNER, INTERMEDIATE, or ADVANCED',
  })
  @IsNotEmpty({ message: 'Difficulty is required' })
  @ApiProperty({
    example: DifficultyEnum.INTERMEDIATE,
    enum: DifficultyEnum,
    description: 'Difficulty level of the module',
  })
  difficulty: DifficultyEnum;

  @IsArray({ message: 'Tags must be an array' })
  @IsOptional()
  @ApiProperty({
    example: ['psychology', 'child-development', 'cognitive-development'],
    description: 'Array of tags for better searching and filtering',
    required: false,
    type: [String],
  })
  tags?: string[];

  @IsString({ message: 'Thumbnail must be a string' })
  @IsOptional()
  @ApiProperty({
    example: '/images/module-thumbnails/child-development.jpg',
    description: 'Thumbnail image path for the module',
    required: false,
  })
  thumbnail?: string;
}
