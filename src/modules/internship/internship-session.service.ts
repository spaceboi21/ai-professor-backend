import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { School } from 'src/database/schemas/central/school.schema';
import {
  StudentCaseSession,
  StudentCaseSessionSchema,
} from 'src/database/schemas/tenant/student-case-session.schema';
import {
  InternshipCase,
  InternshipCaseSchema,
} from 'src/database/schemas/tenant/internship-case.schema';
import {
  StudentInternshipProgress,
  StudentInternshipProgressSchema,
} from 'src/database/schemas/tenant/student-internship-progress.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { DEFAULT_LANGUAGE } from 'src/common/constants/language.constant';
import {
  SessionTypeEnum,
  SessionStatusEnum,
  MessageRoleEnum,
  FeedbackStatusEnum,
} from 'src/common/constants/internship.constant';
import { ProgressStatusEnum } from 'src/common/constants/status.constant';
import { PythonInternshipService } from './python-internship.service';
import {
  CaseFeedbackLog,
  CaseFeedbackLogSchema,
} from 'src/database/schemas/tenant/case-feedback-log.schema';

@Injectable()
export class InternshipSessionService {
  private readonly logger = new Logger(InternshipSessionService.name);

  constructor(
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly errorMessageService: ErrorMessageService,
    private readonly pythonService: PythonInternshipService,
  ) {}

