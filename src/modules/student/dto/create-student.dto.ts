import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsMongoId,
  IsOptional,
} from 'class-validator';

export class CreateStudentDto {
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  @ApiProperty({ example: 'Alice' })
  first_name: string;

  @ApiProperty({ example: 'Smith' })
  last_name: string;

  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value.toLowerCase())
  @ApiProperty({ example: 'alice.smith@student.com' })
  email: string;

  @IsString({ message: 'School ID must be a string' })
  @IsNotEmpty({ message: 'School ID is required' })
  @ApiProperty({ example: '60d21b4667d0d8992e610c85' })
  @IsMongoId({
    message:
      'The ID provided is not in the correct format. Please use a valid MongoDB ObjectId.',
  })
  school_id: string;
}
