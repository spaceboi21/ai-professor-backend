import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class CreateChapterDto {
  @IsMongoId({ message: 'Module ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Module ID is required' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the parent module',
  })
  module_id: string | Types.ObjectId;

  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @ApiProperty({
    example: 'Cognitive Development',
    description: 'Chapter title',
  })
  title: string;

  @IsString({ message: 'Subject must be a string' })
  @IsNotEmpty({ message: 'Subject is required' })
  @ApiProperty({
    example: "Piaget's Theory",
    description: 'Short topic focus of the chapter',
  })
  subject: string;

  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  @ApiProperty({
    example:
      "This chapter explores Jean Piaget's theory of cognitive development and its stages.",
    description: 'Overview/introduction text for the chapter',
    required: false,
  })
  description?: string;
}
