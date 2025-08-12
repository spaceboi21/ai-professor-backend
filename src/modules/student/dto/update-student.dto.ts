import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsEmail, IsOptional, IsEnum, IsUrl } from 'class-validator';
import { StatusEnum } from 'src/common/constants/status.constant';

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

  @IsString({ message: 'Profile picture must be a string' })
  @IsUrl({}, { message: 'Profile picture must be a valid URL' })
  @IsOptional()
  @ApiProperty({
    example: 'https://example.com/profile.jpg',
    required: false,
    description: 'Profile picture URL (must be a valid URL)',
  })
  profile_pic?: string;

  @IsEnum(StatusEnum, { message: 'Status must be a valid status' })
  @IsOptional()
  @ApiProperty({
    enum: StatusEnum,
    example: StatusEnum.ACTIVE,
    required: false,
    description: 'Student status (ACTIVE, INACTIVE)',
  })
  status?: StatusEnum;
}
