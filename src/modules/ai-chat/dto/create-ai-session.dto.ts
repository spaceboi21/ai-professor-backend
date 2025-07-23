import { IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAISessionDto {
  @ApiProperty({
    description: 'Module ID for the AI session',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsMongoId()
  module_id: string;
}
