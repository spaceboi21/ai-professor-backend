import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { Types } from 'mongoose';
import {
  AttachmentEntityTypeEnum,
  AttachmentStatusEnum,
} from 'src/database/schemas/tenant/forum-attachment.schema';

export class CreateForumAttachmentDto {
  @IsMongoId({ message: 'Discussion ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Discussion ID is required' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the discussion to attach the file to',
  })
  discussion_id: string | Types.ObjectId;

  @IsOptional()
  @IsMongoId({ message: 'Reply ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description:
      'ID of the reply to attach the file to (optional for discussion attachments)',
    required: false,
  })
  reply_id?: string | Types.ObjectId;

  @IsEnum(AttachmentEntityTypeEnum, {
    message: 'Entity type must be DISCUSSION or REPLY',
  })
  @IsNotEmpty({ message: 'Entity type is required' })
  @ApiProperty({
    example: AttachmentEntityTypeEnum.DISCUSSION,
    description: 'Type of entity to attach the file to',
    enum: AttachmentEntityTypeEnum,
  })
  entity_type: AttachmentEntityTypeEnum;

  @IsString({ message: 'Original filename must be a string' })
  @IsNotEmpty({ message: 'Original filename is required' })
  @ApiProperty({
    example: 'document.pdf',
    description: 'Original filename of the uploaded file',
  })
  original_filename: string;

  @IsString({ message: 'Stored filename must be a string' })
  @IsNotEmpty({ message: 'Stored filename is required' })
  @ApiProperty({
    example: '1234567890-uuid-document.pdf',
    description: 'Generated filename for storage',
  })
  stored_filename: string;

  @IsString({ message: 'File URL must be a string' })
  @IsNotEmpty({ message: 'File URL is required' })
  @ApiProperty({
    example:
      'https://bucket.s3.amazonaws.com/forum-attachments/1234567890-uuid-document.pdf',
    description: 'URL where the file is stored',
  })
  file_url: string;

  @IsString({ message: 'MIME type must be a string' })
  @IsNotEmpty({ message: 'MIME type is required' })
  @ApiProperty({
    example: 'application/pdf',
    description: 'MIME type of the uploaded file',
  })
  mime_type: string;

  @IsNumber({}, { message: 'File size must be a number' })
  @IsNotEmpty({ message: 'File size is required' })
  @ApiProperty({
    example: 1024000,
    description: 'File size in bytes',
  })
  file_size: number;
}

export class ForumAttachmentResponseDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Attachment ID',
  })
  _id: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Discussion ID',
  })
  discussion_id: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Reply ID (null for discussion attachments)',
    required: false,
  })
  reply_id?: string;

  @ApiProperty({
    example: AttachmentEntityTypeEnum.DISCUSSION,
    description: 'Entity type',
    enum: AttachmentEntityTypeEnum,
  })
  entity_type: AttachmentEntityTypeEnum;

  @ApiProperty({
    example: 'document.pdf',
    description: 'Original filename',
  })
  original_filename: string;

  @ApiProperty({
    example:
      'https://bucket.s3.amazonaws.com/forum-attachments/1234567890-uuid-document.pdf',
    description: 'File URL',
  })
  file_url: string;

  @ApiProperty({
    example: 'application/pdf',
    description: 'MIME type',
  })
  mime_type: string;

  @ApiProperty({
    example: 1024000,
    description: 'File size in bytes',
  })
  file_size: number;

  @ApiProperty({
    example: {
      _id: '507f1f77bcf86cd799439011',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      role: 'PROFESSOR',
    },
    description: 'User who uploaded the attachment',
  })
  uploaded_by_user: any;

  @ApiProperty({
    example: AttachmentStatusEnum.ACTIVE,
    description: 'Attachment status',
    enum: AttachmentStatusEnum,
  })
  status: AttachmentStatusEnum;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Creation timestamp',
  })
  created_at: string;
}

export class DeleteForumAttachmentDto {
  @IsMongoId({ message: 'Attachment ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Attachment ID is required' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the attachment to delete',
  })
  attachment_id: string | Types.ObjectId;
}
