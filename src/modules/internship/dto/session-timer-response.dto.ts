import { ApiProperty } from '@nestjs/swagger';

export class SessionTimerResponseDto {
  @ApiProperty({
    description: 'Current session status',
    example: 'ACTIVE',
  })
  status: string;

  @ApiProperty({
    description: 'Total active time in seconds (excluding pauses)',
    example: 1800,
  })
  total_active_time_seconds: number;

  @ApiProperty({
    description: 'Remaining time in seconds (if limit configured)',
    example: 1800,
    nullable: true,
  })
  remaining_time_seconds: number | null;

  @ApiProperty({
    description: 'Whether session time limit is approaching',
    example: false,
  })
  is_near_timeout: boolean;

  @ApiProperty({
    description: 'Session started at',
    example: '2025-01-01T10:00:00.000Z',
  })
  started_at: Date;

  @ApiProperty({
    description: 'Session paused at (if currently paused)',
    example: null,
    nullable: true,
  })
  paused_at: Date | null;

  @ApiProperty({
    description: 'Number of times session has been paused',
    example: 2,
  })
  pause_count: number;
}

