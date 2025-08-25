import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsDateString,
  IsEnum,
  ValidateIf,
} from 'class-validator';
import { VideoPlatformEnum } from 'src/database/schemas/tenant/forum-discussion.schema';

export class UpdateDiscussionDto {
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @ApiProperty({
    example: 'Updated: Best practices for handling resistant patients',
    description: 'Updated discussion title',
    required: false,
  })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Content must be a string' })
  @ApiProperty({
    example:
      'Updated content: I would like to discuss effective strategies for working with patients who show resistance to therapy...',
    description: 'Updated discussion content',
    required: false,
  })
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiProperty({
    example: ['trauma', 'resistance', 'therapy', 'updated'],
    description: 'Updated tags for categorizing the discussion',
    required: false,
    type: [String],
  })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiProperty({
    example: ['@john.doe', '@jane.smith'],
    description: 'Updated array of usernames to mention (without @ symbol)',
    type: [String],
    required: false,
  })
  mentions?: string[];

  // Meeting fields (optional updates for meeting type discussions)
  @IsOptional()
  @IsString({ message: 'Meeting link must be a string' })
  @ApiProperty({
    example: 'https://meet.google.com/updated-link',
    description: 'Updated video meeting link (for meeting type only)',
    required: false,
  })
  meeting_link?: string;

  @IsOptional()
  @IsEnum(VideoPlatformEnum, {
    message: 'Meeting platform must be a valid video platform',
  })
  @ApiProperty({
    example: VideoPlatformEnum.ZOOM,
    description: 'Updated video platform (for meeting type only)',
    enum: VideoPlatformEnum,
    required: false,
  })
  meeting_platform?: VideoPlatformEnum;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Meeting scheduled at must be a valid date string' },
  )
  @ApiProperty({
    example: '2024-01-15T14:00:00.000Z',
    description:
      'Updated scheduled date and time for the meeting (for meeting type only)',
    required: false,
  })
  meeting_scheduled_at?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Meeting duration must be a number' })
  @ApiProperty({
    example: 90,
    description: 'Updated meeting duration in minutes (for meeting type only)',
    required: false,
  })
  meeting_duration_minutes?: number;
}
