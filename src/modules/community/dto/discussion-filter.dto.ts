import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsString,
  IsArray,
  IsDateString,
  IsMongoId,
} from 'class-validator';
import {
  DiscussionTypeEnum,
  DiscussionStatusEnum,
  VideoPlatformEnum,
} from 'src/database/schemas/tenant/forum-discussion.schema';

export class DiscussionFilterDto {
  @IsOptional()
  @IsEnum(DiscussionTypeEnum)
  @ApiProperty({
    example: DiscussionTypeEnum.DISCUSSION,
    description: 'Filter by discussion type',
    enum: DiscussionTypeEnum,
    required: false,
  })
  type?: DiscussionTypeEnum;

  @IsOptional()
  @IsEnum(DiscussionStatusEnum)
  @ApiProperty({
    example: DiscussionStatusEnum.ACTIVE,
    description: 'Filter by discussion status',
    enum: DiscussionStatusEnum,
    required: false,
  })
  status?: DiscussionStatusEnum;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'trauma',
    description: 'Search term for title and content',
    required: false,
  })
  search?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiProperty({
    example: ['trauma', 'resistance'],
    description: 'Filter by tags',
    required: false,
    type: [String],
  })
  tags?: string[];

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by author ID',
    required: false,
  })
  author_id?: string;

  // Meeting-specific filters
  @IsOptional()
  @IsEnum(VideoPlatformEnum)
  @ApiProperty({
    example: VideoPlatformEnum.GOOGLE_MEET,
    description:
      'Filter by video platform (only applies to meeting type discussions)',
    enum: VideoPlatformEnum,
    required: false,
  })
  meeting_platform?: VideoPlatformEnum;

  @IsOptional()
  @IsDateString()
  @ApiProperty({
    example: '2024-01-15T00:00:00.000Z',
    description:
      'Filter meetings scheduled from this date (only applies to meeting type discussions)',
    required: false,
  })
  meeting_scheduled_from?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({
    example: '2024-01-31T23:59:59.999Z',
    description:
      'Filter meetings scheduled until this date (only applies to meeting type discussions)',
    required: false,
  })
  meeting_scheduled_until?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'upcoming',
    description:
      'Filter by meeting timing: "upcoming" (future meetings), "past" (expired meetings), "today" (meetings scheduled today)',
    enum: ['upcoming', 'past', 'today'],
    required: false,
  })
  meeting_timing?: 'upcoming' | 'past' | 'today';
}
