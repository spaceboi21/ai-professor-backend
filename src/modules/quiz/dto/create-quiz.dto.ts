import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsMongoId,
  IsArray,
  IsNumber,
  Min,
  ValidateIf,
} from 'class-validator';
import { Types } from 'mongoose';
import { QuizQuestionTypeEnum } from 'src/common/constants/quiz.constant';

export class CreateQuizDto {
  @IsMongoId({ message: 'Quiz group ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the quiz group this question belongs to',
    required: false,
  })
  quiz_group_id?: string | Types.ObjectId;

  @IsString({ message: 'Question must be a string' })
  @IsNotEmpty({ message: 'Question is required' })
  @ApiProperty({
    example:
      'What is the most effective way to establish rapport with a client?',
    description: 'The question text',
  })
  question: string;

  @IsEnum(QuizQuestionTypeEnum, {
    message: 'Type must be MULTI_SELECT, SINGLE_SELECT, or SCENARIO_BASED',
  })
  @IsOptional()
  @ApiProperty({
    example: QuizQuestionTypeEnum.SINGLE_SELECT,
    enum: QuizQuestionTypeEnum,
    description: 'Type of the quiz question',
    required: false,
  })
  type?: QuizQuestionTypeEnum;

  @IsArray({ message: 'Options must be an array' })
  @IsString({ each: true, message: 'Each option must be a string' })
  @IsOptional()
  @ApiProperty({
    example: [
      'Listen actively and show empathy',
      'Maintain professional distance',
      'Focus on giving advice immediately',
      'Ask leading questions',
    ],
    description: 'Array of all available options for the question',
    type: [String],
    required: false,
  })
  options?: string[];

  @IsArray({ message: 'Answer must be an array' })
  @IsString({ each: true, message: 'Each answer must be a string' })
  @ApiProperty({
    example: ['Listen actively and show empathy'],
    description: 'Array of correct options (must be from the options array)',
    type: [String],
    required: false,
  })
  @IsOptional()
  answer?: string[];

  @IsString({ message: 'Explanation must be a string' })
  @IsOptional()
  @ApiProperty({
    example:
      'Active listening and empathy are fundamental to building trust and rapport with clients.',
    description: 'Optional explanation for the correct answer',
    required: false,
  })
  explanation?: string;

  @IsNumber({}, { message: 'Sequence must be a number' })
  @Min(1, { message: 'Sequence must be at least 1' })
  @IsOptional()
  @ApiProperty({
    example: 1,
    description:
      'Order of the question in the quiz group (auto-generated if not provided)',
    required: false,
  })
  sequence?: number;

  @IsMongoId({ message: 'Module ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the parent module (optional for direct reference)',
    required: false,
  })
  module_id?: string | Types.ObjectId;

  @ValidateIf((o: CreateQuizDto) => Boolean(o.chapter_id && o.chapter_id !== ''))
  @IsMongoId({ message: 'Chapter ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'ID of the parent chapter (optional for direct reference, can be empty string)',
    required: false,
  })
  chapter_id?: string | Types.ObjectId;

  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  @IsOptional()
  @ApiProperty({
    example: ['Depression', 'Trauma', 'Anxiety'],
    description:
      'Array of tags for categorizing the question (e.g., "Depression", "Trauma")',
    type: [String],
    required: false,
  })
  tags?: string[];
}
