import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class CreateAIFeedbackDto {
  @ApiProperty({
    description: 'AI session ID',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsMongoId()
  session_id: string;
}
