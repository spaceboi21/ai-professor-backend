import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AttachmentDto {
  @ApiProperty({ description: 'Attachment URL' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ description: 'Attachment type' })
  @IsString()
  @IsNotEmpty()
  type: string;
}

export class AddLogbookEntryDto {
  @ApiProperty({
    description: 'Case ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty()
  @IsString()
  case_id: string;

  @ApiPropertyOptional({
    description: 'Session summary',
    example: 'Conducted initial clinical interview with patient presenting anxiety symptoms',
  })
  @IsOptional()
  @IsString()
  session_summary?: string;

  @ApiPropertyOptional({
    description: 'Skills practiced',
    example: ['Active listening', 'Clinical assessment', 'Empathic responding'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills_practiced?: string[];

  @ApiPropertyOptional({
    description: 'Self reflection',
    example: 'I learned the importance of building rapport before diving into clinical questions',
  })
  @IsOptional()
  @IsString()
  self_reflection?: string;

  @ApiPropertyOptional({
    description: 'Attachments',
    type: [AttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}

