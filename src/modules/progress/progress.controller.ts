import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ProgressService } from './progress.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { User } from 'src/common/decorators/user.decorator';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { StartModuleDto } from './dto/start-module.dto';
import { StartChapterDto } from './dto/start-chapter.dto';
import { StartQuizAttemptDto } from './dto/start-quiz-attempt.dto';
import { SubmitQuizAnswersDto } from './dto/submit-quiz-answers.dto';
import {
  ProgressFilterDto,
  QuizAttemptFilterDto,
} from './dto/progress-filter.dto';
import { StudentDashboardDto } from './dto/student-dashboard.dto';

@ApiTags('Progress Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('progress')
export class ProgressController {
  private readonly logger = new Logger(ProgressController.name);

  constructor(private readonly progressService: ProgressService) {}

  // ========== STUDENT PROGRESS ENDPOINTS ==========

  @Post('modules/start')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Start a module (Student)' })
  @ApiBody({ type: StartModuleDto })
  @ApiResponse({
    status: 201,
    description: 'Module started successfully',
    schema: {
      example: {
        message: 'Module started successfully',
        data: {
          progress_id: '507f1f77bcf86cd799439011',
          module_id: '507f1f77bcf86cd799439012',
          status: 'IN_PROGRESS',
          progress_percentage: 0,
          chapters_completed: 0,
          total_chapters: 5,
          started_at: '2024-01-15T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Only students can start modules' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  async startModule(
    @Body() startModuleDto: StartModuleDto,
    @User() user: JWTUserPayload,
  ) {
    return this.progressService.startModule(startModuleDto, user);
  }

  @Post('chapters/start')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Start a chapter (Student)' })
  @ApiBody({ type: StartChapterDto })
  @ApiResponse({
    status: 201,
    description: 'Chapter started successfully',
    schema: {
      example: {
        message: 'Chapter started successfully',
        data: {
          progress_id: '507f1f77bcf86cd799439011',
          chapter_id: '507f1f77bcf86cd799439012',
          module_id: '507f1f77bcf86cd799439013',
          status: 'IN_PROGRESS',
          chapter_sequence: 1,
          started_at: '2024-01-15T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 403,
    description: 'Access denied - previous chapter quiz not completed',
  })
  @ApiResponse({ status: 404, description: 'Chapter not found' })
  async startChapter(
    @Body() startChapterDto: StartChapterDto,
    @User() user: JWTUserPayload,
  ) {
    return this.progressService.startChapter(startChapterDto, user);
  }

  @Post('quiz/start')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Start a quiz attempt (Student)' })
  @ApiBody({ type: StartQuizAttemptDto })
  @ApiResponse({
    status: 201,
    description: 'Quiz attempt started successfully',
    schema: {
      example: {
        message: 'Quiz attempt started successfully',
        data: {
          attempt_id: '507f1f77bcf86cd799439011',
          quiz_group_id: '507f1f77bcf86cd799439012',
          status: 'IN_PROGRESS',
          started_at: '2024-01-15T10:00:00.000Z',
          total_questions: 10,
          attempt_number: 1,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 403,
    description: 'Access denied - prerequisites not met',
  })
  @ApiResponse({ status: 404, description: 'Quiz group not found' })
  async startQuizAttempt(
    @Body() startQuizAttemptDto: StartQuizAttemptDto,
    @User() user: JWTUserPayload,
  ) {
    return this.progressService.startQuizAttempt(startQuizAttemptDto, user);
  }

  @Post('quiz/submit')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Submit quiz answers (Student)' })
  @ApiBody({ type: SubmitQuizAnswersDto })
  @ApiResponse({
    status: 200,
    description: 'Quiz answers submitted successfully',
    schema: {
      example: {
        message: 'Quiz answers submitted successfully',
        data: {
          attempt_id: '507f1f77bcf86cd799439011',
          score_percentage: 85,
          correct_answers: 17,
          total_questions: 20,
          is_passed: true,
          time_taken_minutes: 25,
          status: 'COMPLETED',
          completed_at: '2024-01-15T10:25:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 403,
    description: 'Only students can submit quiz answers',
  })
  @ApiResponse({ status: 404, description: 'Quiz attempt not found' })
  async submitQuizAnswers(
    @Body() submitQuizAnswersDto: SubmitQuizAnswersDto,
    @User() user: JWTUserPayload,
  ) {
    return this.progressService.submitQuizAnswers(submitQuizAnswersDto, user);
  }

  // ========== STUDENT PROGRESS RETRIEVAL ENDPOINTS ==========

  @Get('modules')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Get student module progress (Student)' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'module_id',
    required: false,
    type: String,
    description: 'Filter by module ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
    description: 'Filter by progress status',
    example: 'IN_PROGRESS',
  })
  @ApiQuery({
    name: 'from_date',
    required: false,
    type: String,
    description: 'Filter from date (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'to_date',
    required: false,
    type: String,
    description: 'Filter to date (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Module progress retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only students can view their progress',
  })
  async getStudentModuleProgress(
    @User() user: JWTUserPayload,
    @Query() paginationDto: PaginationDto,
    @Query() filterDto: ProgressFilterDto,
  ) {
    return this.progressService.getStudentModuleProgress(
      user,
      paginationDto,
      filterDto,
    );
  }

  @Get('chapters')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Get student chapter progress (Student)' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'module_id',
    required: false,
    type: String,
    description: 'Filter by module ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'chapter_id',
    required: false,
    type: String,
    description: 'Filter by chapter ID',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
    description: 'Filter by progress status',
    example: 'IN_PROGRESS',
  })
  @ApiResponse({
    status: 200,
    description: 'Chapter progress retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only students can view their progress',
  })
  async getStudentChapterProgress(
    @User() user: JWTUserPayload,
    @Query() paginationDto: PaginationDto,
    @Query() filterDto: ProgressFilterDto,
  ) {
    return this.progressService.getStudentChapterProgress(
      user,
      paginationDto,
      filterDto,
    );
  }

  @Get('quiz-attempts')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Get student quiz attempts (Student)' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'quiz_group_id',
    required: false,
    type: String,
    description: 'Filter by quiz group ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'module_id',
    required: false,
    type: String,
    description: 'Filter by module ID',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['IN_PROGRESS', 'COMPLETED', 'TIMEOUT', 'ABANDONED'],
    description: 'Filter by attempt status',
    example: 'COMPLETED',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz attempts retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only students can view their quiz attempts',
  })
  async getStudentQuizAttempts(
    @User() user: JWTUserPayload,
    @Query() paginationDto: PaginationDto,
    @Query() filterDto: QuizAttemptFilterDto,
  ) {
    return this.progressService.getStudentQuizAttempts(
      user,
      paginationDto,
      filterDto,
    );
  }

  // ========== DASHBOARD ENDPOINTS ==========

  @Get('dashboard')
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.PROFESSOR,
    RoleEnum.SUPER_ADMIN,
  )
  @ApiOperation({
    summary:
      'Get student dashboard overview (Student/Admin/Professor/Super Admin)',
  })
  @ApiQuery({
    name: 'student_id',
    required: false,
    type: String,
    description: 'Student ID (required for admin/professor/super admin access)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'school_id',
    required: false,
    type: String,
    description: 'School ID (required for super admin access)',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
    schema: {
      example: {
        message: 'Dashboard data retrieved successfully',
        data: {
          overview: {
            total_modules: 5,
            in_progress_modules: 2,
            completed_modules: 2,
            total_quiz_attempts: 15,
            passed_quizzes: 12,
            average_progress: 75,
          },
          recent_activity: [
            {
              _id: '507f1f77bcf86cd799439011',
              module_id: {
                _id: '507f1f77bcf86cd799439012',
                title: 'Child Development Psychology',
                subject: 'Psychology',
              },
              progress_percentage: 85,
              status: 'IN_PROGRESS',
              last_accessed_at: '2024-01-15T10:00:00.000Z',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Only students can view their dashboard',
  })
  async getStudentDashboard(@User() user: JWTUserPayload) {
    return this.progressService.getStudentDashboard(user);
  }

  @Get('admin/dashboard')
  @Roles(RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({
    summary: 'Get school admin dashboard overview (Admin/Professor)',
  })
  @ApiQuery({
    name: 'module_id',
    required: false,
    type: String,
    description: 'Filter by specific module ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin dashboard data retrieved successfully',
    schema: {
      example: {
        message: 'Admin dashboard data retrieved successfully',
        data: {
          overview: {
            total_students: 150,
            active_students: 125,
            not_started: 25,
            in_progress: 75,
            completed: 50,
            average_progress: 65,
          },
          student_progress: [
            {
              _id: '507f1f77bcf86cd799439011',
              student_id: {
                _id: '507f1f77bcf86cd799439012',
                first_name: 'John',
                last_name: 'Doe',
                email: 'john.doe@example.com',
              },
              module_id: {
                _id: '507f1f77bcf86cd799439013',
                title: 'Child Development Psychology',
                subject: 'Psychology',
              },
              progress_percentage: 75,
              status: 'IN_PROGRESS',
              last_accessed_at: '2024-01-15T10:00:00.000Z',
            },
          ],
          recent_quiz_attempts: [],
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Only school admins and professors can view school dashboard',
  })
  async getSchoolAdminDashboard(
    @User() user: JWTUserPayload,
    @Query('module_id', ParseObjectIdPipe) moduleId?: string | Types.ObjectId,
  ) {
    return this.progressService.getSchoolAdminDashboard(
      user,
      moduleId?.toString(),
    );
  }

  // ========== VALIDATION ENDPOINTS ==========

  @Get('chapters/:chapter_id/can-access')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Check if student can access a chapter (Student)' })
  @ApiParam({
    name: 'chapter_id',
    type: String,
    description: 'Chapter ID to check access for',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Chapter access check completed',
    schema: {
      example: {
        message: 'Chapter access validated',
        data: {
          can_access: true,
          chapter_id: '507f1f77bcf86cd799439011',
          reason: null,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Chapter access denied',
    schema: {
      example: {
        message: 'Chapter access denied',
        data: {
          can_access: false,
          chapter_id: '507f1f77bcf86cd799439011',
          reason:
            'You must complete the quiz for "Introduction to Psychology" before accessing this chapter',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Chapter not found' })
  async canAccessChapter(
    @Param('chapter_id', ParseObjectIdPipe) chapterId: string | Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    try {
      await this.progressService.startChapter({ chapter_id: chapterId }, user);
      return {
        message: 'Chapter access validated',
        data: {
          can_access: true,
          chapter_id: chapterId,
          reason: null,
        },
      };
    } catch (error) {
      if (error.status === 403) {
        return {
          message: 'Chapter access denied',
          data: {
            can_access: false,
            chapter_id: chapterId,
            reason: error.message,
          },
        };
      }
      throw error;
    }
  }

  @Get('quiz/:quiz_group_id/can-access')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Check if student can access a quiz (Student)' })
  @ApiParam({
    name: 'quiz_group_id',
    type: String,
    description: 'Quiz group ID to check access for',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz access check completed',
    schema: {
      example: {
        message: 'Quiz access validated',
        data: {
          can_access: true,
          quiz_group_id: '507f1f77bcf86cd799439011',
          reason: null,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Quiz group not found' })
  async canAccessQuiz(
    @Param('quiz_group_id', ParseObjectIdPipe)
    quizGroupId: string | Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    try {
      await this.progressService.startQuizAttempt(
        { quiz_group_id: quizGroupId },
        user,
      );
      return {
        message: 'Quiz access validated',
        data: {
          can_access: true,
          quiz_group_id: quizGroupId,
          reason: null,
        },
      };
    } catch (error) {
      if (error.status === 403) {
        return {
          message: 'Quiz access denied',
          data: {
            can_access: false,
            quiz_group_id: quizGroupId,
            reason: error.message,
          },
        };
      }
      throw error;
    }
  }
}
