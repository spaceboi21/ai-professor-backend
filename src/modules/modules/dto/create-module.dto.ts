import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { DifficultyEnum } from 'src/common/constants/difficulty.constant';

export class CreateModuleDto {
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
}
