import {
  IsEnum,
  IsMongoId,
  IsString,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { AnchorChatMessageTypeEnum } from 'src/common/constants/anchor-chat-message.constant';
import { AnchorChatSessionTypeEnum } from 'src/common/constants/anchor-chat-session-type.constant';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnchorChatMessageDto {
  @ApiProperty({
    description: 'Anchor chat session ID',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsMongoId()
  session_id: string;

  @ValidateIf((o) => o.session_type !== AnchorChatSessionTypeEnum.QUIZ)
  @IsMongoId({ message: 'Anchor tag ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    description: 'Anchor tag ID (required for AI_CHAT, optional for QUIZ)',
    example: '507f1f77bcf86cd799439011',
    type: String,
    required: false,
  })
  anchor_tag_id?: string;

  @ApiProperty({
    description: 'Module ID',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsMongoId()
  module_id: string;

  @ApiProperty({
    description: 'Type of message',
    enum: AnchorChatMessageTypeEnum,
    example: AnchorChatMessageTypeEnum.TEXT,
    default: AnchorChatMessageTypeEnum.TEXT,
  })
  @IsEnum(AnchorChatMessageTypeEnum)
  message_type: AnchorChatMessageTypeEnum;

  @ApiProperty({
    description:
      'Message content - ask questions about resources related to this anchor tag',
    example: 'Can you suggest some resources about active listening techniques?',
    type: String,
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Type of session - AI chat or Quiz',
    enum: AnchorChatSessionTypeEnum,
    example: AnchorChatSessionTypeEnum.AI_CHAT,
    required: false,
  })
  @IsEnum(AnchorChatSessionTypeEnum)
  @IsOptional()
  session_type?: AnchorChatSessionTypeEnum;

  @ValidateIf((o) => o.session_type === AnchorChatSessionTypeEnum.QUIZ)
  @IsMongoId({ message: 'Quiz ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    description:
      'Quiz ID for quiz-based sessions (required when session_type is QUIZ)',
    example: '6889b1d6bf6f481d6f9866c4',
    type: String,
    required: false,
  })
  quiz_id?: string;
}