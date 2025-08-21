import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Res,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { ExportFormatEnum } from 'src/common/constants/export.constant';
import { AnchorTagService } from './anchor-tag.service';
import { StudentAnchorTagAttemptService } from './student-anchor-tag-attempt.service';
import { AnchorTagAnalyticsService } from './anchor-tag-analytics.service';
import { CreateAnchorTagDto } from './dto/create-anchor-tag.dto';
import { UpdateAnchorTagDto } from './dto/update-anchor-tag.dto';
import { AnchorTagFilterDto } from './dto/anchor-tag-filter.dto';
import { SubmitAnchorTagAnswerDto } from './dto/submit-anchor-tag-answer.dto';
import { AnchorTagAnalyticsFilterDto } from './dto/anchor-tag-analytics-filter.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { AnchorTagAttemptStatusEnum } from 'src/common/constants/anchor-tag.constant';
import { User } from 'src/common/decorators/user.decorator';

@ApiTags('Anchor Tags')
@Controller('anchor-tags')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiBearerAuth()
export class AnchorTagController {
  constructor(
    private readonly anchorTagService: AnchorTagService,
    private readonly studentAnchorTagAttemptService: StudentAnchorTagAttemptService,
    private readonly anchorTagAnalyticsService: AnchorTagAnalyticsService,
  ) {}

  @Post()
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a new anchor tag' })
  @ApiResponse({
    status: 201,
    description: 'Anchor tag created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data provided',
  })
  @ApiResponse({
    status: 404,
    description:
      'Not found - Module, chapter, bibliography, or quiz group not found',
  })
  create(
    @Body() createAnchorTagDto: CreateAnchorTagDto,
    @User() user: JWTUserPayload,
  ) {
    return this.anchorTagService.createAnchorTag(createAnchorTagDto, user);
  }

