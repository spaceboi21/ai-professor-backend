import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class CreateReplyDto {
  @IsOptional()
  @IsMongoId({ message: 'School ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description:
      'School ID (required for super admin, optional for other roles)',
    required: false,
  })
  school_id?: string | Types.ObjectId;

  @IsMongoId({ message: 'Discussion ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Discussion ID is required' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the discussion to reply to',
  })
  discussion_id: string | Types.ObjectId;

  @IsString({ message: 'Content must be a string' })
  @IsNotEmpty({ message: 'Content is required' })
  @ApiProperty({
    example:
      'I have found that using motivational interviewing techniques works well with resistant patients...',
    description: 'Reply content',
  })
  content: string;

  @IsOptional()
  @IsMongoId({ message: 'Parent reply ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the parent reply (for nested replies)',
    required: false,
  })
  parent_reply_id?: string | Types.ObjectId;
}
