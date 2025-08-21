import { ApiProperty } from '@nestjs/swagger';
import { RoleEnum } from 'src/common/constants/roles.constant';

export class LearningLogReviewResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the review',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Reference to the AI chat feedback (learning log)',
    example: '507f1f77bcf86cd799439012',
  })
  ai_feedback_id: string;

  @ApiProperty({
    description: 'Reference to the reviewer (user who gave the review)',
    example: '507f1f77bcf86cd799439013',
  })
  reviewer_id: string;

  @ApiProperty({
    description: 'Role of the reviewer',
    enum: RoleEnum,
    example: RoleEnum.PROFESSOR,
  })
  reviewer_role: RoleEnum;

  @ApiProperty({
    description: 'Rating given by the reviewer (1-5 stars)',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  rating: number;

  @ApiProperty({
    description: 'Feedback/comment given by the reviewer',
    example: 'Great communication skills demonstrated. Shows good understanding of patient care principles.',
  })
  feedback: string;

  @ApiProperty({
    description: 'Additional metadata for the review',
    example: { strengths: ['communication', 'empathy'], areas_for_improvement: ['documentation'] },
  })
  metadata: Record<string, any>;

  @ApiProperty({
    description: 'Reviewer information',
    example: {
      first_name: 'Dr. John',
      last_name: 'Smith',
      email: 'john.smith@university.edu',
      profile_pic: 'https://example.com/profile.jpg',
    },
  })
  reviewer_info?: {
    first_name: string;
    last_name: string;
    email: string;
    profile_pic?: string;
  };

  @ApiProperty({
    description: 'When the review was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'When the review was last updated',
    example: '2024-01-15T10:30:00.000Z',
  })
  updated_at: Date;
} 