  @Get()
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.STUDENT)
  @ApiOperation({
    summary: 'Get all anchor tags with pagination and filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Anchor tags retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - School not found',
  })
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query() filterDto: AnchorTagFilterDto,
    @User() user: JWTUserPayload,
  ) {
    return this.anchorTagService.findAllAnchorTags(
      user,
      paginationDto,
      filterDto,
    );
  }

  @Get('bibliography/:bibliographyId')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Get anchor tags by bibliography ID' })
  @ApiResponse({
    status: 200,
    description: 'Anchor tags retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - School or bibliography not found',
  })
  findByBibliography(
    @Param('bibliographyId') bibliographyId: string,
    @User() user: JWTUserPayload,
  ) {
    return this.anchorTagService.getAnchorTagsByBibliography(
      bibliographyId,
      user,
    );
  }

  @Get(':id')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Get anchor tag by ID' })
  @ApiResponse({
    status: 200,
    description: 'Anchor tag retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Anchor tag or school not found',
  })
  findOne(@Param('id') id: string, @User() user: JWTUserPayload) {
    return this.anchorTagService.findAnchorTagById(id, user);
  }

  @Patch(':id')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update anchor tag by ID' })
  @ApiResponse({
    status: 200,
    description: 'Anchor tag updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data provided',
  })
  @ApiResponse({
    status: 404,
    description:
      'Not found - Anchor tag, school, or related entities not found',
  })
  update(
    @Param('id') id: string,
    @Body() updateAnchorTagDto: UpdateAnchorTagDto,
    @User() user: JWTUserPayload,
  ) {
    return this.anchorTagService.updateAnchorTag(id, updateAnchorTagDto, user);
  }

  @Delete(':id')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Delete anchor tag by ID' })
  @ApiResponse({
    status: 200,
    description: 'Anchor tag deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Anchor tag or school not found',
  })
  remove(@Param('id') id: string, @User() user: JWTUserPayload) {
    return this.anchorTagService.removeAnchorTag(id, user);
  }

  // Student endpoints for anchor tag interactions
  @Post(':id/start')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Start an anchor tag attempt' })
  @ApiResponse({
    status: 201,
    description: 'Anchor tag attempt started successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Anchor tag, school, or student not found',
  })
  startAttempt(@Param('id') id: string, @User() user: JWTUserPayload) {
    return this.studentAnchorTagAttemptService.startAnchorTagAttempt(id, user);
  }

  @Post(':id/submit')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Submit an answer for an anchor tag' })
  @ApiResponse({
    status: 200,
    description: 'Answer submitted successfully',
    schema: {
      type: 'object',
      properties: {
        attempt_id: { type: 'string', example: '689ca67309405aa1187a95c0' },
        score_percentage: { type: 'number', example: 100 },
        correct_answers: { type: 'number', example: 1 },
        total_questions: { type: 'number', example: 1 },
        is_passed: { type: 'boolean', example: true },
        time_taken_seconds: { type: 'number', example: 80 },
        status: { type: 'string', example: 'COMPLETED' },
        completed_at: { type: 'string', example: '2025-08-13T14:52:52.067Z' },
        ai_verification: { type: 'string', example: 'completed' },
        ai_verification_report: { type: 'object', nullable: true, example: null }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data or no in-progress attempt',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Anchor tag, school, student, or quiz not found',
  })
  submitAnswer(
    @Param('id') id: string,
    @Body() submitAnswerDto: SubmitAnchorTagAnswerDto,
    @User() user: JWTUserPayload,
  ) {
    return this.studentAnchorTagAttemptService.submitAnchorTagAnswer(
      id,
      submitAnswerDto,
      user,
    );
  }

  @Post(':id/skip')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Skip an anchor tag (only for optional tags)' })
  @ApiResponse({
    status: 200,
    description: 'Anchor tag skipped successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Cannot skip mandatory anchor tags',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Anchor tag, school, or student not found',
  })
  skipAnchorTag(@Param('id') id: string, @User() user: JWTUserPayload) {
    return this.studentAnchorTagAttemptService.skipAnchorTag(id, user);
  }

  // ========== STUDENT ANALYTICS ENDPOINTS ==========

  @Get('student/attempted-tags')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Get anchor tags that student has attempted',
    description: `
    Retrieve a list of anchor tags that the student has attempted, with summary statistics for each tag.
    
    **Access Control:**
    - **Students:** Can view their own attempted anchor tags
    - **Admins (School Admin/Professor):** Can view any student's attempted anchor tags by providing student_id
    
    **Features:**
    - List of anchor tags with attempt statistics
    - Average scores and success rates per tag
    - Best and worst scores per tag
    - Attempt dates and frequency
    - Module, chapter, and bibliography information
    - Quiz group and quiz details
    - Pagination support for large datasets
    
    **Use Case:** Students can use this to select a specific anchor tag to view detailed analytics.
    **Admin Use Case:** Admins can monitor student progress and performance across different anchor tags.
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
    description: 'Student attempted anchor tags retrieved successfully',
    schema: {
      example: {
        attempted_anchor_tags: [
          {
            _id: '507f1f77bcf86cd799439011',
            anchor_tag: {
              _id: '507f1f77bcf86cd799439011',
              title: 'Active Listening Assessment',
              description: 'Test understanding of active listening concepts',
              content_type: 'SLIDE',
              content_reference: 'slide-3',
              is_mandatory: true,
            },
            quiz_group: {
              _id: '507f1f77bcf86cd799439016',
              subject: 'Communication Skills',
              description: 'Assessment of communication fundamentals',
              difficulty: 'INTERMEDIATE',
              category: 'Psychology',
              type: 'ANCHOR_TAG',
              time_left: 10,
            },
            quiz: {
              _id: '507f1f77bcf86cd799439017',
              question:
                'Which of the following best describes active listening?',
              type: 'SINGLE_SELECT',
              options: [
                'Hearing what someone says',
                'Fully concentrating on what is being said',
                'Thinking about your response while they talk',
                'Interrupting to ask questions',
              ],
              answer: ['Fully concentrating on what is being said'],
              explanation:
                'Active listening involves full concentration and understanding.',
              tags: ['Communication', 'Listening'],
            },
            module: {
              _id: '507f1f77bcf86cd799439011',
              title: 'Communication Skills',
              subject: 'Psychology',
            },
            chapter: {
              _id: '507f1f77bcf86cd799439012',
              title: 'Active Listening',
            },
            bibliography: {
              _id: '507f1f77bcf86cd799439013',
              title: 'Communication Fundamentals',
              type: 'SLIDE',
            },
            total_attempts: 3,
            average_score: 85.5,
            success_rate: 66.7,
            best_score: 95,
            worst_score: 75,
            total_correct: 2,
            last_attempt_date: '2024-01-15T10:45:00Z',
            first_attempt_date: '2024-01-10T09:30:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 15,
          totalPages: 2,
          hasNextPage: true,
          hasPrevPage: false,
        },
        summary: {
          total_anchor_tags_attempted: 15,
          total_attempts: 25,
          average_success_rate: 78.5,
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
  getStudentAttemptedAnchorTags(
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

    return this.anchorTagAnalyticsService.getStudentAttemptedAnchorTags(
      user,
      validatedPage,
      validatedLimit,
      studentId,
    );
  }

  @Get('student/analytics')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Get detailed student anchor tag analytics',
    description: `
    Retrieve detailed analytics for student's anchor tag attempts with comprehensive statistics.
    
    **Access Control:**
    - **Students:** Can view their own analytics
    - **Admins (School Admin/Professor):** Can view any student's analytics by providing student_id
    
    **Features:**
    - Detailed attempt history with scores and timing
    - Question-by-question breakdown with AI verification results
    - Performance trends and patterns
    - Time analysis and efficiency metrics
    - Quiz group and quiz details
    - Filtering by module, chapter, bibliography, and date ranges
    
    **Use Case:** Students can analyze their learning patterns and identify areas for improvement.
    **Admin Use Case:** Admins can provide targeted feedback and support based on detailed analytics.
    `,
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
    name: 'bibliography_id',
    required: false,
    type: String,
    description: 'Filter by bibliography ID',
    example: '507f1f77bcf86cd799439013',
  })
  @ApiQuery({
    name: 'anchor_tag_id',
    required: false,
    type: String,
    description: 'Filter by specific anchor tag ID',
    example: '507f1f77bcf86cd799439014',
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
    description: 'Student anchor tag analytics retrieved successfully',
    schema: {
      example: {
        attempts: [
          {
            _id: '507f1f77bcf86cd799439011',
            anchor_tag: {
              _id: '507f1f77bcf86cd799439011',
              title: 'Active Listening Assessment',
              description: 'Test understanding of active listening concepts',
              content_type: 'SLIDE',
              content_reference: 'slide-3',
              is_mandatory: true,
            },
            quiz_group: {
              _id: '507f1f77bcf86cd799439016',
              subject: 'Communication Skills',
              description: 'Assessment of communication fundamentals',
              difficulty: 'INTERMEDIATE',
              category: 'Psychology',
              type: 'ANCHOR_TAG',
              time_left: 10,
            },
            quiz: {
              _id: '507f1f77bcf86cd799439017',
              question:
                'Which of the following best describes active listening?',
              type: 'SINGLE_SELECT',
              options: [
                'Hearing what someone says',
                'Fully concentrating on what is being said',
                'Thinking about your response while they talk',
                'Interrupting to ask questions',
              ],
              answer: ['Fully concentrating on what is being said'],
              explanation:
                'Active listening involves full concentration and understanding.',
              tags: ['Communication', 'Listening'],
            },
            module: {
              _id: '507f1f77bcf86cd799439011',
              title: 'Communication Skills',
              subject: 'Psychology',
            },
            chapter: {
              _id: '507f1f77bcf86cd799439012',
              title: 'Active Listening',
            },
            bibliography: {
              _id: '507f1f77bcf86cd799439013',
              title: 'Communication Fundamentals',
              type: 'SLIDE',
            },
            score_percentage: 85,
            is_correct: true,
            attempt_number: 1,
            started_at: '2024-01-15T10:30:00Z',
            completed_at: '2024-01-15T10:35:00Z',
            time_spent_seconds: 300,
            quiz_attempt: {
              quiz_id: '507f1f77bcf86cd799439015',
              selected_answers: ['Fully concentrating on what is being said'],
              time_spent_seconds: 300,
              is_correct: true,
              score_percentage: 85,
            },
            ai_verification_report: {
              score_percentage: 85,
              questions_results: [
                {
                  question:
                    'Which of the following best describes active listening?',
                  question_index: 1,
                  question_type: 'SINGLE_SELECT',
                  user_answer: 'Fully concentrating on what is being said',
                  correct_answer: 'Fully concentrating on what is being said',
                  is_correct: true,
                  score: 85,
                  explanation:
                    'Active listening involves full concentration and understanding.',
                  feedback:
                    'Excellent understanding of active listening concepts.',
                },
              ],
            },
          },
        ],
        summary: {
          total_attempts: 25,
          average_score: 82.5,
          success_rate: 76.0,
          total_correct: 19,
          total_incorrect: 6,
          average_time_taken: 245.5,
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
  getStudentAnchorTagAnalytics(
    @User() user: JWTUserPayload,
    @Query() filterDto: AnchorTagAnalyticsFilterDto,
    @Query('student_id') studentId?: string,
  ) {
    return this.anchorTagAnalyticsService.getStudentAnchorTagAnalytics(
      user,
      filterDto,
      studentId,
    );
  }

  @Get('student/analytics/export')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Export student anchor tag analytics data',
    description: `
    Export student anchor tag analytics in CSV or JSON format.
    
    **Access Control:**
    - **Students:** Can export their own analytics
    - **Admins (School Admin/Professor):** Can export any student's analytics by providing student_id
    
    **Supported Formats:**
    - CSV: Comma-separated values with attempt details
    - JSON: Structured data with full personal analytics
    
    **Export Content:**
    - Personal attempt history
    - Anchor tag and module information
    - Quiz group and quiz details
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
    name: 'bibliography_id',
    required: false,
    type: String,
    description: 'Filter export by specific bibliography ID',
    example: '507f1f77bcf86cd799439013',
  })
  @ApiQuery({
    name: 'anchor_tag_id',
    required: false,
    type: String,
    description: 'Filter export by specific anchor tag ID',
    example: '507f1f77bcf86cd799439014',
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
      'Student anchor tag analytics exported successfully - File download with appropriate headers',
    headers: {
      'Content-Type': {
        description: 'Content type of the exported file',
        example: 'text/csv',
      },
      'Content-Disposition': {
        description: 'File attachment header with filename',
        example:
          'attachment; filename="student-anchor-tag-analytics-2024-01-15.csv"',
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
  async exportStudentAnchorTagAnalytics(
    @User() user: JWTUserPayload,
    @Query('format', new ParseEnumPipe(ExportFormatEnum))
    format: ExportFormatEnum,
    @Query() filterDto: AnchorTagAnalyticsFilterDto,
    @Res() res: Response,
    @Query('student_id') studentId?: string,
  ) {
    const exportData =
      await this.anchorTagAnalyticsService.exportStudentAnchorTagAnalytics(
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

    return res.send(exportData.content);
  }

  @Get('student/attempts')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Get student anchor tag attempts' })
  @ApiResponse({
    status: 200,
    description: 'Student anchor tag attempts retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - School or student not found',
  })
  getStudentAttempts(
    @Query()
    filterDto: {
      anchor_tag_id?: string;
      bibliography_id?: string;
      module_id?: string;
      chapter_id?: string;
      status?: AnchorTagAttemptStatusEnum;
    },
    @User() user: JWTUserPayload,
  ) {
    return this.studentAnchorTagAttemptService.getStudentAnchorTagAttempts(
      user,
      filterDto,
    );
  }

  @Post('notifications/missed-tags/:bibliographyId')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Send notifications for missed mandatory anchor tags',
    description:
      'Sends notifications to all students who have not completed mandatory anchor tags for a specific bibliography',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications sent successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - School or bibliography not found',
  })
  sendMissedAnchorTagNotifications(
    @Param('bibliographyId') bibliographyId: string,
    @User() user: JWTUserPayload,
  ) {
    return this.anchorTagService.sendMissedAnchorTagNotifications(
      bibliographyId,
      user,
    );
  }
}
