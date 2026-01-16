import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetCaseDocumentUploadUrl {
  @ApiProperty({
    description: 'File name',
    example: 'case-document.pdf',
  })
  @IsNotEmpty()
  @IsString()
  fileName: string;

  @ApiProperty({
    description: 'File MIME type',
    example: 'application/pdf',
  })
  @IsNotEmpty()
  @IsString()
  mimeType: string;
}

