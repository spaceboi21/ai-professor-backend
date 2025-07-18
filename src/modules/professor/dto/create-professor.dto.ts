import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsEmail, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { StatusEnum } from 'src/common/constants/status.constant';

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
  @IsString({ message: 'Last name must be a string' })
  @IsOptional()
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

  @ApiProperty({
    enum: StatusEnum,
    example: StatusEnum.ACTIVE,
    description: 'Professor status (ACTIVE or INACTIVE)',
    required: false,
  })
  @IsEnum(StatusEnum, { message: 'Status must be ACTIVE or INACTIVE' })
  @IsOptional()
  status?: StatusEnum;
}
