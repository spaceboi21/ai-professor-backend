import { ApiProperty } from '@nestjs/swagger';
import { AnchorChatSessionStatusEnum } from 'src/common/constants/anchor-chat-session.constant';

export class AnchorChatSessionResponseDto {
  @ApiProperty({
    description: 'Session ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Anchor tag ID',
    example: '507f1f77bcf86cd799439011',
  })
  anchor_tag_id: string;

  @ApiProperty({
    description: 'Module ID',
    example: '507f1f77bcf86cd799439011',
  })
  module_id: string;

  @ApiProperty({
    description: 'Student ID',
    example: '507f1f77bcf86cd799439011',
  })
  student_id: string;

  @ApiProperty({
    description: 'Session status',
    enum: AnchorChatSessionStatusEnum,
  })
  status: AnchorChatSessionStatusEnum;

  @ApiProperty({
    description: 'Session title',
    example: 'Resource Chat for Active Listening',
  })
  session_title: string;

  @ApiProperty({
    description: 'Session description',
    example: 'Chat about resources related to active listening techniques',
  })
  session_description: string;

  @ApiProperty({
    description: 'Total number of messages',
    example: 10,
  })
  total_messages: number;

  @ApiProperty({
    description: 'Number of student messages',
    example: 5,
  })
  student_messages: number;

  @ApiProperty({
    description: 'Number of AI messages',
    example: 5,
  })
  ai_messages: number;

  @ApiProperty({
    description: 'Session started timestamp',
  })
  started_at: Date;

  @ApiProperty({
    description: 'Session ended timestamp',
    required: false,
  })
  ended_at?: Date;

  @ApiProperty({
    description: 'Session creation timestamp',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Session update timestamp',
  })
  updated_at: Date;

  @ApiProperty({
    description: 'AI chat question if exists',
    required: false,
  })
  ai_chat_question?: string;

  @ApiProperty({
    description: 'Whether AI question was asked',
    example: true,
  })
  ai_question_asked: boolean;

  @ApiProperty({
    description: 'Whether AI question was answered',
    example: true,
  })
  ai_question_answered: boolean;

  @ApiProperty({
    description: 'Whether additional questions were asked',
    example: false,
  })
  additional_questions_asked: boolean;
}
