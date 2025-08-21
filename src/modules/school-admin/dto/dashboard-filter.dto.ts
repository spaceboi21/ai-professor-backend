import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class DashboardFilterDto {
  @ApiProperty({
    description: 'Filter by start date (YYYY-MM-DD)',
    required: false,
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  from_date?: string;

  @ApiProperty({
    description: 'Filter by end date (YYYY-MM-DD)',
    required: false,
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  to_date?: string;

  @ApiProperty({
    description: 'Filter by specific module ID',
    required: false,
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  module_id?: string;

  @ApiProperty({
    description: 'Filter by cohort/class name',
    required: false,
    example: 'Class of 2024',
  })
  @IsOptional()
  @IsString()
  cohort?: string;
}

export class QuizStatisticsDto {
  @ApiProperty({
    description: 'Total number of quiz attempts in the school',
    example: 150,
  })
  total_quiz_attempts: number;

  @ApiProperty({
    description: 'Number of quiz attempts that passed',
    example: 120,
  })
  passed_quiz_attempts: number;

  @ApiProperty({
    description: 'Percentage of quiz attempts that passed',
    example: 80,
  })
  quiz_pass_rate: number;

  @ApiProperty({
    description: 'Average quiz score percentage',
    example: 75,
  })
  average_quiz_score: number;

  @ApiProperty({
    description: 'Total number of AI chat sessions created',
    example: 85,
  })
  total_ai_chat_sessions: number;
}

export class EnhancedDashboardResponseDto {
  @ApiProperty({
    description: 'Overview statistics',
    example: {
      active_students: 45,
      total_students: 60,
      average_completion_percentage: 78,
      total_modules: 8,
      active_modules: 6,
    },
  })
  overview: {
    active_students: number;
    total_students: number;
    average_completion_percentage: number;
    total_modules: number;
    active_modules: number;
  };

  @ApiProperty({
    description: 'Module performance statistics',
    type: 'array',
    example: [
      {
        module_id: '507f1f77bcf86cd799439011',
        title: 'Child Development Psychology',
        completion_percentage: 85,
        active_students: 12,
        average_time_spent: 120,
      },
    ],
  })
  module_performance: Array<{
    module_id: string;
    title: string;
    completion_percentage: number;
    active_students: number;
    average_time_spent: number;
  }>;

  @ApiProperty({
    description: 'AI feedback error analysis',
    type: 'array',
    example: [
      {
        error_type: 'misunderstanding_trauma_cues',
        count: 23,
        percentage: 15.3,
        affected_students: 8,
        affected_modules: 3,
      },
    ],
  })
  ai_feedback_errors: Array<{
    error_type: string;
    count: number;
    percentage: number;
    affected_students: number;
    affected_modules: number;
  }>;

  @ApiProperty({
    description: 'Engagement metrics',
    example: {
      total_views: 1250,
      average_session_duration: 45,
      completion_rate: 78,
    },
  })
  engagement_metrics: {
    total_views: number;
    average_session_duration: number;
    completion_rate: number;
  };

  @ApiProperty({
    description: 'Quiz statistics',
    type: QuizStatisticsDto,
  })
  quiz_statistics: QuizStatisticsDto;
} 