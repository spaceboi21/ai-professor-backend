import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';
import { CreateForumAttachmentDto } from './forum-attachment.dto';

export class CreateReplyDto {
  @IsOptional()
  @IsMongoId({ message: 'School ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description:
      'School ID (required for super admin, optional for other roles)',
    required: false,
  })
  school_id?: string | Types.ObjectId;

  @IsMongoId({ message: 'Discussion ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Discussion ID is required' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the discussion to reply to',
  })
  discussion_id: string | Types.ObjectId;

  @IsString({ message: 'Content must be a string' })
  @IsNotEmpty({ message: 'Content is required' })
  @ApiProperty({
    example:
      'I have found that using motivational interviewing techniques works well with resistant patients...',
    description: 'Reply content',
  })
  content: string;

  @IsOptional()
  @IsMongoId({ message: 'Parent reply ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the parent reply (for nested replies)',
    required: false,
  })
  parent_reply_id?: string | Types.ObjectId;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiProperty({
    example: ['@john.doe', '@jane.smith'],
    description: 'Array of usernames to mention (without @ symbol)',
    type: [String],
    required: false,
  })
  mentions?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateForumAttachmentDto)
  @ApiProperty({
    example: [
      {
        original_filename: 'document.pdf',
        stored_filename: '1234567890-uuid-document.pdf',
        file_url:
          'https://bucket.s3.amazonaws.com/forum-attachments/1234567890-uuid-document.pdf',
        mime_type: 'application/pdf',
        file_size: 1024000,
      },
    ],
    description: 'Array of attachments for the reply',
    required: false,
    type: [CreateForumAttachmentDto],
  })
  attachments?: CreateForumAttachmentDto[];
}
