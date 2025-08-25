import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsEnum,
  IsArray,
  IsNumber,
  IsDateString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';
import {
  DiscussionTypeEnum,
  VideoPlatformEnum,
} from 'src/database/schemas/tenant/forum-discussion.schema';

// Simple DTO for discussion attachments
export class DiscussionAttachmentDto {
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

export class CreateDiscussionDto {
  @IsOptional()
  @IsMongoId({ message: 'School ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description:
      'School ID (required for super admin, optional for other roles)',
    required: false,
  })
  school_id?: string | Types.ObjectId;

  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @ApiProperty({
    example: 'Best practices for handling resistant patients',
    description: 'Discussion title',
  })
  title: string;

  @IsString({ message: 'Content must be a string' })
  @IsNotEmpty({ message: 'Content is required' })
  @ApiProperty({
    example:
      'I would like to discuss effective strategies for working with patients who show resistance to therapy...',
    description: 'Discussion content',
  })
  content: string;

  @IsEnum(DiscussionTypeEnum, {
    message: 'Type must be a valid discussion type',
  })
  @IsNotEmpty({ message: 'Type is required' })
  @ApiProperty({
    example: DiscussionTypeEnum.DISCUSSION,
    description: 'Type of discussion',
    enum: DiscussionTypeEnum,
  })
  type: DiscussionTypeEnum;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiProperty({
    example: ['trauma', 'resistance', 'therapy'],
    description: 'Tags for categorizing the discussion',
    required: false,
    type: [String],
  })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiscussionAttachmentDto)
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
    description: 'Array of attachments for the discussion',
    required: false,
    type: [DiscussionAttachmentDto],
  })
  attachments?: DiscussionAttachmentDto[];

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

  // Meeting fields (required only when type is MEETING)
  @ValidateIf((o) => o.type === DiscussionTypeEnum.MEETING)
  @IsString({ message: 'Meeting link must be a string' })
  @IsNotEmpty({ message: 'Meeting link is required for meeting type' })
  @ApiProperty({
    example: 'https://meet.google.com/abc-defg-hij',
    description: 'Video meeting link (required for meeting type)',
    required: false,
  })
  meeting_link?: string;

  @ValidateIf((o) => o.type === DiscussionTypeEnum.MEETING)
  @IsEnum(VideoPlatformEnum, {
    message: 'Meeting platform must be a valid video platform',
  })
  @IsNotEmpty({ message: 'Meeting platform is required for meeting type' })
  @ApiProperty({
    example: VideoPlatformEnum.GOOGLE_MEET,
    description: 'Video platform (required for meeting type)',
    enum: VideoPlatformEnum,
    required: false,
  })
  meeting_platform?: VideoPlatformEnum;

  @ValidateIf((o) => o.type === DiscussionTypeEnum.MEETING)
  @IsDateString(
    {},
    { message: 'Meeting scheduled at must be a valid date string' },
  )
  @IsNotEmpty({ message: 'Meeting scheduled at is required for meeting type' })
  @ApiProperty({
    example: '2024-01-15T10:00:00.000Z',
    description:
      'Scheduled date and time for the meeting (required for meeting type)',
    required: false,
  })
  meeting_scheduled_at?: string;

  @ValidateIf((o) => o.type === DiscussionTypeEnum.MEETING)
  @IsOptional()
  @IsNumber({}, { message: 'Meeting duration must be a number' })
  @ApiProperty({
    example: 60,
    description: 'Meeting duration in minutes (optional for meeting type)',
    required: false,
  })
  meeting_duration_minutes?: number;
}
