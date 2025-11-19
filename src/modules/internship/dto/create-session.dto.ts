import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { SessionTypeEnum } from 'src/common/constants/internship.constant';

export class CreateSessionDto {
  @ApiProperty({
    description: 'Case ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty()
  @IsString()
  case_id: string;

  @ApiProperty({
    description: 'Session type',
    enum: SessionTypeEnum,
    example: SessionTypeEnum.PATIENT_INTERVIEW,
  })
  @IsEnum(SessionTypeEnum)
  session_type: SessionTypeEnum;
}

