import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsMongoId,
  IsEnum,
  IsString,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Types } from 'mongoose';
import {
  AnchorTagTypeEnum,
  AnchorTagStatusEnum,
  AnchorTypeEnum,
} from 'src/common/constants/anchor-tag.constant';

export class AnchorTagFilterDto {
  @IsMongoId({ message: 'Module ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by module ID',
    required: false,
  })
  module_id?: string | Types.ObjectId;

  @IsMongoId({ message: 'Chapter ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'Filter by chapter ID',
    required: false,
  })
  chapter_id?: string | Types.ObjectId;

  @IsMongoId({ message: 'Bibliography ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    example: '507f1f77bcf86cd799439013',
    description: 'Filter by bibliography ID',
    required: false,
  })
  bibliography_id?: string | Types.ObjectId;

  @IsMongoId({ message: 'Quiz group ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    example: '507f1f77bcf86cd799439014',
    description: 'Filter by quiz group ID',
    required: false,
  })
  quiz_group_id?: string | Types.ObjectId;

  @IsEnum(AnchorTagTypeEnum, {
    message: 'Content type must be a valid anchor tag type',
  })
  @IsOptional()
  @ApiProperty({
    example: AnchorTagTypeEnum.SLIDE,
    description: 'Filter by content type',
    enum: AnchorTagTypeEnum,
    required: false,
  })
  content_type?: AnchorTagTypeEnum;

  @IsEnum(AnchorTagStatusEnum, {
    message: 'Status must be a valid anchor tag status',
  })
  @IsOptional()
  @ApiProperty({
    example: AnchorTagStatusEnum.ACTIVE,
    description: 'Filter by status',
    enum: AnchorTagStatusEnum,
    required: false,
  })
  status?: AnchorTagStatusEnum;

  @IsEnum(AnchorTypeEnum, {
    message: 'Anchor type must be a valid anchor type',
  })
  @IsOptional()
  @ApiProperty({
    example: AnchorTypeEnum.QUIZ,
    description: 'Filter by anchor type (QUIZ or AI_CHAT)',
    enum: AnchorTypeEnum,
    required: false,
  })
  anchor_type?: AnchorTypeEnum;

  @IsBoolean({ message: 'Is mandatory must be a boolean' })
  @IsOptional()
  @ApiProperty({
    example: false,
    description: 'Filter by mandatory status',
    required: false,
  })
  is_mandatory?: boolean;

  @IsString({ message: 'Search term must be a string' })
  @IsOptional()
  @ApiProperty({
    example: 'active listening',
    description: 'Search in title and description',
    required: false,
  })
  search?: string;

  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  @IsOptional()
  @ApiProperty({
    example: ['Active Listening', 'Counseling Skills'],
    description: 'Filter by tags',
    type: [String],
    required: false,
  })
  tags?: string[];
}
