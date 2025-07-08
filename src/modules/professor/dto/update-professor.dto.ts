import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateProfessorDto {
  //   @IsOptional()
  //   @IsEmail({}, { message: 'Invalid email format' })
  //   @Transform(({ value }) => value?.toLowerCase())
  //   email?: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ example: 1234567890, required: false })
  phone?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ example: 1, required: false })
  country_code?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'John', required: false })
  first_name?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Doe', required: false })
  last_name?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'John', required: false })
  profile_pic?: string;
}

export class UpdateProfessorPasswordDto {
  @IsString()
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: 'Old password is required' })
  @ApiProperty({ example: 'OldPassword123!' })
  old_password: string;

  @IsString()
  @ApiProperty({ example: 'NewPassword456!' })
  new_password: string;
}
