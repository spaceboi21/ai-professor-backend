import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class UploadCaseDocumentDto {
  @ApiProperty({
    description: 'Case ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  case_id: string;

  @ApiProperty({
    description: 'File name',
    example: 'medical-records.pdf',
  })
  @IsString()
  @IsNotEmpty()
  file_name: string;

  @ApiProperty({
    description: 'File MIME type',
    example: 'application/pdf',
  })
  @IsString()
  @IsNotEmpty()
  mime_type: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1048576,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  file_size?: number;

  @ApiProperty({
    description: 'Base64 encoded file content',
    example: 'JVBERi0xLjQKJeLjz9MK...',
  })
  @IsString()
  @IsNotEmpty()
  file_content: string;
}

export class GetDocumentUrlDto {
  @ApiProperty({
    description: 'Document ID (index in case_documents array)',
    example: '0',
  })
  @IsString()
  @IsNotEmpty()
  document_id: string;
}

