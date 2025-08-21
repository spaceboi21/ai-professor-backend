import { ApiProperty } from '@nestjs/swagger';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { LanguageEnum } from 'src/common/constants/language.constant';
import { StatusEnum } from 'src/common/constants/status.constant';

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

export class RoleInfoDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Role ID',
  })
  id: string;

  @ApiProperty({
    example: 'SCHOOL_ADMIN',
    description: 'Role name',
    enum: RoleEnum,
  })
  name: RoleEnum;
}

export class UserMeResponseDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'User ID',
  })
  _id: string;

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
    example: 'STU001',
    description: 'Student code (only for students)',
    required: false,
  })
  student_code?: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'School ID',
    required: false,
  })
  school_id?: string;

  @ApiProperty({
    example: 'https://example.com/profile.jpg',
    description: 'User profile picture URL',
    required: false,
  })
  profile_pic?: string;

  @ApiProperty({
    example: 1234567890,
    description: 'User phone number',
    required: false,
  })
  phone?: number;

  @ApiProperty({
    example: 91,
    description: 'Country code',
    required: false,
  })
  country_code?: number;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the user who created this user',
    required: false,
  })
  created_by?: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Last login timestamp',
    required: false,
  })
  last_logged_in?: Date;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'User creation timestamp',
    required: false,
  })
  created_at?: Date;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'User last update timestamp',
    required: false,
  })
  updated_at?: Date;

  @ApiProperty({
    enum: StatusEnum,
    example: StatusEnum.ACTIVE,
    description: 'User status',
  })
  status: StatusEnum;

  @ApiProperty({
    enum: LanguageEnum,
    example: LanguageEnum.ENGLISH,
    description: 'User preferred language',
  })
  preferred_language: LanguageEnum;

  @ApiProperty({
    type: RoleInfoDto,
    description: 'User role information',
  })
  role: RoleInfoDto;

  @ApiProperty({
    type: SchoolInfoDto,
    description: 'School information',
    required: false,
  })
  school?: SchoolInfoDto;
}
