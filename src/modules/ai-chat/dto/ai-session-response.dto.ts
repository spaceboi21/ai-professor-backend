import { ApiProperty } from '@nestjs/swagger';
import { AISessionStatusEnum } from 'src/common/constants/ai-chat-session.constant';

export class AISessionResponseDto {
  @ApiProperty({
    description: 'AI session ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

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
    description: 'Session status',
    enum: AISessionStatusEnum,
    example: AISessionStatusEnum.ACTIVE,
  })
  status: AISessionStatusEnum;

  @ApiProperty({
    description: 'Session start date',
    example: '2024-01-15T10:00:00.000Z',
  })
  started_at: Date;

  @ApiProperty({
    description: 'Session end date',
    example: '2024-01-15T11:30:00.000Z',
    required: false,
  })
  ended_at?: Date;

  @ApiProperty({
    description: 'Total number of messages',
    example: 25,
  })
  total_messages: number;

  @ApiProperty({
    description: 'Number of student messages',
    example: 12,
  })
  student_messages: number;

  @ApiProperty({
    description: 'Number of AI messages',
    example: 13,
  })
  ai_messages: number;

  @ApiProperty({
    description: 'Session title',
    example: 'Cardiology Practice Session',
  })
  session_title: string;

  @ApiProperty({
    description: 'Session description',
    example: 'AI practice session for cardiology module',
  })
  session_description: string;

  @ApiProperty({
    description: 'Session metadata',
    example: { module_title: 'Cardiology Basics', student_name: 'John Doe' },
    required: false,
  })
  session_metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Creation date',
    example: '2024-01-15T10:00:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2024-01-15T11:30:00.000Z',
  })
  updated_at: Date;
}
