import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { LanguageEnum } from 'src/common/constants/language.constant';

export class LoginSchoolAdminDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }) => value.toLowerCase())
  @ApiProperty({ example: 'techtic.anirudh@gmail.com' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @ApiProperty({ example: '|Co(>#n(-5si' })
  password: string;

  @IsOptional()
  @IsBoolean({ message: 'Remember me must be a boolean' })
  @ApiProperty({
    example: false,
    required: false,
    description: 'If true, token will be valid for 30 days, otherwise 1 day',
  })
  rememberMe?: boolean;

  @IsOptional()
  @IsEnum(LanguageEnum, {
    message: 'Preferred language must be either "en" or "fr"',
  })
  @ApiProperty({
    description: 'Preferred language for the user interface',
    enum: LanguageEnum,
    example: LanguageEnum.FRENCH,
    required: false,
  })
  preferred_language?: LanguageEnum;
}
