import { ApiProperty } from '@nestjs/swagger';

export class AnchorChatResourceResponseDto {
  @ApiProperty({
    description: 'Resource ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Session ID',
    example: '507f1f77bcf86cd799439011',
  })
  session_id: string;

  @ApiProperty({
    description: 'Anchor tag ID',
    example: '507f1f77bcf86cd799439011',
  })
  anchor_tag_id: string;

  @ApiProperty({
    description: 'Module ID',
    example: '507f1f77bcf86cd799439011',
  })
  module_id: string;

  @ApiProperty({
    description: 'Student ID',
    example: '507f1f77bcf86cd799439011',
  })
  student_id: string;

  @ApiProperty({
    description: 'Array of suggested resources',
    type: [Object],
  })
  resources: object[];

  @ApiProperty({
    description: 'AI recommendations text',
    example: 'Based on your question about active listening, I recommend starting with these foundational resources...',
  })
  recommendations: string;

  @ApiProperty({
    description: 'Total number of resources found',
    example: 5,
  })
  total_found: number;

  @ApiProperty({
    description: 'Whether knowledge is available in the system',
    example: true,
  })
  knowledge_available: boolean;

  @ApiProperty({
    description: 'Keywords for learning',
    type: [String],
    example: ['active listening', 'communication', 'counseling'],
  })
  keywords_for_learning: string[];

  @ApiProperty({
    description: 'Resource creation timestamp',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Resource update timestamp',
  })
  updated_at: Date;
}
