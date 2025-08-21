import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class GetThumbnailUploadUrl {
  @ApiProperty({
    description: 'Name of the file to upload',
    example: 'thumbnail.jpg',
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'image/jpeg',
    enum: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
  mimeType: string;
}
