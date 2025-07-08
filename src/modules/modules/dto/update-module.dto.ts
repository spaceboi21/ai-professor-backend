import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { DifficultyEnum } from 'src/common/constants/difficulty.constant';

export class UpdateModuleDto {
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
}
