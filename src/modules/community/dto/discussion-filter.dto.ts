import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsArray } from 'class-validator';
import {
  DiscussionTypeEnum,
  DiscussionStatusEnum,
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
  @IsString()
  @ApiProperty({
    example: 'trauma,resistance,therapy',
    description: 'Filter by tags (comma-separated or pipe-separated)',
    required: false,
  })
  tags?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by author ID',
    required: false,
  })
  author_id?: string;
}
