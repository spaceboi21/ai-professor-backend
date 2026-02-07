import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsMongoId,
  MinLength,
} from 'class-validator';
import { LanguageEnum } from 'src/common/constants/language.constant';
import { RoleEnum } from 'src/common/constants/roles.constant';

export class CreateMultiAccountDto {
  @ApiProperty({
    description: 'Email address (can be existing or new)',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Password for the account',
    example: 'SecurePassword123!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  last_name: string;

  @ApiProperty({
    description: 'Role ID for the new account',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsNotEmpty()
  role_id: string;

  @ApiProperty({
    description: 'School ID for the new account',
    example: '507f1f77bcf86cd799439012',
  })
  @IsMongoId()
  @IsNotEmpty()
  school_id: string;

  @ApiPropertyOptional({
    description: 'Username (secondary identifier)',
    example: 'john_admin',
  })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({
    description: 'Account code (secondary identifier)',
    example: 'SCHOOL_A_ADMIN',
  })
  @IsString()
  @IsOptional()
  account_code?: string;

  @ApiPropertyOptional({
    description: 'Preferred language',
    enum: LanguageEnum,
    example: LanguageEnum.ENGLISH,
  })
  @IsEnum(LanguageEnum)
  @IsOptional()
  preferred_language?: LanguageEnum;
}

export class UpdateAccountStatusDto {
  @ApiProperty({
    description: 'Account ID to update',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsNotEmpty()
  account_id: string;

  @ApiProperty({
    description: 'New status (ACTIVE or INACTIVE)',
    enum: ['ACTIVE', 'INACTIVE'],
    example: 'ACTIVE',
  })
  @IsString()
  @IsNotEmpty()
  status: 'ACTIVE' | 'INACTIVE';
}

export class GetAccountsByEmailDto {
  @ApiProperty({
    description: 'Email address to search',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class UpdateAccountIdentifiersDto {
  @ApiProperty({
    description: 'Account ID to update',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsNotEmpty()
  account_id: string;

  @ApiPropertyOptional({
    description: 'New username',
    example: 'john_admin_updated',
  })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({
    description: 'New account code',
    example: 'UPDATED_CODE',
  })
  @IsString()
  @IsOptional()
  account_code?: string;
}
