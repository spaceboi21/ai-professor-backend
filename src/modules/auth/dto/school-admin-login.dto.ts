import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginSchoolAdminDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  password: string;
}
