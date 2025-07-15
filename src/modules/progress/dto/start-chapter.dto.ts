import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';

export class StartChapterDto {
  @IsMongoId({ message: 'Chapter ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Chapter ID is required' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the chapter to start',
  })
  chapter_id: string | Types.ObjectId;
} 