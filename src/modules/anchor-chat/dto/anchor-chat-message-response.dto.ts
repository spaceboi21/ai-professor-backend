import { ApiProperty } from '@nestjs/swagger';
import {
  AnchorChatMessageSenderEnum,
  AnchorChatMessageTypeEnum,
} from 'src/common/constants/anchor-chat-message.constant';

export class AnchorChatMessageResponseDto {
  @ApiProperty({
    description: 'Message ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Session ID',
    example: '507f1f77bcf86cd799439011',
  })
  session_id: string;

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
    description: 'Message sender',
    enum: AnchorChatMessageSenderEnum,
  })
  sender: AnchorChatMessageSenderEnum;

  @ApiProperty({
    description: 'Message type',
    enum: AnchorChatMessageTypeEnum,
  })
  message_type: AnchorChatMessageTypeEnum;

  @ApiProperty({
    description: 'Message content',
    example: 'Here are some great resources about active listening...',
  })
  content: string;

  @ApiProperty({
    description: 'Message attachments',
    type: [String],
    required: false,
  })
  attachments?: string[];

  @ApiProperty({
    description: 'Message creation timestamp',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Message update timestamp',
  })
  updated_at: Date;
}
