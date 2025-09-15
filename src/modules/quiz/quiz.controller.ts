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
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiBody,
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
import {
  AIGeneratedQuestion,
  AIGenerateQuizRequest,
  AIGenerateQuizResponse,
} from './dto/ai-generate-quiz.dto';
import { QuizQuestionTypeEnum } from 'src/common/constants/quiz.constant';
import { QuizQuestion } from 'src/common/types/quiz.type';

@ApiTags('Quiz Management & Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('quiz')
export class QuizController {
  constructor(
    private readonly quizService: QuizService,
    private readonly quizAnalyticsService: QuizAnalyticsService,
    private readonly httpService: HttpService,
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
    summary: 'Get a quiz group by ID with quizzes',
    description:
      'Retrieve a specific quiz group with its details and all non-deleted quizzes in the group. All authenticated users can view individual quiz groups.',
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
    description:
      'Quiz group retrieved successfully with all non-deleted quizzes',
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
        quiz: [
          {
            _id: '507f1f77bcf86cd799439013',
            quiz_group_id: '507f1f77bcf86cd799439011',
            question: 'What is 2 + 2?',
            type: 'MULTIPLE_CHOICE',
            options: ['2', '3', '4', '5'],
            answer: ['4'],
            explanation: 'Basic addition: 2 + 2 equals 4',
            sequence: 1,
            tags: ['basic', 'addition'],
            created_at: '2024-01-15T10:35:00Z',
            updated_at: '2024-01-15T10:35:00Z',
          },
        ],
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
          tags: ['Algebra', 'Equations', 'Basic Math'],
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
          tags: ['Algebra', 'Equations'],
        },
      },
      example3: {
        summary: 'Psychology Question with Tags',
        value: {
          quiz_group_id: '507f1f77bcf86cd799439011',
          question:
            'What is the most effective way to establish rapport with a client?',
          type: 'MULTIPLE_CHOICE',
          options: [
            'Listen actively and show empathy',
            'Maintain professional distance',
            'Focus on giving advice immediately',
            'Ask leading questions',
          ],
          answer: ['Listen actively and show empathy'],
          explanation:
            'Active listening and empathy are fundamental to building trust and rapport with clients.',
          sequence: 3,
          tags: ['Depression', 'Trauma', 'Counseling'],
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
  @ApiQuery({
    name: 'tags',
    required: false,
    type: String,
    description: 'Filter by tag (will match questions that contain this tag)',
    example: 'Depression',
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
            tags: ['Algebra', 'Equations', 'Basic Math'],
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
        tags: ['Algebra', 'Equations', 'Basic Math'],
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
          tags: ['Algebra', 'Equations', 'Updated Tags'],
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
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Get detailed student quiz analytics',
    description: `
    Retrieve detailed personal quiz analytics including attempt history, per-question breakdown, and performance summary.

    **Access Control:**
    - **Students:** Can view their own detailed analytics
    - **Admins (School Admin/Professor):** Can view any student's detailed analytics by providing student_id

    **Features:**
    - Personal attempt history with timestamps
    - Per-question accuracy breakdown
    - Score progression over time
    - Time spent per question
    - Performance summary (best/worst scores)
    - Question explanations for incorrect answers

    **Use Case:** Students can analyze their performance in detail.
    **Admin Use Case:** Admins can monitor individual student performance and identify areas for improvement.
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
  @ApiQuery({
    name: 'student_id',
    required: false,
    type: String,
    description:
      'Student ID (required for admin access, optional for students)',
    example: '507f1f77bcf86cd799439011',
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
        student_info: {
          student_id: '507f1f77bcf86cd799439011',
          accessed_by: 'SCHOOL_ADMIN',
          accessed_by_id: '507f1f77bcf86cd799439012',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Student ID is required for admin access or invalid filter parameters',
  })
  @ApiResponse({
    status: 403,
    description:
      'Access denied - Only students, school admins, and professors can access this endpoint',
  })
  @ApiResponse({
    status: 404,
    description: 'School not found or no data available',
  })
  getStudentQuizAnalytics(
    @User() user: JWTUserPayload,
    @Query() filterDto: StudentQuizAnalyticsFilterDto,
    @Query('student_id') studentId?: string,
  ) {
    return this.quizAnalyticsService.getStudentQuizAnalytics(
      user,
      filterDto,
      studentId,
    );
  }

  @Get('student/attempted-groups')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Get quiz groups that student has attempted',
    description: `
    Retrieve a list of quiz groups that the student has attempted, with summary statistics for each group.

    **Access Control:**
    - **Students:** Can view their own attempted quiz groups
    - **Admins (School Admin/Professor):** Can view any student's attempted quiz groups by providing student_id

    **Features:**
    - List of quiz groups with attempt statistics
    - Average scores and pass rates per group
    - Best and worst scores per group
    - Attempt dates and frequency
    - Module and chapter information
    - Pagination support for large datasets

    **Use Case:** Students can use this to select a specific quiz group to view detailed analytics.
    **Admin Use Case:** Admins can monitor student progress and performance across different quiz groups.
    `,
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
    description: 'Number of items per page (default: 10, max: 50)',
    example: 10,
  })
  @ApiQuery({
    name: 'student_id',
    required: false,
    type: String,
    description:
      'Student ID (required for admin access, optional for students)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Student attempted quiz groups retrieved successfully',
    schema: {
      example: {
        attempted_quiz_groups: [
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
            total_attempts: 3,
            average_score: 82.5,
            pass_rate: 66.7,
            best_score: 95,
            worst_score: 70,
            total_passed: 2,
            last_attempt_date: '2024-01-15T10:45:00Z',
            first_attempt_date: '2024-01-10T09:30:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNextPage: true,
          hasPrevPage: false,
        },
        summary: {
          total_quiz_groups_attempted: 25,
          total_attempts: 15,
          average_pass_rate: 73.3,
        },
        student_info: {
          student_id: '507f1f77bcf86cd799439011',
          accessed_by: 'SCHOOL_ADMIN',
          accessed_by_id: '507f1f77bcf86cd799439012',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Student ID is required for admin access or invalid parameters',
  })
  @ApiResponse({
    status: 403,
    description:
      'Access denied - Only students, school admins, and professors can access this endpoint',
  })
  @ApiResponse({
    status: 404,
    description: 'School not found or no data available',
  })
  getStudentAttemptedQuizGroups(
    @User() user: JWTUserPayload,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('student_id') studentId?: string,
  ) {
    // Validate pagination parameters
    const validatedPage = Math.max(1, parseInt(page.toString()) || 1);
    const validatedLimit = Math.min(
      50,
      Math.max(1, parseInt(limit.toString()) || 10),
    );

    return this.quizAnalyticsService.getStudentAttemptedQuizGroups(
      user,
      validatedPage,
      validatedLimit,
      studentId,
    );
  }

  @Get('student/analytics/export')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Export student quiz analytics data',
    description: `
    Export student quiz analytics in CSV or JSON format.

    **Access Control:**
    - **Students:** Can export their own analytics
    - **Admins (School Admin/Professor):** Can export any student's analytics by providing student_id

    **Supported Formats:**
    - CSV: Comma-separated values with attempt details
    - JSON: Structured data with full personal analytics

    **Export Content:**
    - Personal attempt history
    - Quiz group and module information
    - Score and time analysis
    - Question breakdown with explanations

    **Use Case:** Students can export their performance data for offline analysis.
    **Admin Use Case:** Admins can export student data for reporting and analysis.
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
  @ApiQuery({
    name: 'student_id',
    required: false,
    type: String,
    description:
      'Student ID (required for admin access, optional for students)',
    example: '507f1f77bcf86cd799439011',
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
    description:
      'Student ID is required for admin access or invalid export format',
  })
  @ApiResponse({
    status: 403,
    description:
      'Access denied - Only students, school admins, and professors can export analytics',
  })
  async exportStudentQuizAnalytics(
    @User() user: JWTUserPayload,
    @Query('format') format: ExportFormatEnum,
    @Query() filterDto: StudentQuizAnalyticsFilterDto,
    @Res() res: Response,
    @Query('student_id') studentId?: string,
  ) {
    const exportData =
      await this.quizAnalyticsService.exportStudentQuizAnalytics(
        user,
        format,
        filterDto,
        studentId,
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

  // ========== AI QUIZ GENERATION ENDPOINT ==========

  @Post('generate-ai')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Generate quiz questions using AI',
    description: `
    Generates quiz questions using AI based on the provided parameters. Only Professors and School Admins can generate AI quizzes.

    **Existing Questions Handling:**
    - If the quiz group already contains questions, new AI-generated questions will be added to the existing ones
    - Sequence numbers are automatically calculated to maintain proper order
    - The response includes both existing and newly generated questions
    - A summary is provided showing the count of existing vs new questions

    **Use Cases:**
    - Generate initial quiz questions for a new quiz group
    - Add more questions to an existing quiz group
    - Expand quiz content based on specific topics or difficulty levels
    `,
  })
  @ApiBody({
    type: AIGenerateQuizRequest,
    description: 'AI quiz generation parameters',
    examples: {
      example1: {
        summary: 'Module Quiz Generation',
        value: {
          module_id: '507f1f77bcf86cd799439011',
          type: 'MODULE',
          subject: 'Psychology',
          difficulty: 'INTERMEDIATE',
          time_left: 30,
          question_count: 10,
          question_types: ['SINGLE_SELECT', 'MULTI_SELECT'],
          content_context:
            'Focus on memory formation, retrieval processes, and cognitive biases',
        },
      },
      example2: {
        summary: 'Chapter Quiz Generation',
        value: {
          module_id: '507f1f77bcf86cd799439011',
          chapter_id: '507f1f77bcf86cd799439012',
          type: 'CHAPTER',
          subject: 'Mathematics',
          difficulty: 'BEGINNER',
          time_left: 20,
          question_count: 5,
          question_types: ['SINGLE_SELECT'],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz questions generated successfully',
    schema: {
      example: {
        questions: [
          {
            _id: '507f1f77bcf86cd799439011',
            quiz_group_id: '507f1f77bcf86cd799439010',
            question: 'What is the capital of France?',
            type: 'MULTIPLE_CHOICE',
            options: ['London', 'Berlin', 'Paris', 'Madrid'],
            answer: ['Paris'],
            explanation: 'Paris is the capital and largest city of France.',
            sequence: 1,
            tags: ['Geography', 'Europe'],
            created_at: '2024-01-15T10:30:00Z',
          },
          {
            _id: '507f1f77bcf86cd799439012',
            quiz_group_id: '507f1f77bcf86cd799439010',
            question: 'Which programming language is known for its use in web development?',
            type: 'MULTIPLE_CHOICE',
            options: ['Python', 'JavaScript', 'C++', 'Java'],
            answer: ['JavaScript'],
            explanation: 'JavaScript is widely used for web development, both frontend and backend.',
            sequence: 2,
            tags: ['Programming', 'Web Development'],
            created_at: '2024-01-15T10:31:00Z',
          }
        ],
        summary: {
          existing_questions: 0,
          new_questions: 2,
          total_questions: 2
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or validation error',
  })
  @ApiResponse({
    status: 500,
    description: 'AI service error or internal server error',
  })
  async generateQuizWithAI(
    @Body() request: AIGenerateQuizRequest,
    @User() user: JWTUserPayload,
  ): Promise<AIGenerateQuizResponse> {
    const pythonServiceUrl =
      process.env.PYTHON_API_URL || 'http://localhost:8000';
    const fullUrl = `${pythonServiceUrl}/api/v1/chat/quiz/generate`;

    // Debug logging (remove in production)
    console.log(`PYTHON_API_URL env var: ${process.env.PYTHON_API_URL || 'not set'}`);
    console.log(`Python service URL: ${pythonServiceUrl}`);
    console.log(`Full URL: ${fullUrl}`);

    try {
      // Prepare the request payload, handling empty string chapter_id
      const payload = {
        subject: request.subject,
        description: request.description,
        category: request.category,
        difficulty: request.difficulty,
        question_count: request.question_count,
        question_types: request.question_types,
        content_context: request.content_context,
        quiz_type: request.type,
        module_id: request.module_id,
        chapter_id:
          request.chapter_id && request.chapter_id !== ''
            ? request.chapter_id
            : null,
        bibliography_id: request.bibliography_id,
        time_left: request.time_left,
        quiz_group_id: request.quiz_group_id,
      };

      const response = await firstValueFrom(
        this.httpService.post(fullUrl, payload),
      );

      // Debug logging for AI service response
      console.log('AI Service Response Status:', response.status);
      console.log('AI Service Questions:', response.data?.questions);
      console.log('AI Service Questions Length:', response.data?.questions?.length);

      const questions: any[] = [];
      const existingQuizQuestions = await this.quizService.findAllQuizzes(
        user,
        { quiz_group_id: request.quiz_group_id },
      );

      // Add existing questions to the array
      existingQuizQuestions.forEach((question) => {
        questions.push(question);
      });

      const existingCount = existingQuizQuestions.length;
      const newQuestionsCount = response.data?.questions?.length || 0;

      // Log information about existing and new questions
      console.log(`Quiz group already has ${existingCount} questions. AI service returned ${newQuestionsCount} new questions.`);

      // Check if AI service returned questions
      if (!response.data?.questions || response.data.questions.length === 0) {
        console.warn('AI service returned no questions. This might indicate:');
        console.warn('1. AI service is not running');
        console.warn('2. AI service endpoint is not available');
        console.warn('3. AI service returned an error or empty response');
        console.warn('4. Request payload might be invalid');
        console.warn('Request payload sent to AI service:', JSON.stringify(payload, null, 2));
      }

      // Create new questions with proper sequencing
      let createdQuestions: any[] = [];

      if (response.data?.questions && response.data.questions.length > 0) {
        createdQuestions = await Promise.all(
          response.data.questions.map(async (question, index) => {
            const createdQuestion = await this.quizService.createQuiz(
              {
                quiz_group_id: new Types.ObjectId(request.quiz_group_id),
                question: question.question,
                type: question.type as QuizQuestionTypeEnum,
                options: question.options ?? [],
                sequence: existingCount + index + 1, // Start from existing count + 1
                tags: question.tags ?? [],
              } as CreateQuizDto,
              user,
            );
            return createdQuestion;
          }),
        );

        // Add newly created questions to the array
        questions.push(...createdQuestions);
        console.log(`Successfully created ${createdQuestions.length} new questions`);
      } else {
        console.log('No new questions to create - AI service returned empty or no questions');
      }

      return {
        questions: questions.sort((a, b) => a.sequence - b.sequence),
        summary: {
          existing_questions: existingCount,
          new_questions: createdQuestions.length,
          total_questions: questions.length
        }
      };
    } catch (error) {
      console.error('AI service call failed:', error.message);
      console.error('Error code:', error.code);
      console.error('Error status:', error.response?.status);

      // Handle different types of errors
      if (error.response?.status === 404) {
        throw new Error(
          `AI service endpoint not found at ${fullUrl}. Please check if the AI service is running and the /chat/quiz/generate endpoint is available.`,
        );
      } else if (error.response?.status >= 500) {
        throw new Error(
          'AI service is temporarily unavailable. Please try again later.',
        );
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error(
          `Unable to connect to AI service at ${fullUrl}. Please check if the service is running.`,
        );
      } else if (error.code === 'ENOTFOUND') {
        throw new Error(
          `AI service host not found: ${fullUrl}. Please check the PYTHON_API_URL environment variable.`,
        );
      } else if (error.message?.includes('circular structure')) {
        throw new Error(
          `AI service connection error. Please check if the Python service is running at ${fullUrl}`,
        );
      } else {
        throw new Error(
          `AI quiz generation failed: ${error.message || 'Unknown error'}`,
        );
      }
    }
  }
}
