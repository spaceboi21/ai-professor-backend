import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class MarkChapterCompleteDto {
  @IsString({ message: 'Chapter ID must be a string' })
  @IsNotEmpty({ message: 'Chapter ID is required' })
  @Transform(({ value }) => value?.trim())
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Chapter ID to mark as complete',
  })
  chapter_id: string;
}
