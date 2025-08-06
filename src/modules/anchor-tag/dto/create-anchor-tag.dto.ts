import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsEnum,
  IsNumber,
  IsArray,
  Min,
  ValidateIf,
  IsBoolean,
} from 'class-validator';
import { Types } from 'mongoose';
import {
  AnchorTagTypeEnum,
  AnchorTagStatusEnum,
} from 'src/common/constants/anchor-tag.constant';

export class CreateAnchorTagDto {
  @IsMongoId({ message: 'Module ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the parent module',
  })
  module_id: string | Types.ObjectId;

  @IsMongoId({ message: 'Chapter ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'ID of the parent chapter',
  })
  chapter_id: string | Types.ObjectId;

  @IsMongoId({ message: 'Bibliography ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439013',
    description: 'ID of the bibliography item to attach the anchor tag to',
  })
  bibliography_id: string | Types.ObjectId;

  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @ApiProperty({
    example: 'Key Concept: Active Listening',
    description: 'Title of the anchor tag',
  })
  title: string;

  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  @ApiProperty({
    example:
      'This slide covers the fundamentals of active listening in counseling.',
    description: 'Optional description of the anchor tag',
    required: false,
  })
  description?: string;

  @IsEnum(AnchorTagTypeEnum, {
    message: 'Content type must be a valid anchor tag type',
  })
  @ApiProperty({
    example: AnchorTagTypeEnum.SLIDE,
    description: 'Type of content this anchor tag is attached to',
    enum: AnchorTagTypeEnum,
  })
  content_type: AnchorTagTypeEnum;

  @IsString({ message: 'Content reference must be a string' })
  @IsNotEmpty({ message: 'Content reference is required' })
  @ApiProperty({
    example: 'slide-3',
    description:
      'Reference to the specific content location (e.g., "slide-3", "00:02:30", "page-5")',
  })
  content_reference: string;

  @ValidateIf((o) => o.content_type === AnchorTagTypeEnum.VIDEO)
  @IsNumber({}, { message: 'Timestamp seconds must be a number' })
  @Min(0, { message: 'Timestamp seconds must be at least 0' })
  @IsOptional()
  @ApiProperty({
    example: 150,
    description: 'Video timestamp in seconds (required for video content)',
    required: false,
  })
  timestamp_seconds?: number;

  @ValidateIf((o) => o.content_type === AnchorTagTypeEnum.PDF)
  @IsNumber({}, { message: 'Page number must be a number' })
  @Min(1, { message: 'Page number must be at least 1' })
  @IsOptional()
  @ApiProperty({
    example: 5,
    description: 'PDF page number (required for PDF content)',
    required: false,
  })
  page_number?: number;

  @ValidateIf((o) => o.content_type === AnchorTagTypeEnum.SLIDE)
  @IsNumber({}, { message: 'Slide number must be a number' })
  @Min(1, { message: 'Slide number must be at least 1' })
  @IsOptional()
  @ApiProperty({
    example: 3,
    description: 'Slide number (required for slide content)',
    required: false,
  })
  slide_number?: number;

  @IsEnum(AnchorTagStatusEnum, {
    message: 'Status must be a valid anchor tag status',
  })
  @IsOptional()
  @ApiProperty({
    example: AnchorTagStatusEnum.ACTIVE,
    description: 'Status of the anchor tag',
    enum: AnchorTagStatusEnum,
    required: false,
  })
  status?: AnchorTagStatusEnum;

  @IsBoolean({ message: 'Is mandatory must be a boolean' })
  @IsOptional()
  @ApiProperty({
    example: false,
    description: 'Whether this anchor tag is mandatory or optional',
    required: false,
  })
  is_mandatory?: boolean;

  @IsMongoId({ message: 'Quiz group ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439014',
    description:
      'ID of the quiz group containing questions for this anchor tag',
  })
  quiz_group_id: string | Types.ObjectId;

  @IsNumber({}, { message: 'Sequence must be a number' })
  @Min(1, { message: 'Sequence must be at least 1' })
  @IsOptional()
  @ApiProperty({
    example: 1,
    description:
      'Order of the anchor tag in the bibliography (auto-generated if not provided)',
    required: false,
  })
  sequence?: number;

  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  @IsOptional()
  @ApiProperty({
    example: ['Active Listening', 'Counseling Skills', 'Communication'],
    description: 'Array of tags for categorizing the anchor tag',
    type: [String],
    required: false,
  })
  tags?: string[];
}
