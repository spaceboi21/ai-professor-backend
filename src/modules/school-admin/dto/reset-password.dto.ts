import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'Old password must be a string' })
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: 'Old password is required' })
  @ApiProperty({
    example: 'OldPassword123!',
    description: 'Current password for verification',
  })
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
      'New password - must be at least 8 characters with uppercase, lowercase, number, and special character',
  })
  new_password: string;
}
