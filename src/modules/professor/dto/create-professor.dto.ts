import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProfessorDto {
  @ApiProperty({ example: 'John', description: 'First name of the professor' })
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  first_name: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the professor',
    required: false,
  })
  last_name: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value.toLowerCase())
  email: string;

  @ApiProperty({
    example: '60d21b4667d0d8992e610c85',
    description: 'School ID (MongoDB ObjectId)',
  })
  @IsString({ message: 'School ID must be a string' })
  @IsNotEmpty({ message: 'School ID is required' })
  school_id: string;
}
