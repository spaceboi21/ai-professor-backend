import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsMongoId } from 'class-validator';

export class StudentDashboardDto {
  @ApiProperty({
    description: 'Student ID (required for admin/professor access)',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  student_id?: string;

  @ApiProperty({
    description: 'School ID (required for super admin access)',
    example: '507f1f77bcf86cd799439012',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  school_id?: string;
}
