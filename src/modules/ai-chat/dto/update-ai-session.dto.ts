import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { AISessionStatusEnum } from 'src/common/constants/ai-chat-session.constant';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAISessionDto {
  @ApiProperty({
    description: 'Session status',
    enum: AISessionStatusEnum,
    example: AISessionStatusEnum.COMPLETED,
    required: false,
  })
  @IsOptional()
  @IsEnum(AISessionStatusEnum)
  status?: AISessionStatusEnum;

  @ApiProperty({
    description: 'Session title',
    example: 'Updated Cardiology Practice Session',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  session_title?: string;

  @ApiProperty({
    description: 'Session description',
    example: 'Updated description for the cardiology practice session',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  session_description?: string;

  @ApiProperty({
    description: 'Session end date',
    example: '2024-01-15T10:30:00.000Z',
    required: false,
    type: Date,
  })
  @IsOptional()
  @IsDate()
  ended_at?: Date;
}
