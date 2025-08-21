import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Types } from 'mongoose';

export class ReorderChapterDto {
  @IsMongoId({ message: 'Chapter ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Chapter ID is required' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the chapter to reorder',
  })
  chapter_id: string | Types.ObjectId;

  @IsNumber({}, { message: 'New sequence must be a number' })
  @Min(1, { message: 'New sequence must be at least 1' })
  @IsNotEmpty({ message: 'New sequence is required' })
  @ApiProperty({
    example: 3,
    description: 'New sequence number for the chapter',
  })
  new_sequence: number;
}

export class ReorderChaptersDto {
  @IsOptional()
  @IsMongoId({ message: 'School ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description:
      'School ID (required for super admin, optional for other roles)',
    required: false,
  })
  school_id?: string | Types.ObjectId;

  @ApiProperty({
    type: [ReorderChapterDto],
    description: 'Array of chapters with their new sequence numbers',
    example: [
      {
        chapter_id: '507f1f77bcf86cd799439011',
        new_sequence: 1,
      },
      {
        chapter_id: '507f1f77bcf86cd799439012',
        new_sequence: 2,
      },
    ],
  })
  @IsArray({ message: 'Chapters must be an array' })
  @ValidateNested({ each: true })
  @Type(() => ReorderChapterDto)
  chapters: ReorderChapterDto[];
}
