import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class EncryptStringDto {
  @ApiProperty({
    description: 'The text to encrypt',
    example: 'test@example.com',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  text: string;
}
