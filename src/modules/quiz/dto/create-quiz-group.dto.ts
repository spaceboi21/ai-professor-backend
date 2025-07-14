import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsMongoId,
  IsNumber,
  Min,
  ValidateIf,
} from 'class-validator';
import { Types } from 'mongoose';
import { DifficultyEnum } from 'src/common/constants/difficulty.constant';
import {
  QuizCategoryEnum,
  QuizTypeEnum,
} from 'src/common/constants/quiz.constant';

export class CreateQuizGroupDto {
  @IsString({ message: 'Subject must be a string' })
  @IsNotEmpty({ message: 'Subject is required' })
  @ApiProperty({
    example: 'Communication Skills Assessment',
    description: 'Subject of the quiz group',
  })
  subject: string;

  @IsString({ message: 'Description must be a string' })
  @IsNotEmpty({ message: 'Description is required' })
  @ApiProperty({
    example:
      'This quiz group assesses communication skills in various scenarios',
    description: 'Description of the quiz group',
  })
  description: string;

  @IsEnum(DifficultyEnum, {
    message: 'Difficulty must be BEGINNER, INTERMEDIATE, or ADVANCED',
  })
  @IsNotEmpty({ message: 'Difficulty is required' })
  @ApiProperty({
    example: DifficultyEnum.INTERMEDIATE,
    enum: DifficultyEnum,
    description: 'Difficulty level of the quiz group',
  })
  difficulty: DifficultyEnum;

  @IsNumber({}, { message: 'Time left must be a number' })
  @Min(1, { message: 'Time left must be at least 1 minute' })
  @IsNotEmpty({ message: 'Time left is required' })
  @ApiProperty({
    example: 30,
    description: 'Time allowed for the quiz in minutes',
  })
  time_left: number;

  @IsEnum(QuizCategoryEnum, {
    message: 'Category must be ASSESSMENT, COMMUNICATION, ANXIETY, or TRAUMA',
  })
  @IsNotEmpty({ message: 'Category is required' })
  @ApiProperty({
    example: QuizCategoryEnum.COMMUNICATION,
    enum: QuizCategoryEnum,
    description: 'Category of the quiz group',
  })
  category: QuizCategoryEnum;

  @IsEnum(QuizTypeEnum, {
    message: 'Type must be MODULE or CHAPTER',
  })
  @IsNotEmpty({ message: 'Type is required' })
  @ApiProperty({
    example: QuizTypeEnum.MODULE,
    enum: QuizTypeEnum,
    description: 'Type of quiz - whether it belongs to a module or chapter',
  })
  type: QuizTypeEnum;

  @ValidateIf((o) => o.type === QuizTypeEnum.MODULE)
  @IsMongoId({ message: 'Module ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Module ID is required when type is MODULE' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the parent module (required when type is MODULE)',
    required: false,
  })
  module_id?: string | Types.ObjectId;

  @ValidateIf((o) => o.type === QuizTypeEnum.CHAPTER)
  @IsMongoId({ message: 'Chapter ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Chapter ID is required when type is CHAPTER' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'ID of the parent chapter (required when type is CHAPTER)',
    required: false,
  })
  chapter_id?: string | Types.ObjectId;
} 