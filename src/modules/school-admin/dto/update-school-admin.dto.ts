import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsMongoId,
} from 'class-validator';
import { LanguageEnum } from 'src/common/constants/language.constant';
import { StatusEnum } from 'src/common/constants/status.constant';
import { Types } from 'mongoose';

export class UpdateSchoolAdminDto {
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @ApiProperty({ example: 'John', required: false })
  first_name?: string;

  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @ApiProperty({ example: 'Doe', required: false })
  last_name?: string;

  @IsOptional()
  @IsString({ message: 'Profile picture must be a string' })
  @ApiProperty({ example: '/uploads/profile.jpg', required: false })
  profile_pic?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Phone must be a number' })
  @ApiProperty({ example: 1234567890, required: false })
  phone?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Country code must be a number' })
  @ApiProperty({ example: 1, required: false })
  country_code?: number;

  @IsOptional()
  @IsEnum(LanguageEnum, {
    message: 'Preferred language must be either "en" or "fr"',
  })
  @ApiProperty({
    description: 'Preferred language for the user interface',
    enum: LanguageEnum,
    example: LanguageEnum.ENGLISH,
    required: false,
  })
  preferred_language?: LanguageEnum;

  @IsOptional()
  @IsEnum(StatusEnum, {
    message: 'Status must be either ACTIVE or INACTIVE',
  })
  @ApiProperty({
    description: 'Account status (Super Admin only)',
    enum: StatusEnum,
    example: StatusEnum.ACTIVE,
    required: false,
  })
  status?: StatusEnum;

  @IsOptional()
  @IsMongoId({ message: 'School ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    description: 'School ID (Super Admin only)',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  school_id?: string | Types.ObjectId;
}
