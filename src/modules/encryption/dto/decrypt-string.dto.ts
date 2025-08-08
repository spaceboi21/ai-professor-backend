import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class DecryptStringDto {
  @ApiProperty({
    description: 'The encrypted text to decrypt',
    example: 'U2FsdGVkX1+...',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  encryptedText: string;
}
