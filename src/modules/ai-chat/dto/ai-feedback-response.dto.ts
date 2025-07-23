import { ApiProperty } from '@nestjs/swagger';
import { FeedbackTypeEnum } from 'src/common/constants/ai-chat-feedback.constant';
import { RatingObjectType } from 'src/common/types/ai-chat-module.type';

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
    example: {
      overall_score: 7,
      communication_score: 8,
      clinical_score: 6,
      professionalism_score: 9,
    },
  })
  rating: RatingObjectType;

  @ApiProperty({
    description: 'Keywords extracted from the session',
    example: ['diagnosis', 'symptoms', 'treatment'],
    type: [String],
  })
  keywords_for_learning: string[];

  @ApiProperty({
    description: 'Suggestions for improvement',
    example: ['Incorrect diagnosis', 'Missing vital signs'],
    type: [String],
  })
  suggestions: string[];

  @ApiProperty({
    description: 'Missed opportunities',
    example: ['Good communication', 'Professional demeanor'],
    type: [String],
  })
  missed_opportunities: string[];

  @ApiProperty({
    description: 'Strengths',
    example: ['Clinical reasoning', 'Differential diagnosis'],
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
    description: 'Last update date',
    example: '2024-01-15T11:30:00.000Z',
  })
  updated_at: Date;
}
