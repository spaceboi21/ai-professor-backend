import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { SimulationGuard } from 'src/common/guards/simulation.guard';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { PaginationDto } from 'src/common/dto/pagination.dto';

// Services
import { InternshipService } from './internship.service';
import { InternshipCaseService } from './internship-case.service';
import { InternshipSessionService } from './internship-session.service';
import { InternshipFeedbackService } from './internship-feedback.service';
import { InternshipCaseAttemptsService } from './internship-case-attempts.service'; // NEW
import { InternshipLogbookService } from './internship-logbook.service';
import { InternshipStageTrackingService } from './internship-stage-tracking.service';
import { StageExportService } from './stage-export.service';

// DTOs
import { CreateInternshipDto } from './dto/create-internship.dto';
import { UpdateInternshipDto } from './dto/update-internship.dto';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { ToggleInternshipVisibilityDto } from './dto/toggle-internship-visibility.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ValidateFeedbackDto } from './dto/validate-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { AddLogbookEntryDto } from './dto/add-logbook-entry.dto';
import { InternshipFilterDto } from './dto/internship-filter.dto';
import { UpdateSequenceDto } from './dto/update-sequence.dto';
import {
  UpdateStageProgressDto,
  ValidateStageDto,
  UpdateThresholdsDto,
  DashboardFiltersDto,
  ExportStageProgressDto,
} from './dto/stage-tracking.dto';

@ApiTags('Internships')
@ApiBearerAuth()
@Controller('internship')
@UseGuards(JwtAuthGuard, RoleGuard, SimulationGuard)
export class InternshipController {
  constructor(
    private readonly internshipService: InternshipService,
    private readonly caseService: InternshipCaseService,
    private readonly sessionService: InternshipSessionService,
    private readonly feedbackService: InternshipFeedbackService,
    private readonly caseAttemptsService: InternshipCaseAttemptsService, // NEW
    private readonly logbookService: InternshipLogbookService,
    private readonly stageTrackingService: InternshipStageTrackingService,
    private readonly stageExportService: StageExportService,
  ) {}

  // ========== INTERNSHIP MANAGEMENT ENDPOINTS ==========

