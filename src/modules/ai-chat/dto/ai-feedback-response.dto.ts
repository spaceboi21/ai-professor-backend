import { ApiProperty } from '@nestjs/swagger';
import {
  FeedbackTypeEnum,
  RatingEnum,
} from 'src/common/constants/ai-chat-feedback.constant';

export class AIFeedbackResponseDto {
  @ApiProperty({
    description: 'Feedback ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'AI session ID',
    example: '507f1f77bcf86cd799439011',
  })
  session_id: string;

  @ApiProperty({
    description: 'Module ID',
    example: '507f1f77bcf86cd799439011',
  })
  module_id: string;

  @ApiProperty({
    description: 'Student ID (automatically set from JWT token)',
    example: '507f1f77bcf86cd799439011',
  })
  student_id: string;

  @ApiProperty({
    description: 'Created by user ID',
    example: '507f1f77bcf86cd799439011',
  })
  created_by: string;

  @ApiProperty({
    description: 'Created by role',
    example: 'student',
  })
  created_by_role: string;

  @ApiProperty({
    description: 'Type of feedback',
    enum: FeedbackTypeEnum,
    example: FeedbackTypeEnum.SUPERVISOR_ANALYSIS,
  })
  feedback_type: FeedbackTypeEnum;

  @ApiProperty({
    description: 'Feedback title',
    example: 'Session Analysis Report',
  })
  title: string;

  @ApiProperty({
    description: 'Detailed feedback content',
    example:
      'The student demonstrated good communication skills but needs improvement in clinical reasoning...',
  })
  content: string;

  @ApiProperty({
    description: 'Numerical rating (1-5)',
    enum: RatingEnum,
    example: RatingEnum.GOOD,
    required: false,
  })
  rating?: RatingEnum;

  @ApiProperty({
    description: 'Keywords extracted from the session',
    example: ['diagnosis', 'symptoms', 'treatment'],
    type: [String],
  })
  keywords: string[];

  @ApiProperty({
    description: 'Mistakes identified in the session',
    example: ['Incorrect diagnosis', 'Missing vital signs'],
    type: [String],
  })
  mistakes: string[];

  @ApiProperty({
    description: 'Student strengths identified',
    example: ['Good communication', 'Professional demeanor'],
    type: [String],
  })
  strengths: string[];

  @ApiProperty({
    description: 'Areas for improvement',
    example: ['Clinical reasoning', 'Differential diagnosis'],
    type: [String],
  })
  areas_for_improvement: string[];

  @ApiProperty({
    description: 'Additional analysis data',
    example: { confidence_score: 0.85, time_spent: 1200 },
    required: false,
  })
  analysis_data?: Record<string, any>;

  @ApiProperty({
    description: 'Feedback metadata',
    example: { analysis_version: '1.0', model_used: 'gpt-4' },
    required: false,
  })
  feedback_metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Whether feedback has been processed',
    example: true,
  })
  is_processed: boolean;

  @ApiProperty({
    description: 'Processing date',
    example: '2024-01-15T11:30:00.000Z',
    required: false,
  })
  processed_at?: Date;

  @ApiProperty({
    description: 'Creation date',
    example: '2024-01-15T11:25:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2024-01-15T11:30:00.000Z',
  })
  updated_at: Date;
}
