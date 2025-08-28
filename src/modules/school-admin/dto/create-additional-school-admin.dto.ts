import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { LanguageEnum } from 'src/common/constants/language.constant';
import { StatusEnum } from 'src/common/constants/status.constant';

export class CreateAdditionalSchoolAdminDto {
  @ApiProperty({
    example: 'Jane',
    description: 'First name of the school admin',
  })
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  first_name: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the school admin',
    required: false,
  })
  @IsString({ message: 'Last name must be a string' })
  @IsOptional()
  last_name?: string;

  @ApiProperty({
    example: 'jane.doe@example.com',
    description: 'Email address',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value.toLowerCase())
  email: string;

  @ApiProperty({
    enum: StatusEnum,
    example: StatusEnum.ACTIVE,
    description: 'Status (optional)',
    required: false,
  })
  @IsEnum(StatusEnum, { message: 'Status must be ACTIVE or INACTIVE' })
  @IsOptional()
  status?: StatusEnum;

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
}
