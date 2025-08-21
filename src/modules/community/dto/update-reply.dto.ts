import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpdateReplyDto {
  @IsOptional()
  @IsString({ message: 'Content must be a string' })
  @ApiProperty({
    example:
      'Updated reply: I have found that using motivational interviewing techniques works well with resistant patients...',
    description: 'Updated reply content',
    required: false,
  })
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiProperty({
    example: ['@john.doe', '@jane.smith', '@new.user'],
    description: 'Updated array of usernames to mention (without @ symbol)',
    type: [String],
    required: false,
  })
  mentions?: string[];
}
