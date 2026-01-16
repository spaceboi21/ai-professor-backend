import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { SimulationSession, SimulationModeEnum, SimulationStatusEnum } from 'src/database/schemas/central/simulation-session.schema';
import { School } from 'src/database/schemas/central/school.schema';
import { Student, StudentSchema } from 'src/database/schemas/tenant/student.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { RoleEnum, ROLE_IDS } from 'src/common/constants/roles.constant';
import { StatusEnum } from 'src/common/constants/status.constant';
import { DEFAULT_LANGUAGE, LanguageEnum } from 'src/common/constants/language.constant';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { EmailEncryptionService } from 'src/common/services/email-encryption.service';
import { TokenUtil } from 'src/common/utils/token.util';
import { ActivityLogService, CreateActivityLogDto } from 'src/modules/activity-log/activity-log.service';
import { ActivityTypeEnum } from 'src/common/constants/activity.constant';
import { getActivityDescription } from 'src/common/constants/activity-descriptions.constant';

import { StartSimulationDto } from './dto/start-simulation.dto';
import {
  SimulationTokenResponseDto,
  EndSimulationResponseDto,
  AvailableStudentsListDto,
  SimulationHistoryDto,
} from './dto/simulation-response.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);

  constructor(
    @InjectModel(SimulationSession.name)
    private readonly simulationSessionModel: Model<SimulationSession>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly tokenUtil: TokenUtil,
    private readonly errorMessageService: ErrorMessageService,
    private readonly emailEncryptionService: EmailEncryptionService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /**
   * Start a simulation session - allows teacher/admin to view as student
   */
  async startSimulation(
    startSimulationDto: StartSimulationDto,
    user: JWTUserPayload,
    req: any,
  ): Promise<SimulationTokenResponseDto> {
    this.logger.log(`Starting simulation for user: ${user.email}`);

    // Validate user has permission to start simulation
    if (
      user.role.name !== RoleEnum.SCHOOL_ADMIN &&
      user.role.name !== RoleEnum.PROFESSOR &&
      user.role.name !== RoleEnum.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        this.errorMessageService.getMessageWithLanguage(
          'SIMULATION',
          'UNAUTHORIZED_ROLE',
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Check if user is already in simulation mode
    if (user.is_simulation) {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'SIMULATION',
          'ALREADY_IN_SIMULATION',
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Check for active simulation session and auto-end any stuck sessions
    const activeSession = await this.simulationSessionModel.findOne({
      original_user_id: new Types.ObjectId(user.id.toString()),
      status: SimulationStatusEnum.ACTIVE,
    });

    if (activeSession) {
      // Auto-end the stuck session instead of throwing an error
      this.logger.warn(`Auto-ending stuck simulation session: ${activeSession._id} for user: ${user.email}`);
      const endedAt = new Date();
      const durationSeconds = Math.floor((endedAt.getTime() - activeSession.started_at.getTime()) / 1000);
      activeSession.status = SimulationStatusEnum.ENDED;
      activeSession.ended_at = endedAt;
      activeSession.duration_seconds = durationSeconds;
      await activeSession.save();
      this.logger.log(`Stuck session ${activeSession._id} auto-ended after ${durationSeconds}s`);
    }

    // Determine school_id
    let schoolId: string;
    if (user.role.name === RoleEnum.SUPER_ADMIN) {
      if (!startSimulationDto.school_id) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'SIMULATION',
            'SCHOOL_ID_REQUIRED',
            user.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
      schoolId = startSimulationDto.school_id;
    } else {
      schoolId = user.school_id?.toString() || '';
    }

    if (!schoolId) {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'SIMULATION',
          'SCHOOL_NOT_FOUND',
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get school details
    const school = await this.schoolModel.findById(schoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection and find student
    const tenantConnection = await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);

    const student = await StudentModel.findOne({
      _id: new Types.ObjectId(startSimulationDto.student_id),
      deleted_at: null,
    });

    if (!student) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'NOT_FOUND',
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Check student status
    if (student.status === StatusEnum.INACTIVE) {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'ACCOUNT_DEACTIVATED',
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Decrypt student email for display
    const decryptedStudentEmail = this.emailEncryptionService.decryptEmail(student.email);

    // Create simulation session
    const simulationSession = await this.simulationSessionModel.create({
      original_user_id: new Types.ObjectId(user.id.toString()),
      original_user_role: user.role.name,
      original_user_email: user.email,
      simulated_student_id: student._id,
      simulated_student_email: decryptedStudentEmail,
      simulated_student_name: `${student.first_name} ${student.last_name || ''}`.trim(),
      school_id: new Types.ObjectId(schoolId),
      school_name: school.name,
      simulation_mode: startSimulationDto.simulation_mode,
      status: SimulationStatusEnum.ACTIVE,
      started_at: new Date(),
      purpose: startSimulationDto.purpose,
      ip_address: req?.ip || 'unknown',
      user_agent: req?.headers?.['user-agent'] || 'unknown',
      pages_visited: [],
      ai_chats_opened: 0,
      quizzes_viewed: 0,
      modules_viewed: 0,
    });

    this.logger.log(`Simulation session created: ${simulationSession._id}`);

    // Log simulation started activity
    const simulationDescription = getActivityDescription(ActivityTypeEnum.SIMULATION_STARTED, true);
    await this.activityLogService.createActivityLog({
      activity_type: ActivityTypeEnum.SIMULATION_STARTED,
      description: {
        en: simulationDescription[LanguageEnum.ENGLISH],
        fr: simulationDescription[LanguageEnum.FRENCH],
      },
      performed_by: new Types.ObjectId(user.id.toString()),
      performed_by_role: user.role.name,
      school_id: new Types.ObjectId(schoolId),
      school_name: school.name,
      target_user_id: student._id,
      target_user_email: decryptedStudentEmail,
      target_user_role: RoleEnum.STUDENT,
      metadata: {
        simulation_session_id: simulationSession._id.toString(),
        simulation_mode: startSimulationDto.simulation_mode,
        simulated_student_name: simulationSession.simulated_student_name,
      },
      ip_address: req?.ip || 'unknown',
      user_agent: req?.headers?.['user-agent'] || 'unknown',
      is_success: true,
      status: 'SUCCESS',
    });

    // Generate simulation tokens with special flags
    const simulationTokenPayload = {
      id: student._id.toString(),
      email: decryptedStudentEmail,
      role_id: ROLE_IDS.STUDENT,
      role_name: RoleEnum.STUDENT,
      school_id: schoolId,
      // Simulation flags
      is_simulation: true,
      simulation_session_id: simulationSession._id.toString(),
      original_user_id: user.id.toString(),
      original_user_role: user.role.name,
    };

    const accessTokenExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRY') || '1h';
    const refreshTokenExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRY') || '4h';

    const accessToken = this.jwtService.sign(
      { ...simulationTokenPayload, token_type: 'access' },
      { expiresIn: accessTokenExpiresIn },
    );

    const refreshToken = this.jwtService.sign(
      { ...simulationTokenPayload, token_type: 'refresh' },
      { expiresIn: refreshTokenExpiresIn },
    );

    // Calculate expires_in in seconds
    const accessExpiresInSeconds = this.parseExpiryToSeconds(accessTokenExpiresIn);

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'SIMULATION',
        'STARTED_SUCCESSFULLY',
        user.preferred_language || DEFAULT_LANGUAGE,
      ),
      access_token: accessToken,
      refresh_token: refreshToken,
      access_token_expires_in: accessExpiresInSeconds,
      simulation_session_id: simulationSession._id.toString(),
      simulation_mode: startSimulationDto.simulation_mode,
      simulated_student: {
        id: student._id.toString(),
        email: decryptedStudentEmail,
        first_name: student.first_name,
        last_name: student.last_name,
        student_code: student.student_code,
        profile_pic: student.profile_pic,
        year: student.year,
      },
      school: {
        id: school._id.toString(),
        name: school.name,
        logo: school.logo,
      },
    };
  }

  /**
   * End a simulation session and return to original role
   * Supports both: simulation token (is_simulation=true) OR original token (fallback)
   */
  async endSimulation(user: JWTUserPayload): Promise<EndSimulationResponseDto> {
    this.logger.log(`Ending simulation for user: ${user.email}, is_simulation: ${user.is_simulation}`);

    let simulationSession;

    // Case 1: User is in simulation mode (has simulation token)
    if (user.is_simulation && user.simulation_session_id) {
      this.logger.log(`User is in simulation mode, session ID: ${user.simulation_session_id}`);
      simulationSession = await this.simulationSessionModel.findById(user.simulation_session_id);
    } 
    // Case 2: User is using original token (fallback) - find their active simulation session
    else {
      this.logger.log(`User is using original token, finding active simulation session for user: ${user.id}`);
      simulationSession = await this.simulationSessionModel.findOne({
        original_user_id: new Types.ObjectId(user.id.toString()),
        status: SimulationStatusEnum.ACTIVE,
      }).sort({ started_at: -1 }); // Get the most recent active session
    }

    // No simulation session found
    if (!simulationSession) {
      this.logger.warn(`No active simulation session found for user: ${user.id}`);
      // Return a success response anyway (idempotent) - the frontend might be out of sync
      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'SIMULATION',
          'ENDED_SUCCESSFULLY',
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
        access_token: '', // Frontend should use its current token
        refresh_token: '',
        session_summary: null,
      };
    }

    if (simulationSession.status === SimulationStatusEnum.ENDED) {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'SIMULATION',
          'SESSION_ALREADY_ENDED',
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Calculate duration
    const endedAt = new Date();
    const durationSeconds = Math.floor((endedAt.getTime() - simulationSession.started_at.getTime()) / 1000);

    // Update session
    simulationSession.status = SimulationStatusEnum.ENDED;
    simulationSession.ended_at = endedAt;
    simulationSession.duration_seconds = durationSeconds;
    await simulationSession.save();

    this.logger.log(`Simulation session ended: ${simulationSession._id}, duration: ${durationSeconds}s`);

    // Log simulation ended activity
    const simulationEndedDescription = getActivityDescription(ActivityTypeEnum.SIMULATION_ENDED, true);
    await this.activityLogService.createActivityLog({
      activity_type: ActivityTypeEnum.SIMULATION_ENDED,
      description: {
        en: simulationEndedDescription[LanguageEnum.ENGLISH],
        fr: simulationEndedDescription[LanguageEnum.FRENCH],
      },
      performed_by: simulationSession.original_user_id,
      performed_by_role: simulationSession.original_user_role,
      school_id: simulationSession.school_id,
      school_name: simulationSession.school_name,
      target_user_id: simulationSession.simulated_student_id,
      target_user_email: simulationSession.simulated_student_email,
      target_user_role: RoleEnum.STUDENT,
      metadata: {
        simulation_session_id: simulationSession._id.toString(),
        simulation_mode: simulationSession.simulation_mode,
        duration_seconds: durationSeconds,
        modules_viewed: simulationSession.modules_viewed,
        quizzes_viewed: simulationSession.quizzes_viewed,
        ai_chats_opened: simulationSession.ai_chats_opened,
        pages_visited: simulationSession.pages_visited,
      },
      is_success: true,
      status: 'SUCCESS',
    });

    // Generate new tokens for the original user
    const originalTokenPayload = {
      id: simulationSession.original_user_id.toString(),
      email: simulationSession.original_user_email,
      role_id: this.getRoleIdFromName(simulationSession.original_user_role),
      role_name: simulationSession.original_user_role,
      school_id: simulationSession.school_id.toString(),
    };

    const tokenPair = this.tokenUtil.generateTokenPair(originalTokenPayload);

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'SIMULATION',
        'ENDED_SUCCESSFULLY',
        user.preferred_language || DEFAULT_LANGUAGE,
      ),
      access_token: tokenPair.access_token,
      refresh_token: tokenPair.refresh_token,
      session_summary: {
        _id: simulationSession._id.toString(),
        original_user_id: simulationSession.original_user_id.toString(),
        original_user_role: simulationSession.original_user_role,
        original_user_email: simulationSession.original_user_email,
        simulated_student_id: simulationSession.simulated_student_id.toString(),
        simulated_student_email: simulationSession.simulated_student_email,
        simulated_student_name: simulationSession.simulated_student_name,
        school_id: simulationSession.school_id.toString(),
        school_name: simulationSession.school_name,
        simulation_mode: simulationSession.simulation_mode,
        status: simulationSession.status,
        started_at: simulationSession.started_at,
        ended_at: simulationSession.ended_at,
        duration_seconds: simulationSession.duration_seconds,
        modules_viewed: simulationSession.modules_viewed,
        quizzes_viewed: simulationSession.quizzes_viewed,
        ai_chats_opened: simulationSession.ai_chats_opened,
        pages_visited: simulationSession.pages_visited,
      },
    };
  }

  /**
   * Get the current simulation status
   */
  async getSimulationStatus(user: JWTUserPayload): Promise<any> {
    if (!user.is_simulation || !user.simulation_session_id) {
      return {
        message: 'Not in simulation mode',
        is_simulation: false,
      };
    }

    const session = await this.simulationSessionModel.findById(user.simulation_session_id);

    if (!session) {
      return {
        message: 'Simulation session not found',
        is_simulation: false,
      };
    }

    return {
      message: 'Currently in simulation mode',
      is_simulation: true,
      session: {
        _id: session._id.toString(),
        simulation_mode: session.simulation_mode,
        simulated_student_id: session.simulated_student_id.toString(),
        simulated_student_name: session.simulated_student_name,
        started_at: session.started_at,
        original_user_role: session.original_user_role,
      },
    };
  }

  /**
   * Get list of students available for simulation
   */
  async getAvailableStudents(
    user: JWTUserPayload,
    paginationDto: PaginationDto,
    search?: string,
    schoolId?: string,
  ): Promise<AvailableStudentsListDto> {
    this.logger.log(`Getting available students for simulation for user: ${user.email}`);

    // Determine school_id
    let targetSchoolId: string;
    if (user.role.name === RoleEnum.SUPER_ADMIN) {
      if (!schoolId) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'SIMULATION',
            'SCHOOL_ID_REQUIRED',
            user.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
      targetSchoolId = schoolId;
    } else {
      targetSchoolId = user.school_id?.toString() || '';
    }

    if (!targetSchoolId) {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get school details
    const school = await this.schoolModel.findById(targetSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection = await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);

    // Build query
    const query: any = {
      deleted_at: null,
      status: StatusEnum.ACTIVE,
    };

    // Search functionality
    if (search) {
      const encryptedSearch = this.emailEncryptionService.encryptEmail(search);
      query.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { student_code: { $regex: search, $options: 'i' } },
        { email: encryptedSearch },
      ];
    }

    // Pagination
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    const skip = (page - 1) * limit;

    // Get students
    const [students, total] = await Promise.all([
      StudentModel.find(query)
        .select('first_name last_name email student_code profile_pic year status is_csv_upload')
        .sort({ first_name: 1, last_name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StudentModel.countDocuments(query),
    ]);

    // Decrypt emails and format response
    const formattedStudents = students.map((student: any) => ({
      id: student._id.toString(),
      email: this.emailEncryptionService.decryptEmail(student.email),
      first_name: student.first_name,
      last_name: student.last_name,
      student_code: student.student_code,
      profile_pic: student.profile_pic,
      year: student.year,
      status: student.status,
      is_dummy_student: student.is_csv_upload || false, // CSV uploaded students could be test students
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'SIMULATION',
        'STUDENTS_RETRIEVED_SUCCESSFULLY',
        user.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: formattedStudents,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get simulation history for the current user
   */
  async getSimulationHistory(
    user: JWTUserPayload,
    paginationDto: PaginationDto,
  ): Promise<SimulationHistoryDto> {
    this.logger.log(`Getting simulation history for user: ${user.email}`);

    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    const skip = (page - 1) * limit;

    // Build query based on user role
    const query: any = {};
    if (user.role.name === RoleEnum.SUPER_ADMIN) {
      // Super admin sees all simulation sessions
    } else if (user.role.name === RoleEnum.SCHOOL_ADMIN) {
      // School admin sees simulations in their school
      query.school_id = new Types.ObjectId(user.school_id?.toString() || '');
    } else {
      // Professor sees their own simulations
      query.original_user_id = new Types.ObjectId(user.id.toString());
    }

    const [sessions, total] = await Promise.all([
      this.simulationSessionModel
        .find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.simulationSessionModel.countDocuments(query),
    ]);

    const formattedSessions = sessions.map((session: any) => ({
      _id: session._id.toString(),
      original_user_id: session.original_user_id.toString(),
      original_user_role: session.original_user_role,
      original_user_email: session.original_user_email,
      simulated_student_id: session.simulated_student_id.toString(),
      simulated_student_email: session.simulated_student_email,
      simulated_student_name: session.simulated_student_name,
      school_id: session.school_id.toString(),
      school_name: session.school_name,
      simulation_mode: session.simulation_mode,
      status: session.status,
      started_at: session.started_at,
      ended_at: session.ended_at,
      duration_seconds: session.duration_seconds,
      modules_viewed: session.modules_viewed,
      quizzes_viewed: session.quizzes_viewed,
      ai_chats_opened: session.ai_chats_opened,
      pages_visited: session.pages_visited,
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'SIMULATION',
        'HISTORY_RETRIEVED_SUCCESSFULLY',
        user.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: formattedSessions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Track page visit during simulation
   */
  async trackPageVisit(sessionId: string, page: string): Promise<void> {
    try {
      await this.simulationSessionModel.findByIdAndUpdate(sessionId, {
        $addToSet: { pages_visited: page },
      });
    } catch (error) {
      this.logger.error(`Failed to track page visit: ${error.message}`);
    }
  }

  /**
   * Increment activity counter during simulation
   */
  async incrementActivityCounter(
    sessionId: string,
    counter: 'modules_viewed' | 'quizzes_viewed' | 'ai_chats_opened',
  ): Promise<void> {
    try {
      await this.simulationSessionModel.findByIdAndUpdate(sessionId, {
        $inc: { [counter]: 1 },
      });
    } catch (error) {
      this.logger.error(`Failed to increment counter: ${error.message}`);
    }
  }

  /**
   * Cleanup all stuck/active simulation sessions for a user
   */
  async cleanupStuckSessions(user: JWTUserPayload): Promise<{ message: string; sessions_ended: number }> {
    this.logger.log(`Cleaning up stuck simulation sessions for user: ${user.email}`);

    const activeSessions = await this.simulationSessionModel.find({
      original_user_id: new Types.ObjectId(user.id.toString()),
      status: SimulationStatusEnum.ACTIVE,
    });

    if (activeSessions.length === 0) {
      return {
        message: 'No active simulation sessions found',
        sessions_ended: 0,
      };
    }

    const endedAt = new Date();
    for (const session of activeSessions) {
      const durationSeconds = Math.floor((endedAt.getTime() - session.started_at.getTime()) / 1000);
      session.status = SimulationStatusEnum.ENDED;
      session.ended_at = endedAt;
      session.duration_seconds = durationSeconds;
      await session.save();
      this.logger.log(`Cleaned up session ${session._id}, duration: ${durationSeconds}s`);
    }

    return {
      message: `Cleanup completed. Ended ${activeSessions.length} stuck session(s)`,
      sessions_ended: activeSessions.length,
    };
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // default 1 hour

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 3600;
    }
  }

  private getRoleIdFromName(roleName: RoleEnum): string {
    switch (roleName) {
      case RoleEnum.SUPER_ADMIN:
        return ROLE_IDS.SUPER_ADMIN;
      case RoleEnum.SCHOOL_ADMIN:
        return ROLE_IDS.SCHOOL_ADMIN;
      case RoleEnum.PROFESSOR:
        return ROLE_IDS.PROFESSOR;
      case RoleEnum.STUDENT:
        return ROLE_IDS.STUDENT;
      default:
        return ROLE_IDS.STUDENT;
    }
  }
}

