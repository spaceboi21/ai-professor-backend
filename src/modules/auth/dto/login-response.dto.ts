import { ApiProperty } from '@nestjs/swagger';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { LanguageEnum } from 'src/common/constants/language.constant';

export class SchoolInfoDto {
  @ApiProperty({
    example: 'Springfield High School',
    description: 'Name of the school',
  })
  name: string;

  @ApiProperty({
    example: '/uploads/school-logo.png',
    description: 'Logo URL of the school',
    required: false,
  })
  logo?: string;
}

export class UserInfoDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'User ID',
  })
  id: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  email: string;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
  })
  first_name: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
  })
  last_name: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'School ID',
    required: false,
  })
  school_id?: string;

  @ApiProperty({
    example: 'STU001',
    description: 'Student code (only for students)',
    required: false,
  })
  student_code?: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Role ID',
  })
  role: string;

  @ApiProperty({
    example: 'SCHOOL_ADMIN',
    description: 'Role name',
    enum: RoleEnum,
    required: false,
  })
  role_name?: RoleEnum;

  @ApiProperty({
    example: 'en',
    description: 'User preferred language',
    enum: LanguageEnum,
  })
  preferred_language: LanguageEnum;

  @ApiProperty({
    example: '/uploads/profile.jpg',
    description: 'User profile picture URL',
    required: false,
  })
  profile_pic?: string;
}

export class LoginResponseDto {
  @ApiProperty({
    example: 'Login successful',
    description: 'Success message',
  })
  message: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  access_token: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token',
  })
  refresh_token: string;

  @ApiProperty({
    example: 900,
    description: 'Access token expiry time in seconds',
  })
  access_token_expires_in: number;

  @ApiProperty({
    example: 604800,
    description: 'Refresh token expiry time in seconds',
  })
  refresh_token_expires_in: number;

  @ApiProperty({
    type: UserInfoDto,
    description: 'User information',
  })
  user: UserInfoDto;

  @ApiProperty({
    type: SchoolInfoDto,
    description: 'School information',
    required: false,
  })
  school?: SchoolInfoDto;
}
