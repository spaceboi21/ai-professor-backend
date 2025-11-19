import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Can you tell me about your symptoms?',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { context: 'initial_assessment' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

