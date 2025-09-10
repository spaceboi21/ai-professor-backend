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
import { QuizTypeEnum } from 'src/common/constants/quiz.constant';

export class CreateQuizGroupDto {
  @IsString({ message: 'Subject must be a string' })
  @IsNotEmpty({ message: 'Subject is required' })
  @ApiProperty({
    example: 'Communication Skills Assessment',
    description: 'Subject of the quiz group',
  })
  subject: string;

  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  @ApiProperty({
    example:
      'This quiz group assesses communication skills in various scenarios',
    description: 'Description of the quiz group',
    required: false,
  })
  description?: string;

  @IsEnum(DifficultyEnum, {
    message: 'Difficulty must be BEGINNER, INTERMEDIATE, or ADVANCED',
  })
  @IsOptional()
  @ApiProperty({
    example: DifficultyEnum.INTERMEDIATE,
    enum: DifficultyEnum,
    description: 'Difficulty level of the quiz group',
    required: false,
  })
  difficulty?: DifficultyEnum;

  @IsNumber({}, { message: 'Time left must be a number' })
  @Min(1, { message: 'Time left must be at least 1 minute' })
  @IsOptional()
  @ApiProperty({
    example: 30,
    description: 'Time allowed for the quiz in minutes',
    required: false,
  })
  time_left?: number;

  @IsString({ message: 'Category must be a string' })
  @IsOptional()
  @ApiProperty({
    example: 'COMMUNICATION',
    description: 'Category of the quiz group',
    required: false,
  })
  category?: string;

  @IsEnum(QuizTypeEnum, {
    message: 'Type must be MODULE, CHAPTER, or ANCHOR_TAG',
  })
  @IsOptional()
  @ApiProperty({
    example: QuizTypeEnum.MODULE,
    enum: QuizTypeEnum,
    description:
      'Type of quiz - whether it belongs to a module, chapter, or anchor tag',
    required: false,
  })
  type?: QuizTypeEnum;

  @IsMongoId({ message: 'Module ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the parent module',
    required: false,
  })
  module_id?: string | Types.ObjectId;

  @ValidateIf((o: CreateQuizGroupDto) => o.chapter_id && o.chapter_id !== '')
  @IsMongoId({ message: 'Chapter ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'ID of the parent chapter (optional, can be empty string)',
    required: false,
  })
  chapter_id?: string | Types.ObjectId;

  @IsMongoId({ message: 'Bibliography ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    example: '507f1f77bcf86cd799439013',
    description: 'ID of the bibliography item',
    required: false,
  })
  bibliography_id?: string | Types.ObjectId;
}
