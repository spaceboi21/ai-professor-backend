import { ApiProperty } from '@nestjs/swagger';
import { IsMimeType, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class GetFileUploadUrl {
  @IsString({ message: 'File name must be a string' })
  @IsNotEmpty({ message: 'File name is required' })
  @MaxLength(255, { message: 'File name must be less than 255 characters' })
  @Matches(/^[a-zA-Z0-9._-]+$/, { 
    message: 'File name can only contain letters, numbers, dots, hyphens, and underscores' 
  })
  @ApiProperty({ 
    example: 'profile_pic.jpg',
    description: 'Original filename (alphanumeric, dots, hyphens, underscores only)'
  })
  fileName: string;

  @IsNotEmpty({ message: 'mimeType is required' })
  @IsMimeType({ message: 'Invalid mimeType format' })
  @Matches(/^image\/(jpeg|jpg|png|webp)$/, {
    message: 'Only image files are allowed (JPEG, PNG, WebP)'
  })
  @ApiProperty({ 
    example: 'image/jpeg',
    description: 'MIME type - must be image/jpeg, image/png, or image/webp'
  })
  mimeType: string;
}
