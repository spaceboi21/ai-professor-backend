import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class SetNewPasswordDto {
  @IsOptional()
  @IsString({ message: 'Current password must be a string' })
  @ApiProperty({
    example: '{n!Zb>0toGg:',
    description: 'Current password (optional - only validated if provided)',
    required: false,
  })
  current_password?: string;

  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token is required' })
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Reset password token received via email',
  })
  token: string;

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
    example: 'Test@123',
    description:
      'New password - must be at least 8 characters with uppercase, lowercase, number, and special character',
  })
  new_password: string;
}
