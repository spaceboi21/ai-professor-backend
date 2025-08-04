import { ApiProperty } from '@nestjs/swagger';

export class LearningLogsExportResponseDto {
  @ApiProperty({
    example: 'learning-logs-export_2024-01-15T10-30-00-000Z.csv',
    description: 'Generated CSV filename',
  })
  filename: string;

  @ApiProperty({
    example: '/uploads/csv/learning-logs-export_2024-01-15T10-30-00-000Z.csv',
    description: 'File path (local) or S3 URL (production)',
  })
  file_path: string;

  @ApiProperty({
    example: 1024,
    description: 'File size in bytes',
  })
  file_size: number;

  @ApiProperty({
    example: 150,
    description: 'Number of records exported',
  })
  record_count: number;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Export timestamp',
  })
  exported_at: Date;

  @ApiProperty({
    example: 'local',
    description: 'Storage type: local or s3',
  })
  storage_type: 'local' | 's3';

  @ApiProperty({
    example: '/uploads/csv/learning-logs-export_2024-01-15T10-30-00-000Z.csv',
    description: 'Download URL for the file',
  })
  download_url: string;

  @ApiProperty({
    example: {
      text: 'child development',
      module_id: '507f1f77bcf86cd799439011',
      skill_gap: 'empathy',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
    },
    description: 'Applied filters for the export',
    required: false,
  })
  applied_filters?: Record<string, any>;
} 