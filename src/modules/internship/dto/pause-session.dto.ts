import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class PauseSessionDto {
  @ApiPropertyOptional({
    description: 'Optional reason for pausing the session',
    example: 'Taking a break to review case notes',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

