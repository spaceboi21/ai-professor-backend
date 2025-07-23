import { ApiProperty } from '@nestjs/swagger';
import {
  MessageSenderEnum,
  MessageTypeEnum,
} from 'src/common/constants/ai-chat-message.constant';

export class AIMessageResponseDto {
  @ApiProperty({
    description: 'Message ID',
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
    description: 'Message sender',
    enum: MessageSenderEnum,
    example: MessageSenderEnum.STUDENT,
  })
  sender: MessageSenderEnum;

  @ApiProperty({
    description: 'Message type',
    enum: MessageTypeEnum,
    example: MessageTypeEnum.TEXT,
  })
  message_type: MessageTypeEnum;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, I am a medical student here to practice',
  })
  content: string;

  @ApiProperty({
    description: 'File attachments',
    example: ['https://example.com/file1.pdf'],
    type: [String],
  })
  attachments: string[];



  @ApiProperty({
    description: 'Message metadata',
    example: { confidence_score: 0.95, processing_time: 1200 },
    required: false,
  })
  message_metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Whether this is a system message',
    example: false,
  })
  is_system_message: boolean;

  @ApiProperty({
    description: 'Whether this message has an error',
    example: false,
  })
  is_error: boolean;

  @ApiProperty({
    description: 'Error message if any',
    example: 'Failed to process message',
    required: false,
  })
  error_message?: string;

  @ApiProperty({
    description: 'Creation date',
    example: '2024-01-15T10:05:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2024-01-15T10:05:00.000Z',
  })
  updated_at: Date;
}
