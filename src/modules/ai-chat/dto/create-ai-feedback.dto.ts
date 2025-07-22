import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  FeedbackTypeEnum,
  RatingEnum,
} from 'src/common/constants/ai-chat-feedback.constant';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAIFeedbackDto {
  @ApiProperty({
    description: 'AI session ID',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsMongoId()
  session_id: string;

  @ApiProperty({
    description: 'Module ID',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsMongoId()
  module_id: string;

  @ApiProperty({
    description: 'Type of feedback',
    enum: FeedbackTypeEnum,
    example: FeedbackTypeEnum.SUPERVISOR_ANALYSIS,
  })
  @IsEnum(FeedbackTypeEnum)
  feedback_type: FeedbackTypeEnum;

  @ApiProperty({
    description: 'Feedback title',
    example: 'Session Analysis Report',
    type: String,
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Detailed feedback content',
    example:
      'The student demonstrated good communication skills but needs improvement in clinical reasoning...',
    type: String,
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Optional numerical rating (1-5)',
    enum: RatingEnum,
    example: RatingEnum.GOOD,
    required: false,
  })
  @IsOptional()
  @IsEnum(RatingEnum)
  rating?: RatingEnum;

  @ApiProperty({
    description: 'Keywords extracted from the session',
    example: ['diagnosis', 'symptoms', 'treatment'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiProperty({
    description: 'Mistakes identified in the session',
    example: ['Incorrect diagnosis', 'Missing vital signs'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mistakes?: string[];

  @ApiProperty({
    description: 'Student strengths identified',
    example: ['Good communication', 'Professional demeanor'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  strengths?: string[];

  @ApiProperty({
    description: 'Areas for improvement',
    example: ['Clinical reasoning', 'Differential diagnosis'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  areas_for_improvement?: string[];

  @ApiProperty({
    description: 'Additional analysis data',
    example: { confidence_score: 0.85, time_spent: 1200 },
    required: false,
    type: Object,
  })
  @IsOptional()
  @IsObject()
  analysis_data?: Record<string, any>;
}
