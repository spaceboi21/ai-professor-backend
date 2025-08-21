import { ApiProperty } from '@nestjs/swagger';
import {
  IsMimeType,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  IsEnum,
} from 'class-validator';

export enum BibliographyFileType {
  PDF = 'PDF',
  VIDEO = 'VIDEO',
  POWERPOINT = 'POWERPOINT',
}

export class GetBibliographyUploadUrl {
  @IsString({ message: 'File name must be a string' })
  @IsNotEmpty({ message: 'File name is required' })
  @MaxLength(255, { message: 'File name must be less than 255 characters' })
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'File name can only contain letters, numbers, dots, hyphens, and underscores',
  })
  @ApiProperty({
    example: 'introduction-to-psychology.pdf',
    description:
      'Original filename (alphanumeric, dots, hyphens, underscores only)',
  })
  fileName: string;

  @IsNotEmpty({ message: 'mimeType is required' })
  @IsMimeType({ message: 'Invalid mimeType format' })
  @ApiProperty({
    example: 'application/pdf',
    description:
      'MIME type - must be application/pdf for PDFs, video/* for videos, or application/vnd.ms-powerpoint/application/vnd.openxmlformats-officedocument.presentationml.presentation for PowerPoint files',
  })
  mimeType: string;

  @IsEnum(BibliographyFileType, {
    message: 'File type must be PDF or VIDEO or POWERPOINT',
  })
  @IsNotEmpty({ message: 'File type is required' })
  @ApiProperty({
    enum: BibliographyFileType,
    example: BibliographyFileType.PDF,
    description: 'Type of bibliography file (PDF or VIDEO or POWERPOINT)',
  })
  fileType: BibliographyFileType;
}
