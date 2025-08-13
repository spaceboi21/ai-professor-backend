import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
} from 'class-validator';
import { StatusEnum } from 'src/common/constants/status.constant';

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
  @Matches(/\.(jpg|jpeg|png|webp)(\?.*)?$/i, {
    message: 'Profile picture must be an image file (jpg, jpeg, png, webp)',
  })
  @ApiProperty({
    example:
      'https://bucket.s3.amazonaws.com/profile-pics/123-uuid-filename.jpg',
    description: 'Profile picture URL from authorized upload',
    required: false,
  })
  profile_pic?: string;

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

export class UpdateProfessorPasswordDto {
  @IsString({ message: 'Current password must be a string' })
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: 'Old password is required' })
  @ApiProperty({ example: 'OldPassword123!' })
  old_password: string;

  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/,
    {
      message:
        'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character',
    },
  )
  @ApiProperty({
    example: 'NewPassword123!',
    description:
      'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
  })
  new_password: string;
}
