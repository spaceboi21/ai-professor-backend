import { IsOptional, IsMongoId, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RoleEnum } from 'src/common/constants/roles.constant';

export class ChatConversationFilterDto {
  @ApiProperty({
    description: 'User ID to get conversations with',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  user_id?: string;

  @ApiProperty({
    description: 'User role to filter conversations',
    enum: RoleEnum,
    example: RoleEnum.STUDENT,
    required: false,
  })
  @IsOptional()
  @IsEnum(RoleEnum)
  user_role?: RoleEnum;

  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    required: false,
  })
  @IsOptional()
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    required: false,
  })
  @IsOptional()
  limit?: number;
} 