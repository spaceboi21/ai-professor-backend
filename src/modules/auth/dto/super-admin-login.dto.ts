import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class LoginSuperAdminDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }) => value.toLowerCase())
  @ApiProperty({ example: 'superadmin.aiprofessor@yopmail.com' })
  email: string;

  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  @ApiProperty({ example: 'superAdmin@123' })
  password: string;
}
