import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiBody,
  ApiSecurity,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { Response } from 'express';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { CreateQuizGroupDto } from './dto/create-quiz-group.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { QuizFilterDto, QuizGroupFilterDto } from './dto/quiz-filter.dto';
import { UpdateQuizGroupDto } from './dto/update-quiz-group.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { QuizService } from './quiz.service';
import { QuizAnalyticsService } from './quiz-analytics.service';
import { QuizAnalyticsFilterDto } from './dto/quiz-analytics-filter.dto';
import { StudentQuizAnalyticsFilterDto } from './dto/student-quiz-analytics-filter.dto';
import { ExportFormatEnum } from 'src/common/constants/export.constant';

@ApiTags('Quiz Management & Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('quiz')
export class QuizController {
  constructor(
    private readonly quizService: QuizService,
    private readonly quizAnalyticsService: QuizAnalyticsService,
  ) {}

  // ========== QUIZ GROUP ENDPOINTS ==========

  @Post('groups')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Create a new quiz group',
    description:
      'Creates a new quiz group for organizing related quiz questions. Only Professors and School Admins can create quiz groups.',
  })
  @ApiBody({
    type: CreateQuizGroupDto,
    description: 'Quiz group creation data',
    examples: {
      example1: {
        summary: 'Basic Quiz Group',
        value: {
          subject: 'Mathematics',
          description: 'Basic algebra concepts',
          difficulty: 'INTERMEDIATE',
          category: 'Math',
          module_id: '507f1f77bcf86cd799439011',
          chapter_id: '507f1f77bcf86cd799439012',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Quiz group created successfully',
    schema: {
      example: {
        message: 'Quiz group created successfully',
        data: {
          _id: '507f1f77bcf86cd799439011',
          subject: 'Mathematics',
          description: 'Basic algebra concepts',
          difficulty: 'INTERMEDIATE',
          category: 'Math',
          module_id: '507f1f77bcf86cd799439011',
          chapter_id: '507f1f77bcf86cd799439012',
          created_at: '2024-01-15T10:30:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Module or chapter not found',
  })
  @ApiResponse({
    status: 403,
    description:
      'Access denied - Only Professors and School Admins can create quiz groups',
  })
  createQuizGroup(
    @Body() createQuizGroupDto: CreateQuizGroupDto,
    @User() user: JWTUserPayload,
  ) {
    return this.quizService.createQuizGroup(createQuizGroupDto, user);
  }

  @Get('groups')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.STUDENT)
  @ApiOperation({
    summary: 'Get all quiz groups',
    description:
      'Retrieve a paginated list of quiz groups with optional filters. All authenticated users can view quiz groups.',
  })
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
    description: 'Number of items per page (default: 10)',
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
  @ApiResponse({
    status: 200,
    description: 'Quiz groups retrieved successfully',
    schema: {
      example: {
        data: [
          {
            _id: '507f1f77bcf86cd799439011',
            subject: 'Mathematics',
            description: 'Basic algebra concepts',
            difficulty: 'INTERMEDIATE',
            category: 'Math',
            module_id: '507f1f77bcf86cd799439011',
            chapter_id: '507f1f77bcf86cd799439012',
            created_at: '2024-01-15T10:30:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
        },
      },
    },
  })
  findAllQuizGroups(
    @Query() filterDto: QuizGroupFilterDto,
    @User() user: JWTUserPayload,
  ) {
    return this.quizService.findAllQuizGroups(user, filterDto);
  }

  @Get('groups/:id')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.STUDENT)
  @ApiOperation({
    summary: 'Get a quiz group by ID',
    description:
      'Retrieve a specific quiz group with its details. All authenticated users can view individual quiz groups.',
  })
  @ApiParam({
    name: 'id',
    description: 'Quiz group ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz group retrieved successfully',
    schema: {
      example: {
        _id: '507f1f77bcf86cd799439011',
        subject: 'Mathematics',
        description: 'Basic algebra concepts',
        difficulty: 'INTERMEDIATE',
        category: 'Math',
        module_id: '507f1f77bcf86cd799439011',
        chapter_id: '507f1f77bcf86cd799439012',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz group not found',
  })
  findQuizGroupById(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.quizService.findQuizGroupById(id, user);
  }

  @Patch('groups/:id')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Update a quiz group',
    description:
      'Update an existing quiz group. Only Professors and School Admins can update quiz groups.',
  })
  @ApiParam({
    name: 'id',
    description: 'Quiz group ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiBody({
    type: UpdateQuizGroupDto,
    description: 'Quiz group update data',
    examples: {
      example1: {
        summary: 'Update Quiz Group',
        value: {
          subject: 'Advanced Mathematics',
          description: 'Advanced algebra concepts',
          difficulty: 'ADVANCED',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz group updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz group not found',
  })
  @ApiResponse({
    status: 403,
    description:
      'Access denied - Only Professors and School Admins can update quiz groups',
  })
  updateQuizGroup(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateQuizGroupDto: UpdateQuizGroupDto,
    @User() user: JWTUserPayload,
  ) {
    return this.quizService.updateQuizGroup(id, updateQuizGroupDto, user);
  }

  @Delete('groups/:id')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Delete a quiz group',
    description:
      'Soft delete a quiz group and all its associated quizzes. Only Professors and School Admins can delete quiz groups.',
  })
  @ApiParam({
    name: 'id',
    description: 'Quiz group ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz group deleted successfully',
    schema: {
      example: {
        message: 'Quiz group deleted successfully',
        data: {
          _id: '507f1f77bcf86cd799439011',
          deleted_at: '2024-01-15T10:30:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz group not found',
  })
  @ApiResponse({
    status: 403,
    description:
      'Access denied - Only Professors and School Admins can delete quiz groups',
  })
  removeQuizGroup(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.quizService.removeQuizGroup(id, user);
  }

  // ========== QUIZ QUESTION ENDPOINTS ==========

  @Post('questions')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Create a new quiz question',
    description:
      'Creates a new quiz question within a quiz group. Only Professors and School Admins can create quiz questions.',
  })
  @ApiBody({
    type: CreateQuizDto,
    description: 'Quiz question creation data',
    examples: {
      example1: {
        summary: 'Multiple Choice Question',
        value: {
          quiz_group_id: '507f1f77bcf86cd799439011',
          question: 'What is the solution to 2x + 5 = 13?',
          type: 'MULTIPLE_CHOICE',
          options: ['3', '4', '5', '6'],
          answer: ['4'],
          explanation:
            'Subtract 5 from both sides: 2x = 8, then divide by 2: x = 4',
          sequence: 1,
        },
      },
      example2: {
        summary: 'True/False Question',
        value: {
          quiz_group_id: '507f1f77bcf86cd799439011',
          question: 'The equation 2x + 3 = 7 has a solution of x = 2.',
          type: 'TRUE_FALSE',
          options: ['True', 'False'],
          answer: ['True'],
          explanation: 'Substituting x = 2: 2(2) + 3 = 4 + 3 = 7 ✓',
          sequence: 2,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Quiz question created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or answers not in options',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz group not found',
  })
  @ApiResponse({
    status: 403,
    description:
      'Access denied - Only Professors and School Admins can create quiz questions',
  })
  createQuiz(
    @Body() createQuizDto: CreateQuizDto,
    @User() user: JWTUserPayload,
  ) {
    return this.quizService.createQuiz(createQuizDto, user);
  }

  @Get('questions')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.STUDENT)
  @ApiOperation({
    summary: 'Get all quiz questions',
    description:
      'Retrieve a paginated list of quiz questions with optional filters. All authenticated users can view quiz questions.',
  })
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
    description: 'Number of items per page (default: 10)',
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
    name: 'type',
    required: false,
    enum: ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_IN_THE_BLANK'],
    description: 'Filter by question type',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz questions retrieved successfully',
    schema: {
      example: {
        data: [
          {
            _id: '507f1f77bcf86cd799439011',
            question: 'What is the solution to 2x + 5 = 13?',
            type: 'MULTIPLE_CHOICE',
            options: ['3', '4', '5', '6'],
            answer: ['4'],
            explanation:
              'Subtract 5 from both sides: 2x = 8, then divide by 2: x = 4',
            sequence: 1,
            quiz_group_id: '507f1f77bcf86cd799439011',
            created_at: '2024-01-15T10:30:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 50,
          totalPages: 5,
        },
      },
    },
  })
  findAllQuizzes(
    @Query() filterDto: QuizFilterDto,
    @User() user: JWTUserPayload,
  ) {
    return this.quizService.findAllQuizzes(user, filterDto);
  }

  @Get('questions/:id')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.STUDENT)
  @ApiOperation({
    summary: 'Get a quiz question by ID',
    description:
      'Retrieve a specific quiz question with its details. All authenticated users can view individual quiz questions.',
  })
  @ApiParam({
    name: 'id',
    description: 'Quiz question ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz question retrieved successfully',
    schema: {
      example: {
        _id: '507f1f77bcf86cd799439011',
        question: 'What is the solution to 2x + 5 = 13?',
        type: 'MULTIPLE_CHOICE',
        options: ['3', '4', '5', '6'],
        answer: ['4'],
        explanation:
          'Subtract 5 from both sides: 2x = 8, then divide by 2: x = 4',
        sequence: 1,
        quiz_group_id: '507f1f77bcf86cd799439011',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz question not found',
  })
  findQuizById(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.quizService.findQuizById(id, user);
  }

  @Patch('questions/:id')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Update a quiz question',
    description:
      'Update an existing quiz question. Only Professors and School Admins can update quiz questions.',
  })
  @ApiParam({
    name: 'id',
    description: 'Quiz question ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiBody({
    type: UpdateQuizDto,
    description: 'Quiz question update data',
    examples: {
      example1: {
        summary: 'Update Question',
        value: {
          question: 'What is the solution to 2x + 5 = 13? (Updated)',
          options: ['3', '4', '5', '6'],
          answer: ['4'],
          explanation:
            'Updated explanation: Subtract 5 from both sides: 2x = 8, then divide by 2: x = 4',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz question updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz question not found',
  })
  @ApiResponse({
    status: 403,
    description:
      'Access denied - Only Professors and School Admins can update quiz questions',
  })
  updateQuiz(
    @Param('id') id: string,
    @Body() updateQuizDto: UpdateQuizDto,
    @User() user: JWTUserPayload,
  ) {
    return this.quizService.updateQuiz(id, updateQuizDto, user);
  }

  @Delete('questions/:id')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Delete a quiz question',
    description:
      'Soft delete a quiz question. Only Professors and School Admins can delete quiz questions.',
  })
  @ApiParam({
    name: 'id',
    description: 'Quiz question ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz question deleted successfully',
    schema: {
      example: {
        message: 'Quiz question deleted successfully',
        data: {
          _id: '507f1f77bcf86cd799439011',
          deleted_at: '2024-01-15T10:30:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz question not found',
  })
  @ApiResponse({
    status: 403,
    description:
      'Access denied - Only Professors and School Admins can delete quiz questions',
  })
  removeQuiz(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.quizService.removeQuiz(id, user);
  }

  // ========== QUIZ ANALYTICS ENDPOINTS ==========

  @Get('analytics')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Get comprehensive quiz analytics for administrators',
    description: `
    Retrieve detailed quiz analytics including:
    - Total attempts per quiz
    - Average scores and pass rates
    - Most missed questions with accuracy rates
    - Time analysis and score distributions
    - Module and chapter breakdowns
    
    **Access Control:** Only Professors and School Admins can access this endpoint.
    **Data Scope:** Analytics are filtered by the user's school and can be further filtered by module, chapter, quiz group, and date range.
    `,
  })
  @ApiQuery({
    name: 'module_id',
    required: false,
    type: String,
    description: 'Filter analytics by specific module ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'chapter_id',
    required: false,
    type: String,
    description: 'Filter analytics by specific chapter ID',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiQuery({
    name: 'quiz_group_id',
    required: false,
    type: String,
    description: 'Filter analytics by specific quiz group ID',
    example: '507f1f77bcf86cd799439013',
  })
  @ApiQuery({
    name: 'date_from',
    required: false,
    type: String,
    description: 'Filter by start date (ISO string format)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'date_to',
    required: false,
    type: String,
    description: 'Filter by end date (ISO string format)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz analytics retrieved successfully',
    schema: {
      example: {
        analytics: [
          {
            _id: '507f1f77bcf86cd799439011',
            quiz_group: {
              _id: '507f1f77bcf86cd799439011',
              subject: 'Mathematics',
              description: 'Basic algebra concepts',
              difficulty: 'INTERMEDIATE',
              category: 'Math',
            },
            module: {
              _id: '507f1f77bcf86cd799439011',
              title: 'Algebra Fundamentals',
              subject: 'Mathematics',
            },
            chapter: {
              _id: '507f1f77bcf86cd799439012',
              title: 'Linear Equations',
            },
            total_attempts: 45,
            average_score: 78.5,
            pass_rate: 82.2,
            total_passed: 37,
            total_failed: 8,
            min_score: 45,
            max_score: 100,
            average_time_taken: 1200.5,
            most_missed_questions: [
              {
                quiz_id: '507f1f77bcf86cd799439014',
                question: 'What is the solution to 2x + 5 = 13?',
                sequence: 3,
                total_attempts: 45,
                correct_attempts: 28,
                incorrect_attempts: 17,
                accuracy_rate: 62.2,
              },
            ],
          },
        ],
        summary: {
          total_quizzes: 5,
          total_attempts: 225,
          average_pass_rate: 78.5,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid filter parameters or validation error',
  })
  @ApiResponse({
    status: 403,
    description:
      'Access denied - Only Professors and School Admins can view analytics',
  })
  @ApiResponse({
    status: 404,
    description: 'School not found or no data available',
  })
  getQuizAnalytics(
    @Query() filterDto: QuizAnalyticsFilterDto,
    @User() user: JWTUserPayload,
  ) {
    return this.quizAnalyticsService.getQuizAnalytics(user, filterDto);
  }

  @Get('analytics/export')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Export quiz analytics data',
    description: `
    Export comprehensive quiz analytics in CSV or JSON format.
    
    **Supported Formats:**
    - CSV: Comma-separated values with headers
    - JSON: Structured data with full analytics
    
    **Export Content:**
    - Quiz group information
    - Module and chapter details
    - Total attempts and scores
    - Pass rates and time analysis
    - Most missed questions
    
    **Access Control:** Only Professors and School Admins can export analytics.
    **Filtering:** All analytics filters are supported for export.
    `,
  })
  @ApiQuery({
    name: 'format',
    enum: ExportFormatEnum,
    description: 'Export format (csv or json)',
    example: 'csv',
  })
  @ApiQuery({
    name: 'module_id',
    required: false,
    type: String,
    description: 'Filter export by specific module ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'chapter_id',
    required: false,
    type: String,
    description: 'Filter export by specific chapter ID',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiQuery({
    name: 'quiz_group_id',
    required: false,
    type: String,
    description: 'Filter export by specific quiz group ID',
    example: '507f1f77bcf86cd799439013',
  })
  @ApiQuery({
    name: 'date_from',
    required: false,
    type: String,
    description: 'Filter by start date (ISO string format)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'date_to',
    required: false,
    type: String,
    description: 'Filter by end date (ISO string format)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @ApiResponse({
    status: 200,
    description:
      'Analytics exported successfully - File download with appropriate headers',
    headers: {
      'Content-Type': {
        description: 'Content type of the exported file',
        example: 'text/csv',
      },
      'Content-Disposition': {
        description: 'File attachment header with filename',
        example: 'attachment; filename="quiz-analytics-2024-01-15.csv"',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid export format or filter parameters',
  })
  @ApiResponse({
    status: 403,
    description:
      'Access denied - Only Professors and School Admins can export analytics',
  })
  async exportQuizAnalytics(
    @Query('format') format: ExportFormatEnum,
    @Query() filterDto: QuizAnalyticsFilterDto,
    @User() user: JWTUserPayload,
    @Res() res: Response,
  ) {
    const exportData = await this.quizAnalyticsService.exportQuizAnalytics(
      user,
      format,
      filterDto,
    );

    res.setHeader('Content-Type', exportData.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${exportData.filename}"`,
    );
    res.send(exportData.content);
  }

  @Get('student/analytics')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({
    summary: 'Get personal quiz analytics for students',
    description: `
    Retrieve detailed personal quiz analytics including:
    - Personal attempt history with timestamps
    - Per-question accuracy breakdown
    - Score progression over time
    - Time spent per question
    - Performance summary (best/worst scores)
    - Question explanations for incorrect answers
    
    **Access Control:** Only Students can access this endpoint.
    **Data Scope:** Students can only view their own personal analytics.
    **Privacy:** All data is isolated to the authenticated student.
    `,
  })
  @ApiQuery({
    name: 'module_id',
    required: false,
    type: String,
    description: 'Filter personal analytics by specific module ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'chapter_id',
    required: false,
    type: String,
    description: 'Filter personal analytics by specific chapter ID',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiQuery({
    name: 'quiz_group_id',
    required: false,
    type: String,
    description: 'Filter personal analytics by specific quiz group ID',
    example: '507f1f77bcf86cd799439013',
  })
  @ApiQuery({
    name: 'date_from',
    required: false,
    type: String,
    description: 'Filter by start date (ISO string format)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'date_to',
    required: false,
    type: String,
    description: 'Filter by end date (ISO string format)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Student quiz analytics retrieved successfully',
    schema: {
      example: {
        attempts: [
          {
            _id: '507f1f77bcf86cd799439011',
            quiz_group: {
              _id: '507f1f77bcf86cd799439011',
              subject: 'Mathematics',
              description: 'Basic algebra concepts',
              difficulty: 'INTERMEDIATE',
            },
            module: {
              _id: '507f1f77bcf86cd799439011',
              title: 'Algebra Fundamentals',
              subject: 'Mathematics',
            },
            chapter: {
              _id: '507f1f77bcf86cd799439012',
              title: 'Linear Equations',
            },
            score_percentage: 85,
            is_passed: true,
            attempt_number: 1,
            started_at: '2024-01-15T10:30:00Z',
            completed_at: '2024-01-15T10:45:00Z',
            time_taken_seconds: 900,
            question_breakdown: [
              {
                quiz_id: '507f1f77bcf86cd799439014',
                question: 'What is the solution to 2x + 5 = 13?',
                sequence: 1,
                selected_answers: ['4'],
                correct_answers: ['4'],
                is_correct: true,
                time_spent_seconds: 45,
                explanation:
                  'Subtract 5 from both sides: 2x = 8, then divide by 2: x = 4',
              },
            ],
          },
        ],
        summary: {
          total_attempts: 12,
          average_score: 82.5,
          pass_rate: 75.0,
          total_passed: 9,
          total_failed: 3,
          average_time_taken: 1100.2,
          best_score: 95,
          worst_score: 65,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid filter parameters or validation error',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - Only Students can view personal analytics',
  })
  @ApiResponse({
    status: 404,
    description: 'School not found or no data available',
  })
  getStudentQuizAnalytics(
    @Query() filterDto: StudentQuizAnalyticsFilterDto,
    @User() user: JWTUserPayload,
  ) {
    return this.quizAnalyticsService.getStudentQuizAnalytics(user, filterDto);
  }

  @Get('student/analytics/export')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({
    summary: 'Export personal quiz analytics data',
    description: `
    Export personal quiz analytics in CSV or JSON format.
    
    **Supported Formats:**
    - CSV: Comma-separated values with attempt details
    - JSON: Structured data with full personal analytics
    
    **Export Content:**
    - Personal attempt history
    - Quiz group and module information
    - Score and time analysis
    - Question breakdown with explanations
    
    **Access Control:** Only Students can export their personal analytics.
    **Privacy:** All exported data is isolated to the authenticated student.
    **Filtering:** All personal analytics filters are supported for export.
    `,
  })
  @ApiQuery({
    name: 'format',
    enum: ExportFormatEnum,
    description: 'Export format (csv or json)',
    example: 'csv',
  })
  @ApiQuery({
    name: 'module_id',
    required: false,
    type: String,
    description: 'Filter export by specific module ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'chapter_id',
    required: false,
    type: String,
    description: 'Filter export by specific chapter ID',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiQuery({
    name: 'quiz_group_id',
    required: false,
    type: String,
    description: 'Filter export by specific quiz group ID',
    example: '507f1f77bcf86cd799439013',
  })
  @ApiQuery({
    name: 'date_from',
    required: false,
    type: String,
    description: 'Filter by start date (ISO string format)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'date_to',
    required: false,
    type: String,
    description: 'Filter by end date (ISO string format)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @ApiResponse({
    status: 200,
    description:
      'Student analytics exported successfully - File download with appropriate headers',
    headers: {
      'Content-Type': {
        description: 'Content type of the exported file',
        example: 'text/csv',
      },
      'Content-Disposition': {
        description: 'File attachment header with filename',
        example: 'attachment; filename="student-quiz-analytics-2024-01-15.csv"',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid export format or filter parameters',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - Only Students can export personal analytics',
  })
  async exportStudentQuizAnalytics(
    @Query('format') format: ExportFormatEnum,
    @Query() filterDto: StudentQuizAnalyticsFilterDto,
    @User() user: JWTUserPayload,
    @Res() res: Response,
  ) {
    const exportData =
      await this.quizAnalyticsService.exportStudentQuizAnalytics(
        user,
        format,
        filterDto,
      );

    res.setHeader('Content-Type', exportData.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${exportData.filename}"`,
    );
    res.send(exportData.content);
  }

  // ========== ADDITIONAL ENDPOINTS ==========

  @Get('groups/:groupId/questions')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.STUDENT)
  @ApiOperation({
    summary: 'Get all questions for a specific quiz group',
    description:
      'Retrieve all quiz questions belonging to a specific quiz group. All authenticated users can view questions within a quiz group.',
  })
  @ApiParam({
    name: 'groupId',
    description: 'Quiz group ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz questions retrieved successfully',
    schema: {
      example: {
        data: [
          {
            _id: '507f1f77bcf86cd799439011',
            question: 'What is the solution to 2x + 5 = 13?',
            type: 'MULTIPLE_CHOICE',
            options: ['3', '4', '5', '6'],
            answer: ['4'],
            explanation:
              'Subtract 5 from both sides: 2x = 8, then divide by 2: x = 4',
            sequence: 1,
            quiz_group_id: '507f1f77bcf86cd799439011',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 15,
          totalPages: 2,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz group not found',
  })
  findQuizzesByGroup(
    @Param('groupId', ParseObjectIdPipe) groupId: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    const updatedFilter = { quiz_group_id: groupId };
    return this.quizService.findAllQuizzes(user, updatedFilter);
  }

  @Get('modules/:moduleId/groups')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.STUDENT)
  @ApiOperation({
    summary: 'Get all quiz groups for a specific module',
    description:
      'Retrieve all quiz groups belonging to a specific module. All authenticated users can view quiz groups within a module.',
  })
  @ApiParam({
    name: 'moduleId',
    description: 'Module ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz groups retrieved successfully',
    schema: {
      example: {
        data: [
          {
            _id: '507f1f77bcf86cd799439011',
            subject: 'Mathematics',
            description: 'Basic algebra concepts',
            difficulty: 'INTERMEDIATE',
            category: 'Math',
            module_id: '507f1f77bcf86cd799439011',
            chapter_id: '507f1f77bcf86cd799439012',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 8,
          totalPages: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Module not found',
  })
  findQuizGroupsByModule(
    @Param('moduleId', ParseObjectIdPipe) moduleId: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    const updatedFilter = { module_id: moduleId };
    return this.quizService.findAllQuizGroups(user, updatedFilter);
  }

  @Get('chapters/:chapterId/groups')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.STUDENT)
  @ApiOperation({
    summary: 'Get all quiz groups for a specific chapter',
    description:
      'Retrieve all quiz groups belonging to a specific chapter. All authenticated users can view quiz groups within a chapter.',
  })
  @ApiParam({
    name: 'chapterId',
    description: 'Chapter ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz groups retrieved successfully',
    schema: {
      example: {
        data: [
          {
            _id: '507f1f77bcf86cd799439011',
            subject: 'Mathematics',
            description: 'Basic algebra concepts',
            difficulty: 'INTERMEDIATE',
            category: 'Math',
            module_id: '507f1f77bcf86cd799439011',
            chapter_id: '507f1f77bcf86cd799439012',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 5,
          totalPages: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Chapter not found',
  })
  findQuizGroupsByChapter(
    @Param('chapterId', ParseObjectIdPipe) chapterId: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    const updatedFilter = { chapter_id: chapterId };
    return this.quizService.findAllQuizGroups(user, updatedFilter);
  }
}
