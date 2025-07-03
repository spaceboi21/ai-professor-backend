import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsPhoneNumber,
  IsNumber,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSchoolAdminDto {
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  first_name: string;

  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  last_name: string;

  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  // Example: Add basic complexity rule (optional)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @IsOptional({ message: 'Phone number is optional' })
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Phone number must be a valid number' })
  @Type(() => Number)
  phone?: number;

  @IsOptional({ message: 'Country code is optional' })
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Country code must be a valid number' })
  @Type(() => Number)
  country_code?: number;

  @IsString({ message: 'School ID must be a string' })
  @IsNotEmpty({ message: 'School ID is required' })
  school_id: string;
}
