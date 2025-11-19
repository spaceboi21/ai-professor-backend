import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { InternshipVisibilityActionEnum } from 'src/common/constants/internship.constant';
import { Types } from 'mongoose';

export class ToggleInternshipVisibilityDto {
  @ApiPropertyOptional({
    description: 'School ID (required for SUPER_ADMIN)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  school_id?: string | Types.ObjectId;

  @ApiProperty({
    description: 'Internship ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty()
  internship_id: string;

  @ApiProperty({
    description: 'Action to perform',
    enum: InternshipVisibilityActionEnum,
    example: InternshipVisibilityActionEnum.PUBLISH,
  })
  @IsEnum(InternshipVisibilityActionEnum)
  action: InternshipVisibilityActionEnum;
}

