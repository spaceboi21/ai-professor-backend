import { ApiProperty } from '@nestjs/swagger';
import {
  ResourceTypeEnum,
  ResourceCategoryEnum,
} from 'src/common/constants/ai-resource.constant';

export class AIResourceResponseDto {
  @ApiProperty({
    description: 'Resource ID',
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
    description: 'Resource title',
    example: 'Cardiology Diagnosis Guidelines',
  })
  title: string;

  @ApiProperty({
    description: 'Resource description',
    example:
      'Comprehensive guide to cardiology diagnosis and treatment protocols',
  })
  description: string;

  @ApiProperty({
    description: 'Type of resource',
    enum: ResourceTypeEnum,
    example: ResourceTypeEnum.ARTICLE,
  })
  resource_type: ResourceTypeEnum;

  @ApiProperty({
    description: 'Resource category',
    enum: ResourceCategoryEnum,
    example: ResourceCategoryEnum.STUDY_MATERIAL,
  })
  category: ResourceCategoryEnum;

  @ApiProperty({
    description: 'Resource URL or link',
    example: 'https://example.com/cardiology-guidelines',
  })
  url: string;

  @ApiProperty({
    description: 'Resource tags',
    example: ['cardiology', 'diagnosis', 'guidelines'],
    type: [String],
  })
  tags: string[];

  @ApiProperty({
    description: 'Keywords related to the resource',
    example: ['cardiology', 'diagnosis', 'treatment'],
    type: [String],
  })
  keywords: string[];

  @ApiProperty({
    description: 'Mistakes this resource addresses',
    example: ['Incorrect diagnosis', 'Missing vital signs'],
    type: [String],
  })
  related_mistakes: string[];

  @ApiProperty({
    description: 'Duration in minutes',
    example: 30,
  })
  duration_minutes: number;

  @ApiProperty({
    description: 'Resource author',
    example: 'Dr. John Smith',
    required: false,
  })
  author?: string;

  @ApiProperty({
    description: 'Resource source',
    example: 'American Medical Association',
    required: false,
  })
  source?: string;

  @ApiProperty({
    description: 'Difficulty level (1-5)',
    example: 3,
  })
  difficulty_level: number;

  @ApiProperty({
    description: 'Whether this is a recommended resource',
    example: true,
  })
  is_recommended: boolean;

  @ApiProperty({
    description: 'Whether this resource has been accessed',
    example: false,
  })
  is_accessed: boolean;

  @ApiProperty({
    description: 'Access date',
    example: '2024-01-15T12:00:00.000Z',
    required: false,
  })
  accessed_at?: Date;

  @ApiProperty({
    description: 'Number of times accessed',
    example: 0,
  })
  access_count: number;

  @ApiProperty({
    description: 'Resource metadata',
    example: { source_type: 'academic', language: 'en' },
    required: false,
  })
  resource_metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Creation date',
    example: '2024-01-15T11:35:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2024-01-15T11:35:00.000Z',
  })
  updated_at: Date;
}
