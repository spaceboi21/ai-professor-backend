import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnrollmentTypeEnum, EnrollmentStatusEnum, EnrollmentSourceEnum } from 'src/database/schemas/tenant/student-enrollment.schema';

/**
 * Individual enrollment result
 */
export class EnrollmentResultDto {
  @ApiProperty({ description: 'Student ID' })
  student_id: string;

  @ApiProperty({ description: 'Student name' })
  student_name: string;

  @ApiProperty({ description: 'Module ID' })
  module_id: string;

  @ApiProperty({ description: 'Module title' })
  module_title: string;

  @ApiProperty({ description: 'Whether enrollment was successful' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Enrollment ID if successful' })
  enrollment_id?: string;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;

  @ApiPropertyOptional({ description: 'Whether this was a duplicate (already enrolled)' })
  was_duplicate?: boolean;
}

/**
 * Response for enrollment operations
 */
export class EnrollmentResponseDto {
  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Total enrollments requested' })
  total_requested: number;

  @ApiProperty({ description: 'Successful enrollments' })
  successful: number;

  @ApiProperty({ description: 'Failed enrollments' })
  failed: number;

  @ApiProperty({ description: 'Skipped enrollments (duplicates)' })
  skipped: number;

  @ApiProperty({ description: 'Batch ID for this enrollment operation' })
  batch_id: string;

  @ApiProperty({ description: 'Individual results', type: [EnrollmentResultDto] })
  results: EnrollmentResultDto[];
}

/**
 * Single enrollment details
 */
export class EnrollmentDetailsDto {
  @ApiProperty({ description: 'Enrollment ID' })
  id: string;

  @ApiProperty({ description: 'Student ID' })
  student_id: string;

  @ApiProperty({ description: 'Student name' })
  student_name: string;

  @ApiProperty({ description: 'Student email' })
  student_email: string;

  @ApiProperty({ description: 'Module ID' })
  module_id: string;

  @ApiProperty({ description: 'Module title' })
  module_title: string;

  @ApiProperty({ description: 'Enrollment type', enum: EnrollmentTypeEnum })
  enrollment_type: EnrollmentTypeEnum;

  @ApiProperty({ description: 'Enrollment status', enum: EnrollmentStatusEnum })
  status: EnrollmentStatusEnum;

  @ApiProperty({ description: 'Enrollment source', enum: EnrollmentSourceEnum })
  source: EnrollmentSourceEnum;

  @ApiPropertyOptional({ description: 'Academic year' })
  academic_year?: number;

  @ApiProperty({ description: 'Enrolled by user ID' })
  enrolled_by: string;

  @ApiProperty({ description: 'Enrolled by user name' })
  enrolled_by_name: string;

  @ApiProperty({ description: 'Enrollment date' })
  enrolled_at: Date;

  @ApiPropertyOptional({ description: 'Completion date' })
  completed_at?: Date;

  @ApiPropertyOptional({ description: 'Withdrawal date' })
  withdrawn_at?: Date;

  @ApiPropertyOptional({ description: 'Notes' })
  notes?: string;

  @ApiProperty({ description: 'Notification sent' })
  notification_sent: boolean;

  @ApiProperty({ description: 'Email notification sent' })
  email_notification_sent: boolean;
}

/**
 * Student enrollment status summary
 */
export class StudentEnrollmentStatusDto {
  @ApiProperty({ description: 'Student ID' })
  student_id: string;

  @ApiProperty({ description: 'Student name' })
  student_name: string;

  @ApiProperty({ description: 'Student email' })
  student_email: string;

  @ApiProperty({ description: 'Student year' })
  student_year: number;

  @ApiProperty({ description: 'Total enrolled modules' })
  total_enrolled: number;

  @ApiProperty({ description: 'Active enrollments' })
  active_enrollments: number;

  @ApiProperty({ description: 'Completed modules' })
  completed_modules: number;

  @ApiProperty({
    description: 'Modules by year',
    example: { 1: 5, 2: 3, 3: 4 },
  })
  modules_by_year: Record<number, number>;

  @ApiProperty({ description: 'Enrolled modules list', type: [EnrollmentDetailsDto] })
  enrollments: EnrollmentDetailsDto[];
}

/**
 * Enrollment history item
 */
export class EnrollmentHistoryItemDto {
  @ApiProperty({ description: 'Enrollment ID' })
  id: string;

  @ApiProperty({ description: 'Student name' })
  student_name: string;

  @ApiProperty({ description: 'Student email' })
  student_email: string;

  @ApiProperty({ description: 'Module title' })
  module_title: string;

  @ApiProperty({ description: 'Enrollment type', enum: EnrollmentTypeEnum })
  enrollment_type: EnrollmentTypeEnum;

  @ApiProperty({ description: 'Enrollment status', enum: EnrollmentStatusEnum })
  status: EnrollmentStatusEnum;

  @ApiProperty({ description: 'Enrolled by name' })
  enrolled_by_name: string;

  @ApiProperty({ description: 'Enrollment date' })
  enrolled_at: Date;

  @ApiPropertyOptional({ description: 'Academic year' })
  academic_year?: number;

  @ApiPropertyOptional({ description: 'Batch ID' })
  batch_id?: string;
}

/**
 * Paginated enrollment history response
 */
export class EnrollmentHistoryResponseDto {
  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Enrollment history items', type: [EnrollmentHistoryItemDto] })
  data: EnrollmentHistoryItemDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total pages' })
  total_pages: number;
}

/**
 * Module enrollment summary
 */
export class ModuleEnrollmentSummaryDto {
  @ApiProperty({ description: 'Module ID' })
  module_id: string;

  @ApiProperty({ description: 'Module title' })
  module_title: string;

  @ApiProperty({ description: 'Module year' })
  module_year: number;

  @ApiProperty({ description: 'Total enrolled students' })
  total_enrolled: number;

  @ApiProperty({ description: 'Active enrollments' })
  active: number;

  @ApiProperty({ description: 'Completed enrollments' })
  completed: number;

  @ApiProperty({ description: 'Withdrawn enrollments' })
  withdrawn: number;
}

/**
 * Available students for enrollment
 */
export class AvailableStudentDto {
  @ApiProperty({ description: 'Student ID' })
  id: string;

  @ApiProperty({ description: 'Student name' })
  name: string;

  @ApiProperty({ description: 'Student email' })
  email: string;

  @ApiProperty({ description: 'Student year' })
  year: number;

  @ApiProperty({ description: 'Already enrolled module count' })
  enrolled_modules_count: number;

  @ApiProperty({ description: 'Is already enrolled in selected module' })
  is_enrolled_in_module: boolean;
}

/**
 * Available modules for enrollment
 */
export class AvailableModuleDto {
  @ApiProperty({ description: 'Module ID' })
  id: string;

  @ApiProperty({ description: 'Module title' })
  title: string;

  @ApiProperty({ description: 'Module subject' })
  subject: string;

  @ApiProperty({ description: 'Module year' })
  year: number;

  @ApiProperty({ description: 'Is published' })
  published: boolean;

  @ApiProperty({ description: 'Total enrolled students' })
  enrolled_count: number;
}

