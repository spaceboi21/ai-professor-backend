import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class BulkCreateStudentDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'CSV file containing student data',
  })
  @IsNotEmpty({ message: 'CSV file is required' })
  @IsString({ message: 'File must be a string' })
  file: any;
}

export interface StudentCsvRow {
  first_name: string;
  last_name: string;
  email: string;
  school_id?: string; // Optional for super admin to specify school
}

export interface BulkCreateResult {
  success: StudentCsvRow[];
  failed: Array<{
    row: StudentCsvRow;
    error: string;
  }>;
  total: number;
  successCount: number;
  failedCount: number;
}
