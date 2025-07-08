import { ApiProperty } from '@nestjs/swagger';
import { IsMimeType, IsNotEmpty, IsString } from 'class-validator';

export class GetFileUploadUrl {
  @IsString({ message: 'File name must be a string' })
  @IsNotEmpty({ message: 'File name is required' })
  @ApiProperty({ example: 'profile_pic.jpg' })
  fileName: string;

  @IsNotEmpty({ message: 'mimeType is required' })
  @ApiProperty({ example: 'Smith' })
  @IsMimeType({ message: 'Invalid mimeType format' })
  mimeType: string;
}
