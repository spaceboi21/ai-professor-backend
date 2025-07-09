import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class UpdateChapterDto {
  @IsOptional()
  @IsMongoId({ message: 'Module ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the parent module',
    required: false,
  })
  module_id?: string | Types.ObjectId;

  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @ApiProperty({
    example: 'Cognitive Development',
    description: 'Chapter title',
    required: false,
  })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Subject must be a string' })
  @ApiProperty({
    example: "Piaget's Theory",
    description: 'Short topic focus of the chapter',
    required: false,
  })
  subject?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @ApiProperty({
    example:
      "This chapter explores Jean Piaget's theory of cognitive development and its stages.",
    description: 'Overview/introduction text for the chapter',
    required: false,
  })
  description?: string;
}
