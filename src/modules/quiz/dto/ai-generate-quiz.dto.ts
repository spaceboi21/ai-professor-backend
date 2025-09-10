import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsMongoId,
  IsArray,
  ArrayMinSize,
  IsNumber,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Types } from 'mongoose';
import { QuizTypeEnum, QuizQuestionTypeEnum } from 'src/common/constants/quiz.constant';

export class AIGenerateQuizRequest {
  @IsMongoId({ message: 'Module ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Module ID is required' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the module for quiz generation',
  })
  module_id: string | Types.ObjectId;

  @ValidateIf((o) => o.chapter_id && o.chapter_id !== '')
  @IsMongoId({ message: 'Chapter ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'ID of the chapter for quiz generation (optional, can be empty string)',
    required: false,
  })
  chapter_id?: string | Types.ObjectId;

  @IsMongoId({ message: 'Bibliography ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    example: '507f1f77bcf86cd799439013',
    description: 'ID of the bibliography for quiz generation (optional)',
    required: false,
  })
  bibliography_id?: string | Types.ObjectId;

  @IsEnum(QuizTypeEnum, {
    message: 'Type must be MODULE, CHAPTER, or ANCHOR_TAG',
  })
  @IsNotEmpty({ message: 'Quiz type is required' })
  @ApiProperty({
    example: QuizTypeEnum.MODULE,
    enum: QuizTypeEnum,
    description: 'Type of quiz to generate',
  })
  type: QuizTypeEnum;

  @IsString({ message: 'Subject must be a string' })
  @IsNotEmpty({ message: 'Subject is required' })
  @ApiProperty({
    example: 'Psychology',
    description: 'Subject of the quiz',
  })
  subject: string;

  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  @ApiProperty({
    example: 'Basic concepts of cognitive psychology and memory',
    description: 'Description of the quiz content',
    required: false,
  })
  description?: string;

  @IsString({ message: 'Category must be a string' })
  @IsOptional()
  @ApiProperty({
    example: 'Cognitive Psychology',
    description: 'Category of the quiz',
    required: false,
  })
  category?: string;

  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], {
    message: 'Difficulty must be BEGINNER, INTERMEDIATE, or ADVANCED',
  })
  @IsNotEmpty({ message: 'Difficulty is required' })
  @ApiProperty({
    example: 'INTERMEDIATE',
    enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
    description: 'Difficulty level of the quiz',
  })
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

  @IsNumber({}, { message: 'Time left must be a number' })
  @Min(1, { message: 'Time left must be at least 1 minute' })
  @Max(300, { message: 'Time left cannot exceed 300 minutes' })
  @IsNotEmpty({ message: 'Time left is required' })
  @ApiProperty({
    example: 30,
    description: 'Time limit for the quiz in minutes',
    minimum: 1,
    maximum: 300,
  })
  time_left: number;

  @IsNumber({}, { message: 'Question count must be a number' })
  @Min(1, { message: 'Question count must be at least 1' })
  @Max(50, { message: 'Question count cannot exceed 50' })
  @IsNotEmpty({ message: 'Question count is required' })
  @ApiProperty({
    example: 10,
    description: 'Number of questions to generate',
    minimum: 1,
    maximum: 50,
  })
  question_count: number;

  @IsArray({ message: 'Question types must be an array' })
  @ArrayMinSize(1, { message: 'At least one question type is required' })
  @IsEnum(QuizQuestionTypeEnum, {
    each: true,
    message: 'Each question type must be SINGLE_SELECT, MULTI_SELECT, or SCENARIO_BASED',
  })
  @IsNotEmpty({ message: 'Question types are required' })
  @ApiProperty({
    example: [QuizQuestionTypeEnum.SINGLE_SELECT, QuizQuestionTypeEnum.MULTI_SELECT],
    enum: QuizQuestionTypeEnum,
    isArray: true,
    description: 'Types of questions to generate',
  })
  question_types: QuizQuestionTypeEnum[];

  @IsString({ message: 'Content context must be a string' })
  @IsOptional()
  @ApiProperty({
    example: 'Focus on memory formation, retrieval processes, and cognitive biases',
    description: 'Additional context for quiz generation (optional)',
    required: false,
  })
  content_context?: string;
}

export class AIGeneratedQuestion {
  @ApiProperty({
    example: 'What is the primary function of short-term memory?',
    description: 'The question text',
  })
  question: string;

  @ApiProperty({
    example: QuizQuestionTypeEnum.SINGLE_SELECT,
    enum: QuizQuestionTypeEnum,
    description: 'Type of the question',
  })
  type: QuizQuestionTypeEnum;

  @ApiProperty({
    example: [
      'Stores information for 7±2 items',
      'Processes visual information',
      'Controls motor functions',
      'Manages emotional responses',
    ],
    description: 'Array of options for multiple choice questions',
    type: [String],
    required: false,
  })
  options?: string[];

  @ApiProperty({
    example: ['Stores information for 7±2 items'],
    description: 'Array of correct answers',
    type: [String],
  })
  answer: string[];

  @ApiProperty({
    example: 1,
    description: 'Sequence number of the question',
  })
  sequence: number;

  @ApiProperty({
    example: ['Memory', 'Cognitive Psychology', 'Short-term Memory'],
    description: 'Array of tags for the question',
    type: [String],
  })
  tags: string[];
}

export class AIGenerateQuizResponse {
  @ApiProperty({
    type: [AIGeneratedQuestion],
    description: 'Array of generated questions',
  })
  questions: AIGeneratedQuestion[];
}
