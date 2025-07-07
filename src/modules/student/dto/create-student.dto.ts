import { Transform } from 'class-transformer';
import { IsString, IsEmail, IsNotEmpty, IsMongoId } from 'class-validator';

export class CreateStudentDto {
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  first_name: string;

  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  last_name: string;

  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value.toLowerCase())
  email: string;

  @IsString({ message: 'School ID must be a string' })
  @IsNotEmpty({ message: 'School ID is required' })
  @IsMongoId({
    message:
      'The ID provided is not in the correct format. Please use a valid MongoDB ObjectId.',
  })
  school_id: string;
}
