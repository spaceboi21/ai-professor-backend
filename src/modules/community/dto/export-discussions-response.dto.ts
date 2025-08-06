import { ApiProperty } from '@nestjs/swagger';

export class ExportDiscussionsResponseDto {
  @ApiProperty({
    example: 'discussions-export_2024-01-15T10-30-00-000Z.csv',
    description: 'Generated export filename',
  })
  filename: string;

  @ApiProperty({
    example:
      '/tmp/ai-professor-exports/discussions-export_2024-01-15T10-30-00-000Z.csv',
    description: 'File path (local) or S3 URL (production)',
  })
  file_path: string;

  @ApiProperty({
    example: 2048,
    description: 'File size in bytes',
  })
  file_size: number;

  @ApiProperty({
    example: 75,
    description: 'Number of discussions exported',
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
    example:
      '/api/community/download/discussions-export_2024-01-15T10-30-00-000Z.csv',
    description: 'Download URL for the file',
  })
  download_url: string;

  @ApiProperty({
    example: {
      type: 'discussion',
      search: 'JavaScript',
      tags: ['programming'],
      start_date: '2024-01-01',
      end_date: '2024-12-31',
    },
    description: 'Applied filters for the export',
    required: false,
  })
  applied_filters?: Record<string, any>;
}
