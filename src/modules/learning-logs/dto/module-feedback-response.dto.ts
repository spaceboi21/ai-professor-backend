import { ApiProperty } from '@nestjs/swagger';

export class ReviewerInfoDto {
  @ApiProperty({
    description: 'Reviewer first name',
    example: 'John',
  })
  first_name: string;

  @ApiProperty({
    description: 'Reviewer last name',
    example: 'Doe',
  })
  last_name: string;

  @ApiProperty({
    description: 'Reviewer email',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Reviewer role',
    example: 'PROFESSOR',
    enum: ['PROFESSOR', 'SCHOOL_ADMIN', 'SUPER_ADMIN'],
  })
  role: string;

  @ApiProperty({
    description: 'Reviewer profile picture URL',
    example: 'https://example.com/profile.jpg',
    required: false,
  })
  profile_pic?: string;
}

export class ModuleFeedbackItemDto {
  @ApiProperty({
    description: 'Review ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Learning log ID that was reviewed',
    example: '507f1f77bcf86cd799439012',
  })
  ai_feedback_id: string;

  @ApiProperty({
    description: 'Rating given by reviewer (1-5 stars)',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  rating: number;

  @ApiProperty({
    description: 'Feedback comment from reviewer',
    example: 'Great communication skills demonstrated. Shows good understanding of patient care principles.',
  })
  feedback: string;

  @ApiProperty({
    description: 'Additional metadata for the review',
    example: {
      strengths: ['communication', 'empathy'],
      areas_for_improvement: ['documentation']
    },
    required: false,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    type: ReviewerInfoDto,
    description: 'Information about the reviewer',
  })
  reviewer_info: ReviewerInfoDto;

  @ApiProperty({
    description: 'Date when review was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Date when review was last updated',
    example: '2024-01-15T10:30:00.000Z',
  })
  updated_at: Date;
}

export class ModuleFeedbackResponseDto {
  @ApiProperty({
    description: 'Module ID',
    example: '507f1f77bcf86cd799439011',
  })
  module_id: string;

  @ApiProperty({
    description: 'Module title',
    example: 'Patient Communication Skills',
  })
  module_title: string;

  @ApiProperty({
    description: 'Total number of feedback received for this module',
    example: 5,
  })
  total_feedback_count: number;

  @ApiProperty({
    description: 'Average rating for this module',
    example: 4.2,
    required: false,
  })
  average_rating?: number;

  @ApiProperty({
    type: [ModuleFeedbackItemDto],
    description: 'List of all feedback received for this module',
  })
  feedback_list: ModuleFeedbackItemDto[];
}
