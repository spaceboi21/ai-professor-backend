import { IsMongoId, IsEnum, IsOptional, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AnchorChatSessionTypeEnum } from 'src/common/constants/anchor-chat-session-type.constant';

export class CreateAnchorChatSessionDto {
  @ValidateIf((o) => o.session_type !== AnchorChatSessionTypeEnum.QUIZ)
  @IsMongoId({ message: 'Anchor tag ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    description: 'Anchor tag ID for the chat session (required for AI_CHAT, optional for QUIZ)',
    example: '507f1f77bcf86cd799439011',
    type: String,
    required: false,
  })
  anchor_tag_id?: string;

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
    description: 'Quiz ID for quiz-based sessions (required when session_type is QUIZ)',
    example: '6889b1d6bf6f481d6f9866c4',
    type: String,
    required: false,
  })
  quiz_id?: string;
}
