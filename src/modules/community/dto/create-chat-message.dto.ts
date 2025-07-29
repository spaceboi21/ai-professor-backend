import { IsNotEmpty, IsString, IsEnum, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RoleEnum } from 'src/common/constants/roles.constant';

export class CreateChatMessageDto {
  @ApiProperty({
    description: 'Receiver user ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty()
  @IsMongoId()
  receiver_id: string;

  @ApiProperty({
    description: 'Receiver role',
    enum: RoleEnum,
    example: RoleEnum.STUDENT,
  })
  @IsNotEmpty()
  @IsEnum(RoleEnum)
  receiver_role: RoleEnum;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, how can I help you with your studies?',
  })
  @IsNotEmpty()
  @IsString()
  message: string;
} 