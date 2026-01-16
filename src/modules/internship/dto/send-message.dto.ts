import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsObject, IsArray } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Can you tell me about your symptoms?',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Non-verbal actions performed by therapist (optional)',
    example: ['offered tissue', 'maintained eye contact', 'nodded empathetically'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  therapist_actions?: string[];

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { context: 'initial_assessment' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

