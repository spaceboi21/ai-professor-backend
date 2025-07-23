import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  MessageSenderEnum,
  MessageTypeEnum,
} from 'src/common/constants/ai-chat-message.constant';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAIMessageDto {
  @ApiProperty({
    description: 'AI session ID',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsMongoId()
  session_id: string;

  @ApiProperty({
    description: 'Module ID',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsMongoId()
  module_id: string;

  @ApiProperty({
    description: 'Type of message',
    enum: MessageTypeEnum,
    example: MessageTypeEnum.TEXT,
    default: MessageTypeEnum.TEXT,
  })
  @IsEnum(MessageTypeEnum)
  message_type: MessageTypeEnum;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, I am a medical student here to practice',
    type: String,
  })
  @IsString()
  content: string;
}
