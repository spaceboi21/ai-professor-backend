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
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { PaginationDto } from 'src/common/dto/pagination.dto';

// Services
import { InternshipService } from './internship.service';
import { InternshipCaseService } from './internship-case.service';
import { InternshipSessionService } from './internship-session.service';
import { InternshipFeedbackService } from './internship-feedback.service';
import { InternshipLogbookService } from './internship-logbook.service';

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

@ApiTags('Internships')
@ApiBearerAuth()
@Controller('internship')
@UseGuards(JwtAuthGuard, RoleGuard)
export class InternshipController {
  constructor(
    private readonly internshipService: InternshipService,
    private readonly caseService: InternshipCaseService,
    private readonly sessionService: InternshipSessionService,
    private readonly feedbackService: InternshipFeedbackService,
    private readonly logbookService: InternshipLogbookService,
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
}

