import { Transform } from 'class-transformer';
import { IsString, IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProfessorDto {
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  first_name: string;

  @IsString({ message: 'Last name must be a string' })
  @IsOptional()
  last_name: string;

  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value.toLowerCase())
  email: string;

  @IsString({ message: 'School ID must be a string' })
  @IsNotEmpty({ message: 'School ID is required' })
  school_id: string;
}
