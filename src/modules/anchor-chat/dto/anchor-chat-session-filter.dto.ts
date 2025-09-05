import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AnchorChatSessionStatusEnum } from 'src/common/constants/anchor-chat-session.constant';

export class AnchorChatSessionFilterDto {
  @ApiProperty({
    description: 'Filter by anchor tag ID',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  anchor_tag_id?: string;

  @ApiProperty({
    description: 'Filter by module ID',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  module_id?: string;

  @ApiProperty({
    description: 'Filter by session status',
    enum: AnchorChatSessionStatusEnum,
    required: false,
  })
  @IsOptional()
  @IsEnum(AnchorChatSessionStatusEnum)
  status?: AnchorChatSessionStatusEnum;
}
