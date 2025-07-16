import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { StatusEnum } from '../constants/status.constant';

export class UpdateStatusDto {
  @ApiProperty({
    description: 'Status of the entity',
    enum: StatusEnum,
    example: StatusEnum.ACTIVE,
  })
  @IsEnum(StatusEnum, {
    message: 'Status must be either ACTIVE or INACTIVE',
  })
  @IsNotEmpty()
  status: StatusEnum;
}
