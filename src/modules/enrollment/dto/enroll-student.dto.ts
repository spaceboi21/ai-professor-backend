import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsMongoId,
  ArrayMinSize,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EnrollmentTypeEnum } from 'src/database/schemas/tenant/student-enrollment.schema';

/**
 * DTO for enrolling a single student in individual modules
 */
export class EnrollStudentModulesDto {
  @ApiProperty({
    description: 'Student ID to enroll',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  student_id: string;

  @ApiProperty({
    description: 'Array of module IDs to enroll the student in',
    example: ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  module_ids: string[];

  @ApiPropertyOptional({
    description: 'School ID (required for super admin)',
    example: '507f1f77bcf86cd799439014',
  })
  @IsOptional()
  @IsMongoId()
  school_id?: string;

  @ApiPropertyOptional({
    description: 'Optional notes about the enrollment',
    example: 'Enrolled for remedial studies',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Send email notification to student',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  send_email_notification?: boolean;

  @ApiPropertyOptional({
    description: 'Send in-app notification to student',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  send_app_notification?: boolean;
}

/**
 * DTO for enrolling a student in an entire academic year
 */
export class EnrollStudentAcademicYearDto {
  @ApiProperty({
    description: 'Student ID to enroll',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  student_id: string;

  @ApiProperty({
    description: 'Academic year (1-5)',
    example: 1,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  academic_year: number;

  @ApiPropertyOptional({
    description: 'School ID (required for super admin)',
    example: '507f1f77bcf86cd799439014',
  })
  @IsOptional()
  @IsMongoId()
  school_id?: string;

  @ApiPropertyOptional({
    description: 'Optional notes about the enrollment',
    example: 'Year 1 cohort 2024',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Send email notification to student',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  send_email_notification?: boolean;

  @ApiPropertyOptional({
    description: 'Send in-app notification to student',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  send_app_notification?: boolean;
}

/**
 * Individual student enrollment for bulk operations
 */
export class BulkEnrollmentItemDto {
  @ApiProperty({
    description: 'Student ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  student_id: string;

  @ApiPropertyOptional({
    description: 'Module IDs for individual enrollment',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  module_ids?: string[];

  @ApiPropertyOptional({
    description: 'Academic year for cohort enrollment',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  academic_year?: number;
}

/**
 * DTO for bulk enrollment of multiple students
 */
export class BulkEnrollStudentsDto {
  @ApiProperty({
    description: 'Array of enrollment items',
    type: [BulkEnrollmentItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkEnrollmentItemDto)
  enrollments: BulkEnrollmentItemDto[];

  @ApiPropertyOptional({
    description: 'School ID (required for super admin)',
    example: '507f1f77bcf86cd799439014',
  })
  @IsOptional()
  @IsMongoId()
  school_id?: string;

  @ApiPropertyOptional({
    description: 'Optional notes about the bulk enrollment',
    example: 'Semester start enrollments',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Send email notifications to students',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  send_email_notification?: boolean;

  @ApiPropertyOptional({
    description: 'Send in-app notifications to students',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  send_app_notification?: boolean;
}

/**
 * DTO for withdrawing/unenrolling a student
 */
export class WithdrawEnrollmentDto {
  @ApiProperty({
    description: 'Enrollment ID to withdraw',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  enrollment_id: string;

  @ApiPropertyOptional({
    description: 'Reason for withdrawal',
    example: 'Student transferred to different cohort',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'School ID (required for super admin)',
    example: '507f1f77bcf86cd799439014',
  })
  @IsOptional()
  @IsMongoId()
  school_id?: string;
}

/**
 * DTO for getting enrollment history with filters
 */
export class GetEnrollmentHistoryDto {
  @ApiPropertyOptional({
    description: 'Filter by student ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId()
  student_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by module ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsMongoId()
  module_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by enrollment type',
    enum: EnrollmentTypeEnum,
  })
  @IsOptional()
  @IsEnum(EnrollmentTypeEnum)
  enrollment_type?: EnrollmentTypeEnum;

  @ApiPropertyOptional({
    description: 'Filter by academic year',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  academic_year?: number;

  @ApiPropertyOptional({
    description: 'Filter by enrolled_by user ID',
    example: '507f1f77bcf86cd799439013',
  })
  @IsOptional()
  @IsMongoId()
  enrolled_by?: string;

  @ApiPropertyOptional({
    description: 'School ID (required for super admin)',
    example: '507f1f77bcf86cd799439014',
  })
  @IsOptional()
  @IsMongoId()
  school_id?: string;

  @ApiPropertyOptional({
    description: 'Start date for date range filter',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'End date for date range filter',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsString()
  end_date?: string;
}

/**
 * DTO for getting student enrollment status
 */
export class GetStudentEnrollmentStatusDto {
  @ApiProperty({
    description: 'Student ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  student_id: string;

  @ApiPropertyOptional({
    description: 'School ID (required for super admin)',
    example: '507f1f77bcf86cd799439014',
  })
  @IsOptional()
  @IsMongoId()
  school_id?: string;
}

