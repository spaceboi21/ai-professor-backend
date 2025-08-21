import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsMongoId,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { StatusEnum } from 'src/common/constants/status.constant';
import { LanguageEnum } from 'src/common/constants/language.constant';

export class CreateStudentDto {
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  @ApiProperty({ example: 'Alice' })
  first_name: string;

  @IsString({ message: 'Last name must be a string' })
  @IsOptional()
  @ApiProperty({ example: 'Smith', required: false })
  last_name: string;

  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value.toLowerCase())
  @ApiProperty({ example: 'alice.smith@student.com' })
  email: string;

  @IsString({ message: 'Profile picture must be a string' })
  @IsOptional()
  @ApiProperty({
    example: 'https://example.com/profile.jpg',
    required: false,
    description: 'Profile picture URL (must be a valid URL)',
  })
  profile_pic?: string;

  @IsOptional()
  @IsString({ message: 'School ID must be a string' })
  @IsNotEmpty({ message: 'School ID is required' })
  @ApiProperty({ example: '60d21b4667d0d8992e610c85' })
  @IsMongoId({
    message:
      'The ID provided is not in the correct format. Please use a valid MongoDB ObjectId.',
  })
  school_id?: string;

  @ApiProperty({
    enum: StatusEnum,
    example: StatusEnum.ACTIVE,
    description: 'Student status (ACTIVE or INACTIVE)',
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
    example: LanguageEnum.FRENCH,
    required: false,
  })
  preferred_language?: LanguageEnum;
}
