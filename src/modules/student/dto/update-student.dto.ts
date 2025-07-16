import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class UpdateStudentDto {
  @IsString({ message: 'First name must be a string' })
  @IsOptional()
  @ApiProperty({ example: 'Alice', required: false })
  first_name?: string;

  @IsString({ message: 'Last name must be a string' })
  @IsOptional()
  @ApiProperty({ example: 'Smith', required: false })
  last_name?: string;

  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value.toLowerCase())
  @IsOptional()
  @ApiProperty({ example: 'alice.smith@student.com', required: false })
  email?: string;
}