  /**
   * Create a new session (patient interview, therapist consultation, etc.)
   */
  async createSession(createSessionDto: CreateSessionDto, user: JWTUserPayload) {
    const { case_id, session_type } = createSessionDto;

    this.logger.log(`Creating ${session_type} session for case: ${case_id} by user: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const CaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);
    const SessionModel = tenantConnection.model(StudentCaseSession.name, StudentCaseSessionSchema);
    const ProgressModel = tenantConnection.model(
      StudentInternshipProgress.name,
      StudentInternshipProgressSchema,
    );

    try {
      // Verify case exists
      const caseData = await CaseModel.findOne({
        _id: new Types.ObjectId(case_id),
        deleted_at: null,
      });

      if (!caseData) {
        throw new NotFoundException('Case not found');
      }

      // Check if student already has an active session for this case
      const existingActiveSession = await SessionModel.findOne({
        student_id: new Types.ObjectId(user.id),
        case_id: new Types.ObjectId(case_id),
        session_type,
        status: SessionStatusEnum.ACTIVE,
      });

      if (existingActiveSession) {
        // Return existing session
        return {
          message: 'Active session already exists',
          data: existingActiveSession,
        };
      }

      // Initialize session with Python backend
      let pythonSessionId: string | null = null;

      if (session_type === SessionTypeEnum.PATIENT_INTERVIEW) {
        // Validate patient_simulation_config exists and has required fields
        if (!caseData.patient_simulation_config || !caseData.patient_simulation_config.patient_profile) {
          throw new BadRequestException(
            'Case is missing patient_simulation_config. Please update the case with patient profile and scenario configuration before starting a session.'
          );
        }

        // Extract scenario config fields only (exclude patient_profile and _id)
        // Provide sensible defaults for optional fields to ensure compatibility
        const scenarioConfig: Record<string, any> = {
          scenario_type: caseData.patient_simulation_config.scenario_type,
          difficulty_level: caseData.patient_simulation_config.difficulty_level,
          // Use provided values or sensible defaults
          interview_focus: (caseData.patient_simulation_config as any).interview_focus || 
            (caseData.patient_simulation_config.scenario_type === 'initial_clinical_interview' 
              ? 'assessment_and_diagnosis' 
              : 'treatment_planning'),
          patient_openness: (caseData.patient_simulation_config as any).patient_openness || 
            'moderately_forthcoming',
        };

        // Validate required scenario fields (scenario_type and difficulty_level are mandatory)
        if (!scenarioConfig.scenario_type || !scenarioConfig.difficulty_level) {
          throw new BadRequestException(
            'Case patient_simulation_config is missing required scenario fields: scenario_type and difficulty_level are required.'
          );
        }

        // Log if defaults were used (for debugging)
        if (!(caseData.patient_simulation_config as any).interview_focus || 
            !(caseData.patient_simulation_config as any).patient_openness) {
          this.logger.warn(
            `Case ${case_id} missing interview_focus or patient_openness, using defaults: ` +
            `interview_focus=${scenarioConfig.interview_focus}, patient_openness=${scenarioConfig.patient_openness}`
          );
        }

        // Log what we're sending to Python API for debugging
        this.logger.debug(`Sending to Python API: case_id=${case_id}, patient_profile=${JSON.stringify(caseData.patient_simulation_config.patient_profile)}`);

        const pythonResponse = await this.pythonService.initializePatientSession(
          case_id,
          caseData.patient_simulation_config.patient_profile,
          scenarioConfig,
        );
        pythonSessionId = pythonResponse.session_id;
      } else if (session_type === SessionTypeEnum.THERAPIST_CONSULTATION) {
        // Get previous patient session for context
        const patientSession = await SessionModel.findOne({
          student_id: new Types.ObjectId(user.id),
          case_id: new Types.ObjectId(case_id),
          session_type: SessionTypeEnum.PATIENT_INTERVIEW,
          status: SessionStatusEnum.COMPLETED,
        })
          .sort({ ended_at: -1 })
          .lean();

        const sessionHistory = patientSession?.messages || [];

        const pythonResponse = await this.pythonService.initializeTherapistSession(
          case_id,
          sessionHistory,
          { student_id: user.id },
        );
        pythonSessionId = pythonResponse.session_id;
      }

      // Create session in database
      const sessionData = {
        student_id: new Types.ObjectId(user.id),
        internship_id: caseData.internship_id,
        case_id: new Types.ObjectId(case_id),
        session_type,
        status: SessionStatusEnum.ACTIVE,
        started_at: new Date(),
        patient_session_id: session_type === SessionTypeEnum.PATIENT_INTERVIEW ? pythonSessionId : null,
        therapist_session_id: session_type === SessionTypeEnum.THERAPIST_CONSULTATION ? pythonSessionId : null,
        messages: [],
        realtime_tips: [],
      };

      const newSession = new SessionModel(sessionData);
      const savedSession = await newSession.save();

      // Update or create student progress
      await this.updateStudentProgress(
        new Types.ObjectId(user.id),
        caseData.internship_id,
        tenantConnection,
      );

      this.logger.log(`Session created: ${savedSession._id}`);

      return {
        message: 'Session created successfully',
        data: savedSession,
      };
    } catch (error) {
      this.logger.error('Error creating session', error?.stack || error);
      throw new BadRequestException('Failed to create session');
    }
  }

  /**
   * Send message in a session
   */
  async sendMessage(
    sessionId: string,
    sendMessageDto: SendMessageDto,
    user: JWTUserPayload,
  ) {
    const { message, metadata } = sendMessageDto;

    this.logger.log(`Sending message in session: ${sessionId} by user: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const SessionModel = tenantConnection.model(StudentCaseSession.name, StudentCaseSessionSchema);

    try {
      // Validate sessionId is a valid ObjectId
      if (!Types.ObjectId.isValid(sessionId)) {
        throw new BadRequestException(`Invalid session ID format: ${sessionId}`);
      }

      // Find session
      const session = await SessionModel.findOne({
        _id: new Types.ObjectId(sessionId),
        student_id: new Types.ObjectId(user.id),
        deleted_at: null,
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      if (session.status !== SessionStatusEnum.ACTIVE) {
        throw new BadRequestException('Session is not active');
      }

      // Add student message to session
      const studentMessage = {
        role: MessageRoleEnum.STUDENT,
        content: message,
        timestamp: new Date(),
        metadata: metadata || {},
      };

      session.messages.push(studentMessage);

      // Get AI response based on session type
      let aiResponse: any = null;
      let aiRole: MessageRoleEnum = MessageRoleEnum.AI_PATIENT; // Default value

      if (session.session_type === SessionTypeEnum.PATIENT_INTERVIEW) {
        // Build context with required fields for Python API
        const messageNumber = session.messages.length; // Current message count (includes the one we just added)
        const sessionStartTime = session.started_at || session.created_at || new Date();
        const elapsedTimeMs = Date.now() - new Date(sessionStartTime).getTime();
        const elapsedTimeMinutes = Math.floor(elapsedTimeMs / 60000); // Convert to minutes

        const context = {
          message_number: messageNumber,
          elapsed_time_minutes: elapsedTimeMinutes,
          ...(metadata || {}), // Include any additional metadata
        };

        const pythonResponse = await this.pythonService.sendPatientMessage(
          session.patient_session_id,
          message,
          context,
        );
        aiResponse = pythonResponse.patient_response;
        aiRole = MessageRoleEnum.AI_PATIENT;

        // Check if supervisor tip should be shown
        try {
          const tipResponse = await this.pythonService.getSupervisorRealtimeTip(
            session.patient_session_id,
            message,
            session.messages,
          );

          if (tipResponse.should_show_tip) {
            session.realtime_tips.push({
              message: tipResponse.tip_content,
              context: tipResponse.tip_category || null,
              timestamp: new Date(),
            });
          }
        } catch (error) {
          this.logger.warn('Failed to get supervisor tip', error);
        }
      } else if (session.session_type === SessionTypeEnum.THERAPIST_CONSULTATION) {
        const pythonResponse = await this.pythonService.sendTherapistMessage(
          session.therapist_session_id,
          message,
        );
        aiResponse = pythonResponse.therapist_response;
        aiRole = MessageRoleEnum.AI_THERAPIST;
      }

      // Add AI response to session
      if (aiResponse) {
        const aiMessage = {
          role: aiRole,
          content: aiResponse,
          timestamp: new Date(),
          metadata: {},
        };
        session.messages.push(aiMessage);
      }

      // Save session
      await session.save();

      return {
        message: 'Message sent successfully',
        data: {
          session_id: session._id,
          student_message: studentMessage,
          ai_response: aiResponse ? { role: aiRole, content: aiResponse } : null,
          realtime_tip: session.realtime_tips.length > 0 ? session.realtime_tips[session.realtime_tips.length - 1] : null,
        },
      };
    } catch (error) {
      this.logger.error('Error sending message', error?.stack || error);
      throw new BadRequestException('Failed to send message');
    }
  }

  /**
   * Get session details
   */
  async getSessionDetails(sessionId: string, user: JWTUserPayload) {
    this.logger.log(`Getting session details: ${sessionId}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const SessionModel = tenantConnection.model(StudentCaseSession.name, StudentCaseSessionSchema);

    try {
      const session = await SessionModel.findOne({
        _id: new Types.ObjectId(sessionId),
        student_id: new Types.ObjectId(user.id),
        deleted_at: null,
      }).lean();

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      return {
        message: 'Session retrieved successfully',
        data: session,
      };
    } catch (error) {
      this.logger.error('Error getting session details', error?.stack || error);
      throw new BadRequestException('Failed to retrieve session');
    }
  }

  /**
   * Complete session
   */
  async completeSession(sessionId: string, user: JWTUserPayload) {
    this.logger.log(`Completing session: ${sessionId}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const SessionModel = tenantConnection.model(StudentCaseSession.name, StudentCaseSessionSchema);

    try {
      const session = await SessionModel.findOne({
        _id: new Types.ObjectId(sessionId),
        student_id: new Types.ObjectId(user.id),
        deleted_at: null,
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      if (session.status !== SessionStatusEnum.ACTIVE) {
        throw new BadRequestException('Session is already completed');
      }

      // End session on Python side
      try {
        await this.pythonService.endSession(
          session.patient_session_id || session.therapist_session_id,
          session.session_type,
        );
      } catch (error) {
        this.logger.warn('Failed to end Python session', error);
      }

      // Update session status
      session.status = SessionStatusEnum.COMPLETED;
      session.ended_at = new Date();
      await session.save();

      return {
        message: 'Session completed successfully',
        data: session,
      };
    } catch (error) {
      this.logger.error('Error completing session', error?.stack || error);
      throw new BadRequestException('Failed to complete session');
    }
  }

  /**
   * Helper to update student progress
   */
  private async updateStudentProgress(
    studentId: Types.ObjectId,
    internshipId: Types.ObjectId,
    tenantConnection: any,
  ) {
    const ProgressModel = tenantConnection.model(
      StudentInternshipProgress.name,
      StudentInternshipProgressSchema,
    );
    const InternshipCaseModel = tenantConnection.model(
      InternshipCase.name,
      InternshipCaseSchema,
    );
    const FeedbackModel = tenantConnection.model(
      CaseFeedbackLog.name,
      CaseFeedbackLogSchema,
    );

    try {
      // Count total cases for this internship
      const totalCases = await InternshipCaseModel.countDocuments({
        internship_id: internshipId,
        deleted_at: null,
      });

      // Count completed cases (cases with validated feedback)
      const completedFeedbacks = await FeedbackModel.find({
        student_id: studentId,
        status: { $in: [FeedbackStatusEnum.VALIDATED, FeedbackStatusEnum.REVISED] },
      }).distinct('case_id');

      // Filter completed cases to only count cases belonging to this internship
      const completedCasesForInternship = await InternshipCaseModel.countDocuments({
        _id: { $in: completedFeedbacks },
        internship_id: internshipId,
        deleted_at: null,
      });

      // Calculate progress percentage
      const progressPercentage = totalCases > 0 
        ? Math.round((completedCasesForInternship / totalCases) * 100) 
        : 0;

      // Determine status based on progress
      let status = ProgressStatusEnum.IN_PROGRESS;
      if (progressPercentage === 0) {
        status = ProgressStatusEnum.NOT_STARTED;
      } else if (progressPercentage === 100) {
        status = ProgressStatusEnum.COMPLETED;
      }

      let progress = await ProgressModel.findOne({
        student_id: studentId,
        internship_id: internshipId,
      });

      if (!progress) {
        // Create new progress record
        progress = new ProgressModel({
          student_id: studentId,
          internship_id: internshipId,
          status: status === ProgressStatusEnum.NOT_STARTED ? ProgressStatusEnum.IN_PROGRESS : status,
          started_at: new Date(),
          last_accessed_at: new Date(),
          progress_percentage: progressPercentage,
          cases_completed: completedCasesForInternship,
          total_cases: totalCases,
        });
      } else {
        // Update existing progress
        if (progress.status === ProgressStatusEnum.NOT_STARTED) {
          progress.status = ProgressStatusEnum.IN_PROGRESS;
          progress.started_at = new Date();
        } else {
          progress.status = status;
        }
        progress.last_accessed_at = new Date();
        progress.progress_percentage = progressPercentage;
        progress.cases_completed = completedCasesForInternship;
        progress.total_cases = totalCases;
        
        if (status === ProgressStatusEnum.COMPLETED && !progress.completed_at) {
          progress.completed_at = new Date();
        }
      }

      await progress.save();
    } catch (error) {
      this.logger.error('Error updating student progress', error);
    }
  }
}

