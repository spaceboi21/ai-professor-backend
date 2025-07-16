import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { StatusEnum } from 'src/common/constants/status.constant';
import { RoleEnum } from 'src/common/constants/roles.constant';

export class StudentResponseDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Student ID',
  })
  _id: Types.ObjectId;

  @ApiProperty({
    example: 'Alice',
    description: 'First name of the student',
  })
  first_name: string;

  @ApiProperty({
    example: 'Smith',
    description: 'Last name of the student',
  })
  last_name: string;

  @ApiProperty({
    example: 'alice.smith@student.com',
    description: 'Email address of the student',
  })
  email: string;

  @ApiProperty({
    example: '60d21b4667d0d8992e610c85',
    description: 'School ID',
  })
  school_id: Types.ObjectId;

  @ApiProperty({
    example: 'STU001',
    description: 'Student code',
  })
  student_code: string;

  @ApiProperty({
    example: 'https://example.com/profile.jpg',
    description: 'Profile picture URL',
    required: false,
  })
  profile_pic?: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the user who created this student',
  })
  created_by: Types.ObjectId;

  @ApiProperty({
    enum: RoleEnum,
    example: RoleEnum.SCHOOL_ADMIN,
    description: 'Role of the user who created this student',
  })
  created_by_role: RoleEnum;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Role ID',
  })
  role: Types.ObjectId;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Last login timestamp',
    required: false,
  })
  last_logged_in?: Date;

  @ApiProperty({
    enum: StatusEnum,
    example: StatusEnum.ACTIVE,
    description: 'Student status',
  })
  status: StatusEnum;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Creation timestamp',
  })
  created_at: Date;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Last update timestamp',
  })
  updated_at: Date;
}

export class StudentListResponseDto {
  @ApiProperty({
    type: [StudentResponseDto],
    description: 'List of students',
  })
  data: StudentResponseDto[];

  @ApiProperty({
    example: 100,
    description: 'Total number of students',
  })
  total: number;

  @ApiProperty({
    example: 10,
    description: 'Current page number',
  })
  page: number;

  @ApiProperty({
    example: 10,
    description: 'Number of items per page',
  })
  limit: number;

  @ApiProperty({
    example: 10,
    description: 'Total number of pages',
  })
  totalPages: number;
}

export class BulkCreateStudentResponseDto {
  @ApiProperty({
    example: 'Bulk student creation completed',
    description: 'Success message',
  })
  message: string;

  @ApiProperty({
    description: 'Bulk creation results',
    type: 'object',
    properties: {
      success: {
        type: 'array',
        items: { type: 'object' },
        description: 'Successfully created students',
      },
      failed: {
        type: 'array',
        items: { type: 'object' },
        description: 'Failed student creations',
      },
      total: {
        type: 'number',
        description: 'Total number of students processed',
      },
      successCount: {
        type: 'number',
        description: 'Number of successfully created students',
      },
      failedCount: {
        type: 'number',
        description: 'Number of failed student creations',
      },
    },
  })
  data: {
    success: any[];
    failed: any[];
    total: number;
    successCount: number;
    failedCount: number;
  };
}
