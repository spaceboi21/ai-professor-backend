import { ApiProperty } from '@nestjs/swagger';

export class EncryptionResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'The original text (before encryption or after decryption)',
    example: 'test@example.com',
  })
  originalText: string;

  @ApiProperty({
    description: 'The encrypted text (after encryption or before decryption)',
    example: 'U2FsdGVkX1+...',
  })
  encryptedText: string;

  @ApiProperty({
    description: 'A message describing the operation result',
    example: 'String encrypted successfully',
  })
  message: string;
}
