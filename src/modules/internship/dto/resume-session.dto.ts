import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ResumeSessionDto {
  @ApiPropertyOptional({
    description: 'Optional note about resuming the session',
    example: 'Ready to continue the consultation',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

