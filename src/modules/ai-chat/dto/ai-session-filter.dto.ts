import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { AISessionStatusEnum } from 'src/common/constants/ai-chat-session.constant';
import { ApiProperty } from '@nestjs/swagger';

export class AISessionFilterDto {
  @ApiProperty({
    description: 'Filter by module ID',
    example: '507f1f77bcf86cd799439011',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsMongoId()
  module_id?: string;

  @ApiProperty({
    description: 'Filter by session status',
    enum: AISessionStatusEnum,
    example: AISessionStatusEnum.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(AISessionStatusEnum)
  status?: AISessionStatusEnum;
}
