import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SimulationModeEnum, SimulationStatusEnum } from 'src/database/schemas/central/simulation-session.schema';

export class SimulationStudentInfoDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'john.doe@school.edu' })
  email: string;

  @ApiProperty({ example: 'John' })
  first_name: string;

  @ApiPropertyOptional({ example: 'Doe' })
  last_name?: string;

  @ApiPropertyOptional({ example: 'STU001' })
  student_code?: string;

  @ApiPropertyOptional({ example: '/uploads/profile.jpg' })
  profile_pic?: string;

  @ApiProperty({ example: 3 })
  year: number;
}

export class SimulationTokenResponseDto {
  @ApiProperty({ example: 'Simulation started successfully' })
  message: string;

  @ApiProperty({
    description: 'Access token for simulation mode',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'Refresh token for simulation mode',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refresh_token: string;

  @ApiProperty({
    description: 'Access token expiration in seconds',
    example: 3600,
  })
  access_token_expires_in: number;

  @ApiProperty({
    description: 'Simulation session ID',
    example: '507f1f77bcf86cd799439011',
  })
  simulation_session_id: string;

  @ApiProperty({
    description: 'Simulation mode',
    enum: SimulationModeEnum,
    example: SimulationModeEnum.READ_ONLY_IMPERSONATION,
  })
  simulation_mode: SimulationModeEnum;

  @ApiProperty({
    description: 'Student being simulated',
    type: SimulationStudentInfoDto,
  })
  simulated_student: SimulationStudentInfoDto;

  @ApiProperty({
    description: 'School information',
    example: { id: '507f1f77bcf86cd799439011', name: 'Springfield University', logo: '/uploads/logo.png' },
  })
  school: {
    id: string;
    name: string;
    logo?: string;
  };
}

export class SimulationSessionResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  _id: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  original_user_id: string;

  @ApiProperty({ example: 'SCHOOL_ADMIN' })
  original_user_role: string;

  @ApiProperty({ example: 'admin@school.edu' })
  original_user_email: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  simulated_student_id: string;

  @ApiProperty({ example: 'student@school.edu' })
  simulated_student_email: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  simulated_student_name?: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  school_id: string;

  @ApiPropertyOptional({ example: 'Springfield University' })
  school_name?: string;

  @ApiProperty({ enum: SimulationModeEnum, example: SimulationModeEnum.READ_ONLY_IMPERSONATION })
  simulation_mode: SimulationModeEnum;

  @ApiProperty({ enum: SimulationStatusEnum, example: SimulationStatusEnum.ACTIVE })
  status: SimulationStatusEnum;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  started_at: Date;

  @ApiPropertyOptional({ example: '2024-01-15T11:00:00.000Z' })
  ended_at?: Date;

  @ApiPropertyOptional({ example: 3600 })
  duration_seconds?: number;

  @ApiProperty({ example: 5 })
  modules_viewed: number;

  @ApiProperty({ example: 3 })
  quizzes_viewed: number;

  @ApiProperty({ example: 2 })
  ai_chats_opened: number;

  @ApiProperty({ example: ['/', '/modules', '/modules/abc123'] })
  pages_visited: string[];
}

export class EndSimulationResponseDto {
  @ApiProperty({ example: 'Simulation ended successfully' })
  message: string;

  @ApiProperty({
    description: 'Original access token to restore admin/teacher session (empty if using fallback)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'Original refresh token (empty if using fallback)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refresh_token: string;

  @ApiPropertyOptional({
    description: 'Simulation session summary (null if no active session found)',
    type: SimulationSessionResponseDto,
    nullable: true,
  })
  session_summary: SimulationSessionResponseDto | null;
}

export class AvailableStudentForSimulationDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'john.doe@school.edu' })
  email: string;

  @ApiProperty({ example: 'John' })
  first_name: string;

  @ApiPropertyOptional({ example: 'Doe' })
  last_name?: string;

  @ApiProperty({ example: 'STU001' })
  student_code: string;

  @ApiPropertyOptional({ example: '/uploads/profile.jpg' })
  profile_pic?: string;

  @ApiProperty({ example: 3 })
  year: number;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;

  @ApiProperty({ 
    description: 'Whether this is a dummy/test student',
    example: false 
  })
  is_dummy_student: boolean;
}

export class AvailableStudentsListDto {
  @ApiProperty({ example: 'Students available for simulation retrieved successfully' })
  message: string;

  @ApiProperty({ type: [AvailableStudentForSimulationDto] })
  data: AvailableStudentForSimulationDto[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 10,
      total: 50,
      totalPages: 5,
      hasNext: true,
      hasPrev: false,
    },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class SimulationHistoryDto {
  @ApiProperty({ example: 'Simulation history retrieved successfully' })
  message: string;

  @ApiProperty({ type: [SimulationSessionResponseDto] })
  data: SimulationSessionResponseDto[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: false,
    },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

