import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class StudentDetailsDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Student ID',
  })
  _id: string;

  @ApiProperty({
    example: 'John',
    description: 'Student first name',
  })
  first_name: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Student last name',
  })
  last_name: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Student email',
  })
  email: string;

  @ApiProperty({
    example: 'STU001',
    description: 'Student code',
  })
  student_code: string;

  @ApiProperty({
    example: 'https://example.com/profile.jpg',
    description: 'Student profile picture URL',
    required: false,
  })
  profile_pic?: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Student creation date',
  })
  created_at: Date;
}

export class ModuleDetailsDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Module ID',
  })
  _id: string;

  @ApiProperty({
    example: 'Child and Adolescent Development Psychology',
    description: 'Module title',
  })
  title: string;

  @ApiProperty({
    example: 'Child Development',
    description: 'Module subject',
  })
  subject: string;

  @ApiProperty({
    example: 'This module covers the fundamental principles of child and adolescent development psychology.',
    description: 'Module description',
  })
  description: string;

  @ApiProperty({
    example: 'Psychology',
    description: 'Module category',
    required: false,
  })
  category?: string;

  @ApiProperty({
    example: 120,
    description: 'Module duration in minutes',
  })
  duration: number;

  @ApiProperty({
    example: 'INTERMEDIATE',
    description: 'Module difficulty level',
  })
  difficulty: string;

  @ApiProperty({
    example: ['psychology', 'child-development', 'counseling'],
    description: 'Module tags',
  })
  tags: string[];

  @ApiProperty({
    example: 'https://example.com/thumbnail.jpg',
    description: 'Module thumbnail URL',
  })
  thumbnail: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Module creation date',
  })
  created_at: Date;
}

export class SessionDetailsDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Session ID',
  })
  _id: string;

  @ApiProperty({
    example: 'Child Counseling Session',
    description: 'Session title',
  })
  session_title: string;

  @ApiProperty({
    example: 'Practice session focusing on child counseling techniques',
    description: 'Session description',
  })
  session_description: string;

  @ApiProperty({
    example: 'ACTIVE',
    description: 'Session status',
  })
  status: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Session start date',
  })
  started_at: Date;

  @ApiProperty({
    example: '2024-01-15T11:45:00.000Z',
    description: 'Session end date',
    required: false,
  })
  ended_at?: Date;

  @ApiProperty({
    example: 15,
    description: 'Total messages in session',
  })
  total_messages: number;

  @ApiProperty({
    example: 8,
    description: 'Number of student messages',
  })
  student_messages: number;

  @ApiProperty({
    example: 7,
    description: 'Number of AI messages',
  })
  ai_messages: number;

  @ApiProperty({
    example: 'child-counseling-scenario',
    description: 'Session scenario',
    required: false,
  })
  scenario?: string;

  @ApiProperty({
    example: { difficulty: 'intermediate', focus: 'empathy' },
    description: 'Session metadata',
    required: false,
  })
  session_metadata?: Record<string, any>;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Session creation date',
  })
  created_at: Date;
}

export class LearningLogsResponseDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Unique identifier for the learning log entry',
  })
  _id: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'AI chat session ID',
  })
  session_id: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Module ID',
  })
  module_id: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Student ID',
  })
  student_id: string;

  @ApiProperty({
    example: 'empathy',
    description: 'Primary skill gap identified',
  })
  primary_skill_gap: string;

  @ApiProperty({
    example: ['empathy', 'listening', 'patience'],
    description: 'All skill gaps identified',
  })
  skill_gaps: string[];

  @ApiProperty({
    example: ['Good communication skills', 'Active listening'],
    description: 'Student strengths identified',
  })
  strengths: string[];

  @ApiProperty({
    example: ['Improve empathy responses', 'Ask more follow-up questions'],
    description: 'Areas for improvement',
  })
  areas_for_improvement: string[];

  @ApiProperty({
    example: ['Missed opportunity to show empathy', 'Could have asked more probing questions'],
    description: 'Missed opportunities during the session',
  })
  missed_opportunities: string[];

  @ApiProperty({
    example: ['Practice active listening', 'Use more empathetic language'],
    description: 'Suggestions for improvement',
  })
  suggestions: string[];

  @ApiProperty({
    example: ['psychology', 'child-development', 'communication'],
    description: 'Keywords for learning',
  })
  keywords_for_learning: string[];

  @ApiProperty({
    example: {
      overall: 7.5,
      communication: 8,
      empathy: 6,
      professionalism: 9,
    },
    description: 'Rating scores for different aspects',
  })
  rating: Record<string, number>;

  @ApiProperty({
    example: '2024-01-15T12:00:00.000Z',
    description: 'When the feedback was created',
  })
  feedback_created_at: Date;

  @ApiProperty({
    example: '2024-01-15T12:00:00.000Z',
    description: 'When the feedback was last updated',
  })
  feedback_updated_at: Date;

  @ApiProperty({
    type: StudentDetailsDto,
    description: 'Detailed student information',
  })
  student: StudentDetailsDto;

  @ApiProperty({
    type: ModuleDetailsDto,
    description: 'Detailed module information',
  })
  module: ModuleDetailsDto;

  @ApiProperty({
    type: SessionDetailsDto,
    description: 'Detailed session information',
  })
  session: SessionDetailsDto;
} 