import { IsMongoId, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAISessionDto {
  @ApiProperty({
    description: 'Module ID for the AI session',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsMongoId()
  module_id: string;

  @ApiProperty({
    description: 'Optional title for the AI session',
    example: 'Cardiology Practice Session',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  session_title?: string;

  @ApiProperty({
    description: 'Optional description for the AI session',
    example: 'AI practice session for cardiology module',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  session_description?: string;
}
