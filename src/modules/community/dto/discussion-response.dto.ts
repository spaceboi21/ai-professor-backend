import { ApiProperty } from '@nestjs/swagger';
import {
  DiscussionTypeEnum,
  DiscussionStatusEnum,
  VideoPlatformEnum,
} from 'src/database/schemas/tenant/forum-discussion.schema';
import { RoleEnum } from 'src/common/constants/roles.constant';

export class DiscussionUserDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'User ID',
  })
  _id: string;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
  })
  first_name: string;

  @ApiProperty({
    example: 'Smith',
    description: 'User last name',
  })
  last_name: string;

  @ApiProperty({
    example: 'john.smith@school.com',
    description: 'User email (decrypted)',
  })
  email: string;

  @ApiProperty({
    example: 'PROFESSOR',
    description: 'User role',
    enum: RoleEnum,
  })
  role: RoleEnum;

  @ApiProperty({
    example: 'https://example.com/profile.jpg',
    description: 'User profile image',
    required: false,
  })
  image?: string;

  @ApiProperty({
    example: 'https://example.com/profile.jpg',
    description: 'User profile picture (alternative field)',
    required: false,
  })
  profile_pic?: string;
}

export class DiscussionReplyDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Reply ID',
  })
  _id: string;

  @ApiProperty({
    example: 'This is a great discussion point!',
    description: 'Reply content',
  })
  content: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'User who created the reply',
  })
  created_by: string;

  @ApiProperty({
    example: 'STUDENT',
    description: 'Role of user who created the reply',
    enum: RoleEnum,
  })
  created_by_role: RoleEnum;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'When the reply was created',
  })
  created_at: Date;

  @ApiProperty({
    example: {
      _id: '507f1f77bcf86cd799439011',
      first_name: 'Sarah',
      last_name: 'Johnson',
      email: 'sarah.johnson@school.com',
      role: 'STUDENT',
      image: 'https://example.com/sarah.jpg',
    },
    description: 'User details of the reply author',
  })
  last_reply_user: DiscussionUserDto;
}

export class DiscussionResponseDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Discussion ID',
  })
  _id: string;

  @ApiProperty({
    example: 'Weekly Therapy Session Discussion',
    description: 'Discussion title',
  })
  title: string;

  @ApiProperty({
    example:
      'Join us for our weekly group therapy session where we will discuss...',
    description: 'Discussion content',
  })
  content: string;

  @ApiProperty({
    example: DiscussionTypeEnum.MEETING,
    description: 'Type of discussion',
    enum: DiscussionTypeEnum,
  })
  type: DiscussionTypeEnum;

  @ApiProperty({
    example: ['therapy', 'group-session', 'weekly'],
    description: 'Tags for categorizing the discussion',
    type: [String],
  })
  tags: string[];

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'User who created the discussion',
  })
  created_by: string;

  @ApiProperty({
    example: RoleEnum.PROFESSOR,
    description: 'Role of user who created the discussion',
    enum: RoleEnum,
  })
  created_by_role: RoleEnum;

  @ApiProperty({
    example: 5,
    description: 'Number of replies to this discussion',
  })
  reply_count: number;

  @ApiProperty({
    example: 25,
    description: 'Number of views for this discussion',
  })
  view_count: number;

  @ApiProperty({
    example: 3,
    description: 'Number of likes for this discussion',
  })
  like_count: number;

  @ApiProperty({
    example: DiscussionStatusEnum.ACTIVE,
    description: 'Discussion status',
    enum: DiscussionStatusEnum,
  })
  status: DiscussionStatusEnum;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'When the discussion was created',
  })
  created_at: Date;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'When the discussion was last updated',
  })
  updated_at: Date;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'When the discussion was archived (if applicable)',
    required: false,
  })
  archived_at?: Date;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'User who archived the discussion (if applicable)',
    required: false,
  })
  archived_by?: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'When the discussion was deleted (if applicable)',
    required: false,
  })
  deleted_at?: Date;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'User who deleted the discussion (if applicable)',
    required: false,
  })
  deleted_by?: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'When the last reply was made (if applicable)',
    required: false,
  })
  last_reply_at?: Date;

  // Meeting fields (only for meeting type discussions)
  @ApiProperty({
    example: 'https://meet.google.com/abc-defg-hij',
    description: 'Video meeting link (only for meeting type)',
    required: false,
  })
  meeting_link?: string;

  @ApiProperty({
    example: VideoPlatformEnum.GOOGLE_MEET,
    description: 'Video platform (only for meeting type)',
    enum: VideoPlatformEnum,
    required: false,
  })
  meeting_platform?: VideoPlatformEnum;

  @ApiProperty({
    example: '2024-01-15T10:00:00.000Z',
    description: 'Scheduled meeting time (only for meeting type)',
    required: false,
  })
  meeting_scheduled_at?: Date;

  @ApiProperty({
    example: 60,
    description: 'Meeting duration in minutes (only for meeting type)',
    required: false,
  })
  meeting_duration_minutes?: number;

  // Computed meeting fields (only for meeting type discussions)
  @ApiProperty({
    example: 'upcoming',
    description:
      'Meeting status: upcoming, ongoing, or completed (only for meeting type)',
    enum: ['upcoming', 'ongoing', 'completed'],
    required: false,
  })
  meeting_status?: 'upcoming' | 'ongoing' | 'completed';

  @ApiProperty({
    example: 3600000,
    description:
      'Time until meeting starts in milliseconds (only for upcoming meetings)',
    required: false,
  })
  meeting_time_until?: number;

  @ApiProperty({
    example: '2024-01-15T11:00:00.000Z',
    description: 'Calculated meeting end time (only for meeting type)',
    required: false,
  })
  meeting_end_time?: Date;

  @ApiProperty({
    example: false,
    description:
      'Whether the meeting is currently ongoing (only for meeting type)',
    required: false,
  })
  is_meeting_ongoing?: boolean;

  // User details
  @ApiProperty({
    type: DiscussionUserDto,
    description: 'User who created the discussion',
  })
  created_by_user: DiscussionUserDto;

  // Last reply information
  @ApiProperty({
    type: DiscussionReplyDto,
    description: 'Last reply to this discussion (if any)',
    required: false,
  })
  last_reply?: DiscussionReplyDto;

  // User interaction flags
  @ApiProperty({
    example: true,
    description: 'Whether the current user has pinned this discussion',
  })
  is_pinned: boolean;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'When the current user pinned this discussion (if applicable)',
    required: false,
  })
  pinned_at?: Date;

  @ApiProperty({
    example: false,
    description: 'Whether the current user has liked this discussion',
  })
  has_liked: boolean;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'When the current user liked this discussion (if applicable)',
    required: false,
  })
  liked_at?: Date;

  @ApiProperty({
    example: true,
    description: 'Whether this discussion is unread by the current user',
  })
  is_unread: boolean;
}

export class DiscussionsListResponseDto {
  @ApiProperty({
    example: 'Discussions retrieved successfully',
    description: 'Success message',
  })
  message: string;

  @ApiProperty({
    type: [DiscussionResponseDto],
    description: 'Array of discussions',
  })
  data: DiscussionResponseDto[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 10,
      total: 50,
      totalPages: 5,
    },
    description: 'Pagination information',
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class SingleDiscussionResponseDto {
  @ApiProperty({
    example: 'Discussion retrieved successfully',
    description: 'Success message',
  })
  message: string;

  @ApiProperty({
    type: DiscussionResponseDto,
    description: 'Discussion details',
  })
  data: DiscussionResponseDto;
}
