import { IsEnum, IsNotEmpty } from 'class-validator';
import { StatusEnum } from '../constants/status.constant';

export class UpdateStatusDto {
  @IsEnum(StatusEnum, {
    message: 'Status must be either ACTIVE or INACTIVE',
  })
  @IsNotEmpty()
  status: StatusEnum;
}