  @Post()
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Create a new internship' })
  @ApiBody({ type: CreateInternshipDto })
  @ApiResponse({ status: 201, description: 'Internship created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createInternship(
    @Body() createInternshipDto: CreateInternshipDto,
    @User() user: JWTUserPayload,
  ) {
    return this.internshipService.createInternship(createInternshipDto, user);
  }

  @Get()
  @Roles(
    RoleEnum.SUPER_ADMIN,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.PROFESSOR,
    RoleEnum.STUDENT,
  )
  @ApiOperation({ summary: 'Get all internships with filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'text', required: false, type: String })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'published', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Internships retrieved successfully' })
  async findAllInternships(
    @User() user: JWTUserPayload,
    @Query() paginationDto?: PaginationDto,
    @Query() filterDto?: InternshipFilterDto,
  ) {
    return this.internshipService.findAllInternships(user, paginationDto, filterDto);
  }

  @Get(':id')
  @Roles(
    RoleEnum.SUPER_ADMIN,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.PROFESSOR,
    RoleEnum.STUDENT,
  )
  @ApiOperation({ summary: 'Get a single internship by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Internship ID' })
  @ApiResponse({ status: 200, description: 'Internship retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Internship not found' })
  async findInternshipById(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.internshipService.findInternshipById(id, user);
  }

  @Patch(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Update an internship' })
  @ApiParam({ name: 'id', type: String, description: 'Internship ID' })
  @ApiBody({ type: UpdateInternshipDto })
  @ApiResponse({ status: 200, description: 'Internship updated successfully' })
  @ApiResponse({ status: 404, description: 'Internship not found' })
  async updateInternship(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateInternshipDto: UpdateInternshipDto,
    @User() user: JWTUserPayload,
  ) {
    return this.internshipService.updateInternship(id, updateInternshipDto, user);
  }

  @Delete(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Delete an internship' })
  @ApiParam({ name: 'id', type: String, description: 'Internship ID' })
  @ApiQuery({ name: 'school_id', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Internship deleted successfully' })
  @ApiResponse({ status: 404, description: 'Internship not found' })
  async removeInternship(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
    @Query('school_id') school_id?: string,
  ) {
    return this.internshipService.removeInternship(id, user, school_id);
  }

  @Post('toggle-visibility')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Publish or unpublish an internship' })
  @ApiBody({ type: ToggleInternshipVisibilityDto })
  @ApiResponse({ status: 200, description: 'Internship visibility toggled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async toggleInternshipVisibility(
    @Body() toggleDto: ToggleInternshipVisibilityDto,
    @User() user: JWTUserPayload,
  ) {
    return this.internshipService.toggleInternshipVisibility(toggleDto, user);
  }

  // ========== CASE MANAGEMENT ENDPOINTS ==========

  @Post(':internshipId/cases')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Create a case for an internship' })
  @ApiParam({ name: 'internshipId', type: String, description: 'Internship ID' })
  @ApiBody({ type: CreateCaseDto })
  @ApiResponse({ status: 201, description: 'Case created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createCase(
    @Param('internshipId') internshipId: string,
    @Body() createCaseDto: CreateCaseDto,
    @User() user: JWTUserPayload,
  ) {
    return this.caseService.createCase(internshipId, createCaseDto, user);
  }

  @Get(':internshipId/cases')
  @Roles(
    RoleEnum.SUPER_ADMIN,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.PROFESSOR,
    RoleEnum.STUDENT,
  )
  @ApiOperation({ summary: 'Get all cases for an internship' })
  @ApiParam({ name: 'internshipId', type: String, description: 'Internship ID' })
  @ApiResponse({ status: 200, description: 'Cases retrieved successfully' })
  async findCasesByInternship(
    @Param('internshipId') internshipId: string,
    @User() user: JWTUserPayload,
  ) {
    return this.caseService.findCasesByInternship(internshipId, user);
  }

  @Get('cases/:caseId')
  @Roles(
    RoleEnum.SUPER_ADMIN,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.PROFESSOR,
    RoleEnum.STUDENT,
  )
  @ApiOperation({ summary: 'Get a single case by ID' })
  @ApiParam({ name: 'caseId', type: String, description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Case retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  async findCaseById(
    @Param('caseId') caseId: string,
    @User() user: JWTUserPayload,
  ) {
    return this.caseService.findCaseById(caseId, user);
  }

  @Patch('cases/:caseId')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Update a case' })
  @ApiParam({ name: 'caseId', type: String, description: 'Case ID' })
  @ApiBody({ type: UpdateCaseDto })
  @ApiResponse({ status: 200, description: 'Case updated successfully' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  async updateCase(
    @Param('caseId') caseId: string,
    @Body() updateCaseDto: UpdateCaseDto,
    @User() user: JWTUserPayload,
  ) {
    return this.caseService.updateCase(caseId, updateCaseDto, user);
  }

  @Delete('cases/:caseId')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Delete a case' })
  @ApiParam({ name: 'caseId', type: String, description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Case deleted successfully' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  async removeCase(
    @Param('caseId') caseId: string,
    @User() user: JWTUserPayload,
  ) {
    return this.caseService.removeCase(caseId, user);
  }

  @Patch('cases/:caseId/sequence')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Update case sequence' })
  @ApiParam({ name: 'caseId', type: String, description: 'Case ID' })
  @ApiBody({ type: UpdateSequenceDto })
  @ApiResponse({ status: 200, description: 'Case sequence updated successfully' })
  async updateCaseSequence(
    @Param('caseId') caseId: string,
    @Body() updateSequenceDto: UpdateSequenceDto,
    @User() user: JWTUserPayload,
  ) {
    return this.caseService.updateCaseSequence(
      caseId,
      updateSequenceDto.sequence,
      user,
    );
  }

  // ========== SESSION MANAGEMENT ENDPOINTS ==========

  @Post('sessions')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a new session (patient interview or therapist consultation)' })
  @ApiBody({ type: CreateSessionDto })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createSession(
    @Body() createSessionDto: CreateSessionDto,
    @User() user: JWTUserPayload,
  ) {
    return this.sessionService.createSession(createSessionDto, user);
  }

  @Post('sessions/:sessionId/message')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Send a message in a session' })
  @ApiParam({ name: 'sessionId', type: String, description: 'Session ID' })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({ status: 200, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() sendMessageDto: SendMessageDto,
    @User() user: JWTUserPayload,
  ) {
    return this.sessionService.sendMessage(sessionId, sendMessageDto, user);
  }

  @Get('sessions/:sessionId')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get session details' })
  @ApiParam({ name: 'sessionId', type: String, description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSessionDetails(
    @Param('sessionId') sessionId: string,
    @User() user: JWTUserPayload,
  ) {
    return this.sessionService.getSessionDetails(sessionId, user);
  }

  @Post('sessions/:sessionId/complete')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Complete a session' })
  @ApiParam({ name: 'sessionId', type: String, description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session completed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async completeSession(
    @Param('sessionId') sessionId: string,
    @User() user: JWTUserPayload,
  ) {
    return this.sessionService.completeSession(sessionId, user);
  }

  @Post('sessions/:sessionId/pause')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Pause an active session' })
  @ApiParam({ name: 'sessionId', type: String, description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session paused successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async pauseSession(
    @Param('sessionId') sessionId: string,
    @User() user: JWTUserPayload,
  ) {
    return this.sessionService.pauseSession(sessionId, user);
  }

  @Post('sessions/:sessionId/resume')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Resume a paused session' })
  @ApiParam({ name: 'sessionId', type: String, description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session resumed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async resumeSession(
    @Param('sessionId') sessionId: string,
    @User() user: JWTUserPayload,
  ) {
    return this.sessionService.resumeSession(sessionId, user);
  }

  @Get('sessions/:sessionId/timer')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get session timer information' })
  @ApiParam({ name: 'sessionId', type: String, description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session timer retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSessionTimer(
    @Param('sessionId') sessionId: string,
    @User() user: JWTUserPayload,
  ) {
    return this.sessionService.getSessionTimer(sessionId, user);
  }

  @Get('cases/:caseId/sessions/history')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get session history for a case' })
  @ApiParam({ name: 'caseId', type: String, description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Session history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  async getSessionHistory(
    @Param('caseId') caseId: string,
    @User() user: JWTUserPayload,
  ) {
    return this.sessionService.getSessionHistory(caseId, user);
  }

  @Get('cases/:caseId/sessions/active')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Check if there is an active/paused session for a case' })
  @ApiParam({ name: 'caseId', type: String, description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Active session check completed' })
  async getActiveSession(
    @Param('caseId') caseId: string,
    @User() user: JWTUserPayload,
  ) {
    return this.sessionService.getActiveSession(caseId, user);
  }

  // ========== CROSS-SESSION MEMORY ENDPOINTS ==========

  @Get(':internshipId/memory')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ 
    summary: 'Get cross-session memory for an internship',
    description: 'Retrieves the complete memory context including previous sessions, techniques learned, patient memory (safe place, trauma targets, etc.), and student progress tracking. This enables continuity across therapy sessions.'
  })
  @ApiParam({ name: 'internshipId', type: String, description: 'Internship ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Memory retrieved successfully',
    schema: {
      example: {
        found: true,
        memory: {
          total_sessions: 3,
          current_session_number: 3,
          patient_memory: {
            techniques_learned: ['safe_place', 'container', 'bilateral_stimulation'],
            safe_place_details: 'A quiet beach with warm sand and gentle waves',
            trauma_targets: [],
            current_sud_baseline: 6,
            bilateral_stimulation_preferences: 'visual'
          },
          student_progress: {
            skills_demonstrated: {
              empathy: 5,
              active_listening: 8,
              trauma_processing: 3
            },
            areas_of_strength: ['rapport_building', 'safe_place_installation'],
            areas_for_improvement: ['pacing', 'trauma_target_identification']
          }
        }
      }
    }
  })
  async getInternshipMemory(
    @Param('internshipId') internshipId: string,
    @User() user: JWTUserPayload,
  ) {
    return this.sessionService.getInternshipMemory(internshipId, user);
  }

  // ========== FEEDBACK MANAGEMENT ENDPOINTS ==========

  @Post('sessions/:sessionId/feedback')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Generate AI feedback for a completed session' })
  @ApiParam({ name: 'sessionId', type: String, description: 'Session ID' })
  @ApiResponse({ status: 201, description: 'Feedback generated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async generateFeedback(
    @Param('sessionId') sessionId: string,
    @User() user: JWTUserPayload,
  ) {
    return this.feedbackService.generateFeedback(sessionId, user);
  }

  @Get('feedback/pending')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Get all pending feedback for validation' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Pending feedback retrieved successfully' })
  async getPendingFeedback(
    @User() user: JWTUserPayload,
    @Query() paginationDto?: PaginationDto,
  ) {
    return this.feedbackService.getPendingFeedback(user, paginationDto);
  }

  @Post('feedback/:feedbackId/validate')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Validate AI-generated feedback' })
  @ApiParam({ name: 'feedbackId', type: String, description: 'Feedback ID' })
  @ApiBody({ type: ValidateFeedbackDto })
  @ApiResponse({ status: 200, description: 'Feedback validated successfully' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  async validateFeedback(
    @Param('feedbackId') feedbackId: string,
    @Body() validateDto: ValidateFeedbackDto,
    @User() user: JWTUserPayload,
  ) {
    return this.feedbackService.validateFeedback(feedbackId, validateDto, user);
  }

  @Patch('feedback/:feedbackId')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Update feedback' })
  @ApiParam({ name: 'feedbackId', type: String, description: 'Feedback ID' })
  @ApiBody({ type: UpdateFeedbackDto })
  @ApiResponse({ status: 200, description: 'Feedback updated successfully' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  async updateFeedback(
    @Param('feedbackId') feedbackId: string,
    @Body() updateDto: UpdateFeedbackDto,
    @User() user: JWTUserPayload,
  ) {
    return this.feedbackService.updateFeedback(feedbackId, updateDto, user);
  }

  @Get('feedback/:feedbackId')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get feedback by ID' })
  @ApiParam({ name: 'feedbackId', type: String, description: 'Feedback ID' })
  @ApiResponse({ status: 200, description: 'Feedback retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  async getFeedbackById(
    @Param('feedbackId') feedbackId: string,
    @User() user: JWTUserPayload,
  ) {
    return this.feedbackService.getFeedbackById(feedbackId, user);
  }

  @Get('sessions/:sessionId/feedback')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get feedback for a session (student view)' })
  @ApiParam({ name: 'sessionId', type: String, description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Feedback retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Feedback not found. Generate it first.' })
  async getFeedbackBySession(
    @Param('sessionId') sessionId: string,
    @User() user: JWTUserPayload,
  ) {
    return this.feedbackService.getFeedbackBySession(sessionId, user);
  }

  @Get('cases/:caseId/feedback')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get feedback for a case (student view)' })
  @ApiParam({ name: 'caseId', type: String, description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Feedback retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Feedback not found. Generate it first.' })
  async getFeedbackByCase(
    @Param('caseId') caseId: string,
    @User() user: JWTUserPayload,
  ) {
    return this.feedbackService.getFeedbackByCase(caseId, user);
  }

  // ========== ATTEMPT TRACKING ENDPOINTS (NEW) ==========

  @Get('cases/:caseId/attempts')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ 
    summary: 'Get attempt history for a case',
    description: 'Retrieves all attempts made by a student on a specific case, including scores, grades, pass/fail status, and learning outcomes. Supports unlimited retries tracking.'
  })
  @ApiParam({ name: 'caseId', type: String, description: 'Case ID' })
  @ApiQuery({ name: 'student_id', required: false, type: String, description: 'Student ID (optional for professors/admins, auto-detected for students)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Attempt history retrieved successfully',
    schema: {
      example: {
        total_attempts: 3,
        best_score: 85,
        average_score: 78,
        current_status: 'passed',
        attempts: [
          {
            attempt_number: 1,
            assessment_score: 70,
            grade: 'C',
            pass_fail: 'PASS',
            key_learnings: ['Good empathy', 'Protocol adherence'],
            mistakes_made: ['Interrupted patient', 'Missed SUD assessment'],
            completed_at: '2026-02-07T10:00:00Z'
          }
        ]
      }
    }
  })
  async getCaseAttempts(
    @Param('caseId') caseId: string,
    @Query('student_id') studentId: string | undefined,
    @User() user: JWTUserPayload,
  ) {
    const school = await this.internshipService['schoolModel'].findById(user.school_id);
    if (!school) {
      throw new Error('School not found');
    }

    // If student, use their ID. If professor/admin, require student_id query param
    const targetStudentId = user.role.name === RoleEnum.STUDENT 
      ? user.id 
      : studentId;

    if (!targetStudentId) {
      throw new Error('student_id query parameter required for professors/admins');
    }

    return this.caseAttemptsService.getAttemptHistory(
      school.db_name,
      new Types.ObjectId(targetStudentId),
      new Types.ObjectId(caseId),
    );
  }

  @Get('student/:studentId/attempts')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ 
    summary: 'Get all attempts for a student across all cases',
    description: 'Retrieves comprehensive attempt statistics for a student including overall averages, case-by-case breakdown, and progression metrics.'
  })
  @ApiParam({ name: 'studentId', type: String, description: 'Student ID' })
  @ApiQuery({ name: 'internship_id', required: true, type: String, description: 'Internship ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Student attempts retrieved successfully',
    schema: {
      example: {
        student_id: '507f1f77bcf86cd799439011',
        internship_id: '507f1f77bcf86cd799439012',
        overall_stats: {
          total_cases_attempted: 5,
          cases_passed: 4,
          cases_in_progress: 1,
          overall_average_score: 82,
          total_attempts: 8
        },
        cases: [
          {
            case_id: '507f1f77bcf86cd799439013',
            case_title: 'Mathilde Perez',
            total_attempts: 2,
            best_score: 85,
            current_status: 'passed'
          }
        ]
      }
    }
  })
  async getStudentAttempts(
    @Param('studentId') studentId: string,
    @Query('internship_id') internshipId: string,
    @User() user: JWTUserPayload,
  ) {
    // Students can only view their own attempts
    if (user.role.name === RoleEnum.STUDENT && studentId !== user.id) {
      throw new Error('Students can only view their own attempts');
    }

    const school = await this.internshipService['schoolModel'].findById(user.school_id);
    if (!school) {
      throw new Error('School not found');
    }

    return this.caseAttemptsService.getStudentAllAttempts(
      school.db_name,
      new Types.ObjectId(studentId),
      new Types.ObjectId(internshipId),
    );
  }

  @Get('patient-progression/:patientBaseId/:studentId')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ 
    summary: 'Get patient progression across cases (Steps 2-3)',
    description: 'Retrieves the evolution of the same patient across multiple cases, showing SUD/VOC progression, techniques mastered, trauma targets resolved, and session-by-session improvements. Only applicable for Step 2 (progressive) and Step 3 (realistic) cases.'
  })
  @ApiParam({ name: 'patientBaseId', type: String, description: 'Patient Base ID (e.g., "brigitte_fenurel")' })
  @ApiParam({ name: 'studentId', type: String, description: 'Student ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Patient progression retrieved successfully',
    schema: {
      example: {
        found: true,
        patient_base_id: 'brigitte_fenurel',
        progression_history: [
          {
            case_id: '507f1f77bcf86cd799439014',
            case_title: 'Brigitte Fenurel - Phase 1-2',
            step: 2,
            sequence_in_step: 1,
            emdr_phase_focus: 'Phase 1-2',
            attempts: [
              {
                attempt_number: 1,
                assessment_score: 80,
                pass_fail: 'PASS',
                completed_at: '2026-02-05T10:00:00Z'
              }
            ],
            best_score: 80,
            current_status: 'passed'
          },
          {
            case_id: '507f1f77bcf86cd799439015',
            case_title: 'Brigitte Fenurel - Phase 3-4',
            step: 2,
            sequence_in_step: 2,
            emdr_phase_focus: 'Phase 3-4',
            attempts: [
              {
                attempt_number: 1,
                assessment_score: 85,
                pass_fail: 'PASS',
                completed_at: '2026-02-06T10:00:00Z'
              }
            ],
            best_score: 85,
            current_status: 'passed'
          }
        ]
      }
    }
  })
  async getPatientProgression(
    @Param('patientBaseId') patientBaseId: string,
    @Param('studentId') studentId: string,
    @User() user: JWTUserPayload,
  ) {
    // Students can only view their own progression
    if (user.role.name === RoleEnum.STUDENT && studentId !== user.id) {
      throw new Error('Students can only view their own progression');
    }

    const school = await this.internshipService['schoolModel'].findById(user.school_id);
    if (!school) {
      throw new Error('School not found');
    }

    return this.caseAttemptsService.getPatientProgression(
      school.db_name,
      new Types.ObjectId(studentId),
      patientBaseId,
    );
  }

  // ========== LOGBOOK ENDPOINTS ==========

  @Get(':internshipId/logbook')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Get student's logbook for an internship" })
  @ApiParam({ name: 'internshipId', type: String, description: 'Internship ID' })
  @ApiResponse({ status: 200, description: 'Logbook retrieved successfully' })
  async getLogbook(
    @Param('internshipId') internshipId: string,
    @User() user: JWTUserPayload,
  ) {
    return this.logbookService.getLogbook(internshipId, user);
  }

  @Post(':internshipId/logbook')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Add an entry to the logbook' })
  @ApiParam({ name: 'internshipId', type: String, description: 'Internship ID' })
  @ApiBody({ type: AddLogbookEntryDto })
  @ApiResponse({ status: 201, description: 'Logbook entry added successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async addLogbookEntry(
    @Param('internshipId') internshipId: string,
    @Body() addEntryDto: AddLogbookEntryDto,
    @User() user: JWTUserPayload,
  ) {
    return this.logbookService.addLogbookEntry(internshipId, addEntryDto, user);
  }

  @Patch(':internshipId/logbook/summary')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Update overall progress summary in logbook' })
  @ApiParam({ name: 'internshipId', type: String, description: 'Internship ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', example: 'Overall, I improved significantly in...' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Progress summary updated successfully' })
  async updateProgressSummary(
    @Param('internshipId') internshipId: string,
    @Body('summary') summary: string,
    @User() user: JWTUserPayload,
  ) {
    return this.logbookService.updateProgressSummary(internshipId, summary, user);
  }

  // ========== STAGE TRACKING ENDPOINTS ==========

  @Get('stage-tracking/:internshipId/dashboard')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ 
    summary: 'Get stage tracking dashboard for all students',
    description: 'Get overview of all students progress through 3 stages with statistics'
  })
  @ApiParam({ name: 'internshipId', type: String, description: 'Internship ID' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getStageDashboard(
    @Param('internshipId') internshipId: string,
    @Query() filters: DashboardFiltersDto,
    @User() user: JWTUserPayload,
  ) {
    return this.stageTrackingService.getDashboardData(internshipId, filters, user);
  }

  @Get('stage-tracking/:internshipId/student/:studentId')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR, RoleEnum.STUDENT)
  @ApiOperation({ 
    summary: 'Get detailed student view with timeline',
    description: 'Get detailed view of student progress with session timeline, SUD/VoC evolution, and metrics'
  })
  @ApiParam({ name: 'internshipId', type: String, description: 'Internship ID' })
  @ApiParam({ name: 'studentId', type: String, description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Student detailed view retrieved successfully' })
  async getStudentDetailedView(
    @Param('internshipId') internshipId: string,
    @Param('studentId') studentId: string,
    @User() user: JWTUserPayload,
  ) {
    return this.stageTrackingService.getStudentDetailedView(
      studentId,
      internshipId,
      user,
    );
  }

  @Get('stage-tracking/:internshipId/student/:studentId/progress')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR, RoleEnum.STUDENT)
  @ApiOperation({ 
    summary: 'Get or create stage progress for a student',
    description: 'Get the current stage progress for a student (creates if doesn\'t exist)'
  })
  @ApiParam({ name: 'internshipId', type: String, description: 'Internship ID' })
  @ApiParam({ name: 'studentId', type: String, description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Stage progress retrieved successfully' })
  async getStageProgress(
    @Param('internshipId') internshipId: string,
    @Param('studentId') studentId: string,
    @User() user: JWTUserPayload,
  ) {
    return this.stageTrackingService.getOrCreateStageProgress(
      studentId,
      internshipId,
      user,
    );
  }

  @Patch('stage-tracking/:internshipId/student/:studentId/progress')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ 
    summary: 'Update stage progress manually',
    description: 'Manually update stage progress (status, score, metrics) for a student'
  })
  @ApiParam({ name: 'internshipId', type: String, description: 'Internship ID' })
  @ApiParam({ name: 'studentId', type: String, description: 'Student ID' })
  @ApiBody({ type: UpdateStageProgressDto })
  @ApiResponse({ status: 200, description: 'Stage progress updated successfully' })
  async updateStageProgress(
    @Param('internshipId') internshipId: string,
    @Param('studentId') studentId: string,
    @Body() updateDto: UpdateStageProgressDto,
    @User() user: JWTUserPayload,
  ) {
    return this.stageTrackingService.updateStageProgress(
      studentId,
      internshipId,
      updateDto,
      user,
    );
  }

  @Post('stage-tracking/:internshipId/student/:studentId/validate')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ 
    summary: 'Validate a stage for a student',
    description: 'Professor validates or marks a stage as needs revision'
  })
  @ApiParam({ name: 'internshipId', type: String, description: 'Internship ID' })
  @ApiParam({ name: 'studentId', type: String, description: 'Student ID' })
  @ApiBody({ type: ValidateStageDto })
  @ApiResponse({ status: 200, description: 'Stage validated successfully' })
  async validateStage(
    @Param('internshipId') internshipId: string,
    @Param('studentId') studentId: string,
    @Body() validateDto: ValidateStageDto,
    @User() user: JWTUserPayload,
  ) {
    return this.stageTrackingService.validateStage(
      studentId,
      internshipId,
      validateDto,
      user,
    );
  }

  @Patch('stage-tracking/:internshipId/student/:studentId/thresholds')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ 
    summary: 'Update thresholds for a student',
    description: 'Configure minimum score, minimum sessions, and validation requirements'
  })
  @ApiParam({ name: 'internshipId', type: String, description: 'Internship ID' })
  @ApiParam({ name: 'studentId', type: String, description: 'Student ID' })
  @ApiBody({ type: UpdateThresholdsDto })
  @ApiResponse({ status: 200, description: 'Thresholds updated successfully' })
  async updateThresholds(
    @Param('internshipId') internshipId: string,
    @Param('studentId') studentId: string,
    @Body() thresholdsDto: UpdateThresholdsDto,
    @User() user: JWTUserPayload,
  ) {
    return this.stageTrackingService.updateThresholds(
      studentId,
      internshipId,
      thresholdsDto,
      user,
    );
  }

  @Post('stage-tracking/:internshipId/export')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ 
    summary: 'Export stage progress data',
    description: 'Export stage progress to CSV or PDF format'
  })
  @ApiParam({ name: 'internshipId', type: String, description: 'Internship ID' })
  @ApiBody({ type: ExportStageProgressDto })
  @ApiResponse({ status: 200, description: 'Export generated successfully' })
  async exportStageProgress(
    @Param('internshipId') internshipId: string,
    @Body() exportDto: ExportStageProgressDto,
    @User() user: JWTUserPayload,
  ) {
    return this.stageExportService.exportStageProgress(
      internshipId,
      exportDto,
      user,
    );
  }
}

