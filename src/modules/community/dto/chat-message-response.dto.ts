import { ApiProperty } from '@nestjs/swagger';
import { RoleEnum } from 'src/common/constants/roles.constant';

export class ChatMessageResponseDto {
  @ApiProperty({
    description: 'Message ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Sender user ID',
    example: '507f1f77bcf86cd799439011',
  })
  sender_id: string;

  @ApiProperty({
    description: 'Receiver user ID',
    example: '507f1f77bcf86cd799439012',
  })
  receiver_id: string;

  @ApiProperty({
    description: 'Sender role',
    enum: RoleEnum,
    example: RoleEnum.PROFESSOR,
  })
  sender_role: RoleEnum;

  @ApiProperty({
    description: 'Receiver role',
    enum: RoleEnum,
    example: RoleEnum.STUDENT,
  })
  receiver_role: RoleEnum;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, how can I help you with your studies?',
  })
  message: string;

  @ApiProperty({
    description: 'Whether the message has been read',
    example: false,
  })
  is_read: boolean;

  @ApiProperty({
    description: 'When the message was read',
    example: '2024-01-15T10:30:00.000Z',
    required: false,
  })
  read_at?: Date;

  @ApiProperty({
    description: 'When the message was created',
    example: '2024-01-15T10:00:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'When the message was last updated',
    example: '2024-01-15T10:00:00.000Z',
  })
  updated_at: Date;
} 