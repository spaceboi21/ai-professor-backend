import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsMongoId,
  IsBoolean,
} from 'class-validator';
import { Types } from 'mongoose';

export class CreatePptAnchorPointDto {
  @IsMongoId({ message: 'Bibliography ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Bibliography ID is required' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description:
      'ID of the bibliography item (must be SLIDE or POWERPOINT type)',
  })
  bibliography_id: string | Types.ObjectId;

  @IsNumber({}, { message: 'Slide number must be a number' })
  @IsNotEmpty({ message: 'Slide number is required' })
  @ApiProperty({
    example: 1,
    description: 'Slide number in the presentation (1-based)',
  })
  slideNumber: number;

  @IsString({ message: 'Slide ID must be a string' })
  @IsNotEmpty({ message: 'Slide ID is required' })
  @ApiProperty({
    example: 'slide-1',
    description: 'Unique identifier for the slide',
  })
  slideId: string;

  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @ApiProperty({
    example: 'Introduction to Psychology',
    description: 'Title of the slide',
  })
  title: string;

  @IsString({ message: 'Content must be a string' })
  @IsOptional()
  @ApiProperty({
    example: 'This slide covers the basic concepts of psychology...',
    description: 'Content extracted from the slide',
    required: false,
  })
  content?: string;

  @IsMongoId({ message: 'Quiz group ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Quiz group ID is required' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'ID of the quiz group to associate with this anchor point',
  })
  quiz_group_id: string | Types.ObjectId;

  @IsBoolean({ message: 'Is mandatory must be a boolean' })
  @IsOptional()
  @ApiProperty({
    example: false,
    description: 'Whether this anchor point is mandatory for students',
    default: false,
  })
  is_mandatory?: boolean;

  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  @ApiProperty({
    example: 'Students must complete this quiz before proceeding',
    description: 'Description of the anchor point',
    required: false,
  })
  description?: string;

  @IsString({ message: 'Content reference must be a string' })
  @IsNotEmpty({ message: 'Content reference is required' })
  @ApiProperty({
    example: 'slide-3',
    description: 'Reference to the specific content (e.g., slide-3, 00:02:30)',
  })
  content_reference: string;

  @IsString({ message: 'Content type must be a string' })
  @IsNotEmpty({ message: 'Content type is required' })
  @ApiProperty({
    example: 'SLIDE',
    description: 'Type of content (SLIDE for PowerPoint presentations)',
  })
  content_type: string;

  @IsNumber({}, { message: 'Slide number must be a number' })
  @IsNotEmpty({ message: 'Slide number is required' })
  @ApiProperty({
    example: 3,
    description: 'Slide number for the anchor point',
  })
  slide_number: number;
}
