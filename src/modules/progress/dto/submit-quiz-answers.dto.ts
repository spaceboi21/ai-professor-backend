import { ApiProperty } from '@nestjs/swagger';
import {
  IsMongoId,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsString,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';

export class QuizAnswerDto {
  @IsMongoId({ message: 'Quiz ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Quiz ID is required' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the quiz question',
  })
  quiz_id: string | Types.ObjectId;

  @IsArray({ message: 'Selected answers must be an array' })
  @IsString({ each: true, message: 'Each selected answer must be a string' })
  @ApiProperty({
    example: ['Option A', 'Option B'],
    description: 'Array of selected answers',
    type: [String],
  })
  selected_answers: string[];

  @IsOptional()
  @IsNumber({}, { message: 'Time spent must be a number' })
  @Min(0, { message: 'Time spent cannot be negative' })
  @ApiProperty({
    example: 30,
    description: 'Time spent on this question in seconds',
    required: false,
  })
  time_spent_seconds?: number;
}

export class SubmitQuizAnswersDto {
  @IsMongoId({ message: 'Quiz Group ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Quiz Group ID is required' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the quiz group',
  })
  quiz_group_id: string | Types.ObjectId;

  @IsArray({ message: 'Answers must be an array' })
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  @ApiProperty({
    description: 'Array of quiz answers',
    type: [QuizAnswerDto],
  })
  answers: QuizAnswerDto[];

  @IsOptional()
  @IsNumber({}, { message: 'Total time taken must be a number' })
  @Min(0, { message: 'Total time taken cannot be negative' })
  @ApiProperty({
    example: 300,
    description: 'Total time taken for the quiz in minutes',
    required: false,
  })
  total_time_taken_minutes?: number;
}
