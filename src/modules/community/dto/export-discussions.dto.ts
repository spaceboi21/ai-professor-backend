import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsArray } from 'class-validator';
import {
  DiscussionTypeEnum,
  DiscussionStatusEnum,
} from 'src/database/schemas/tenant/forum-discussion.schema';

export class ExportDiscussionsDto {
  @ApiProperty({
    enum: DiscussionTypeEnum,
    required: false,
    description: 'Filter by discussion type',
    example: DiscussionTypeEnum.DISCUSSION,
  })
  @IsOptional()
  @IsEnum(DiscussionTypeEnum)
  type?: DiscussionTypeEnum;

  @ApiProperty({
    enum: DiscussionStatusEnum,
    required: false,
    description: 'Filter by discussion status (admin only)',
    example: DiscussionStatusEnum.ACTIVE,
  })
  @IsOptional()
  @IsEnum(DiscussionStatusEnum)
  status?: DiscussionStatusEnum;

  @ApiProperty({
    type: String,
    required: false,
    description: 'Search term for title or content',
    example: 'JavaScript',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    type: [String],
    required: false,
    description: 'Filter by tags',
    example: ['programming', 'javascript'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    type: String,
    required: false,
    description: 'Filter by author ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  author_id?: string;

  @ApiProperty({
    type: String,
    required: false,
    description: 'Filter by start date (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiProperty({
    type: String,
    required: false,
    description: 'Filter by end date (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsString()
  end_date?: string;
}
