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
  FeedbackTypeEnum,
} from 'src/common/constants/internship.constant';
import { ProgressStatusEnum } from 'src/common/constants/status.constant';
import { PythonInternshipService } from './python-internship.service';
import {
  CaseFeedbackLog,
  CaseFeedbackLogSchema,
} from 'src/database/schemas/tenant/case-feedback-log.schema';
import { normalizePatientSimulationConfig } from './utils/enum-mapping.util';

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

      // Check if student already has an active or paused session for this case
      const existingActiveSession = await SessionModel.findOne({
        student_id: new Types.ObjectId(user.id),
        case_id: new Types.ObjectId(case_id),
        session_type,
        status: { $in: [SessionStatusEnum.ACTIVE, SessionStatusEnum.PAUSED] },
      });

      if (existingActiveSession) {
        // Return existing session
        return {
          message: `${existingActiveSession.status === SessionStatusEnum.PAUSED ? 'Paused' : 'Active'} session already exists. Please complete or resume this session before starting a new one.`,
          data: existingActiveSession,
        };
      }

      // Check session limits if configured
      const sessionConfig = caseData.session_config;
      if (sessionConfig?.max_sessions_allowed) {
        // Count how many sessions student has completed for this case
        const completedSessionsCount = await SessionModel.countDocuments({
          student_id: new Types.ObjectId(user.id),
          case_id: new Types.ObjectId(case_id),
          session_type,
          status: { $in: [SessionStatusEnum.COMPLETED, SessionStatusEnum.PENDING_VALIDATION] },
        });

        if (completedSessionsCount >= sessionConfig.max_sessions_allowed) {
          throw new BadRequestException(
            `Maximum number of sessions (${sessionConfig.max_sessions_allowed}) reached for this case`,
          );
        }
      }

      // Determine session number (how many attempts so far + 1)
      const totalPreviousSessions = await SessionModel.countDocuments({
        student_id: new Types.ObjectId(user.id),
        case_id: new Types.ObjectId(case_id),
        session_type,
      });
      const sessionNumber = totalPreviousSessions + 1;

      // Initialize session with Python backend
      let pythonSessionId: string | null = null;

      if (session_type === SessionTypeEnum.PATIENT_INTERVIEW) {
        // Validate patient_simulation_config exists and has required fields
        if (!caseData.patient_simulation_config || !caseData.patient_simulation_config.patient_profile) {
          throw new BadRequestException(
            'Case is missing patient_simulation_config. Please update the case with patient profile and scenario configuration before starting a session.'
          );
        }

        // Normalize the entire config to ensure enum values are in English
        const normalizedConfig = normalizePatientSimulationConfig(
          caseData.patient_simulation_config
        );

        // Extract scenario config fields only (exclude patient_profile and _id)
        // Provide sensible defaults for optional fields to ensure compatibility
        const scenarioConfig: Record<string, any> = {
          scenario_type: normalizedConfig.scenario_type,
          difficulty_level: normalizedConfig.difficulty_level,
          // Use provided values or sensible defaults
          interview_focus: normalizedConfig.interview_focus || 
            (normalizedConfig.scenario_type === 'initial_clinical_interview' 
              ? 'assessment_and_diagnosis' 
              : 'treatment_planning'),
          patient_openness: normalizedConfig.patient_openness || 
            'moderately_forthcoming',
        };

        this.logger.log(
          `Normalized scenario config for case ${case_id}: ${JSON.stringify(scenarioConfig)}`
        );

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
        session_number: sessionNumber,
        max_duration_minutes: sessionConfig?.session_duration_minutes || null,
        total_active_time_seconds: 0,
        pause_history: [],
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
    const { message, metadata, therapist_actions } = sendMessageDto;

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
        metadata: {
          ...(metadata || {}),
          therapist_actions: therapist_actions || [],
        },
      };

      session.messages.push(studentMessage);

      // Get AI response based on session type
      let aiResponse: any = null;
      let aiRole: MessageRoleEnum = MessageRoleEnum.AI_PATIENT; // Default value

      if (session.session_type === SessionTypeEnum.PATIENT_INTERVIEW) {
        // Validate patient_session_id exists
        if (!session.patient_session_id) {
          this.logger.error(`Session ${sessionId} has no patient_session_id. Session data: ${JSON.stringify(session)}`);
          throw new BadRequestException(
            'Patient session not properly initialized. Please create a new session.'
          );
        }

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

        this.logger.debug(`Sending message to Python API - Session ID: ${session.patient_session_id}, Message: ${message.substring(0, 50)}...`);

        const pythonResponse = await this.pythonService.sendPatientMessage(
          session.patient_session_id,
          message,
          context,
          therapist_actions,
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
        // Validate therapist_session_id exists
        if (!session.therapist_session_id) {
          this.logger.error(`Session ${sessionId} has no therapist_session_id. Session data: ${JSON.stringify(session)}`);
          throw new BadRequestException(
            'Therapist session not properly initialized. Please create a new session.'
          );
        }

        this.logger.debug(`Sending message to Python API - Therapist Session ID: ${session.therapist_session_id}, Message: ${message.substring(0, 50)}...`);

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
      
      // Provide more specific error messages based on the error type
      const errorMessage = error?.message || 'Unknown error';
      
      if (errorMessage.includes('Session not found or expired')) {
        throw new BadRequestException(
          'Your session has expired or was not found. This can happen if:\n' +
          '1. The session has been inactive for more than 24 hours\n' +
          '2. The Python AI service was restarted\n' +
          '3. MongoDB was temporarily down when the session was created\n\n' +
          'Please end this session and create a new one to continue.'
        );
      }
      
      if (errorMessage.includes('validation failed')) {
        throw new BadRequestException(`Invalid message format: ${errorMessage}`);
      }
      
      // For other errors, provide the original error message
      throw new BadRequestException(`Failed to send message: ${errorMessage}`);
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
   * Complete session and automatically generate feedback
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
    const CaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);
    const FeedbackModel = tenantConnection.model(CaseFeedbackLog.name, CaseFeedbackLogSchema);

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
        const pythonSessionId = session.patient_session_id || session.therapist_session_id;
        if (pythonSessionId) {
          await this.pythonService.endSession(pythonSessionId, session.session_type);
        } else {
          this.logger.warn(`Session ${sessionId} has no Python session ID to end`);
        }
      } catch (error) {
        this.logger.warn('Failed to end Python session', error);
        // Don't fail completion if Python service is down
      }

      // Update session status
      session.status = SessionStatusEnum.COMPLETED;
      session.ended_at = new Date();
      await session.save();

      this.logger.log(`Session ${sessionId} completed successfully`);

      // Automatically generate feedback
      let feedbackResult: any = null;
      try {
        this.logger.log(`Auto-generating feedback for session: ${sessionId}`);

        // Check if feedback already exists
        const existingFeedback = await FeedbackModel.findOne({
          session_id: new Types.ObjectId(sessionId),
        });

        if (existingFeedback) {
          this.logger.log(`Feedback already exists for session ${sessionId}`);
          feedbackResult = existingFeedback;
        } else {
          // Get case details for evaluation criteria
          const caseData = await CaseModel.findOne({
            _id: session.case_id,
            deleted_at: null,
          });

          if (!caseData) {
            this.logger.error(`Case not found for session ${sessionId}`);
          } else {
            // Calculate session duration in minutes
            const sessionStartTime = session.started_at || session.created_at;
            const sessionEndTime = session.ended_at;
            const durationMs = new Date(sessionEndTime).getTime() - new Date(sessionStartTime).getTime();
            const sessionDurationMinutes = Math.floor(durationMs / 60000);

            // Generate feedback using Python service
            const pythonResponse = await this.pythonService.generateSupervisorFeedback(
              session.case_id.toString(),
              {
                messages: session.messages,
                session_type: session.session_type,
                started_at: session.started_at,
                ended_at: session.ended_at,
                session_duration_minutes: sessionDurationMinutes,
              },
              caseData.evaluation_criteria || [],
            );

            // Create feedback log
            const feedbackData = {
              student_id: session.student_id,
              case_id: session.case_id,
              session_id: new Types.ObjectId(sessionId),
              feedback_type: FeedbackTypeEnum.AUTO_GENERATED,
              ai_feedback: {
                overall_score: pythonResponse.feedback.overall_score,
                strengths: pythonResponse.feedback.strengths,
                areas_for_improvement: pythonResponse.feedback.areas_for_improvement,
                technical_assessment: pythonResponse.feedback.technical_assessment,
                communication_assessment: pythonResponse.feedback.communication_assessment,
                clinical_reasoning: pythonResponse.feedback.clinical_reasoning,
                generated_at: new Date(),
              },
              professor_feedback: {},
              status: FeedbackStatusEnum.PENDING_VALIDATION,
            };

            const newFeedback = new FeedbackModel(feedbackData);
            feedbackResult = await newFeedback.save();

            // Update session status to pending validation
            session.status = SessionStatusEnum.PENDING_VALIDATION;
            await session.save();

            this.logger.log(`Feedback auto-generated successfully: ${feedbackResult._id}`);
          }
        }
      } catch (error) {
        this.logger.error('Failed to auto-generate feedback', error?.stack || error);
        // Don't fail the completion if feedback generation fails
        // The user can manually generate feedback later
      }

      return {
        message: 'Session completed successfully',
        data: {
          session: session,
          feedback: feedbackResult ? {
            id: feedbackResult._id,
            status: feedbackResult.status,
            overall_score: feedbackResult.ai_feedback?.overall_score,
          } : null,
          feedback_generated: !!feedbackResult,
        },
      };
    } catch (error) {
      this.logger.error('Error completing session', error?.stack || error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
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

  /**
   * Pause an active session
   */
  async pauseSession(sessionId: string, user: JWTUserPayload) {
    this.logger.log(`Pausing session: ${sessionId}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const SessionModel = tenantConnection.model(StudentCaseSession.name, StudentCaseSessionSchema);
    const CaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);

    try {
      const session = await SessionModel.findOne({
        _id: new Types.ObjectId(sessionId),
        student_id: new Types.ObjectId(user.id),
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      if (session.status !== SessionStatusEnum.ACTIVE) {
        throw new BadRequestException(
          `Cannot pause session with status: ${session.status}`,
        );
      }

      // Get case to check if pause is allowed
      const caseData = await CaseModel.findById(session.case_id);
      if (!caseData?.session_config?.allow_pause) {
        throw new BadRequestException('Pausing is not allowed for this session');
      }

      // Calculate time spent in current active period
      const now = new Date();
      const lastResumeTime = session.pause_history && session.pause_history.length > 0
        ? session.pause_history[session.pause_history.length - 1].resumed_at || session.started_at
        : session.started_at;

      const activeTimeSeconds = Math.floor((now.getTime() - lastResumeTime.getTime()) / 1000);
      session.total_active_time_seconds += activeTimeSeconds;

      // Update session status and add pause record
      session.status = SessionStatusEnum.PAUSED;
      session.paused_at = now;
      session.pause_history.push({
        paused_at: now,
        resumed_at: null,
        pause_duration_seconds: 0,
      });

      await session.save();

      this.logger.log(`Session paused successfully: ${sessionId}`);

      return {
        message: 'Session paused successfully',
        data: {
          session_id: session._id,
          status: session.status,
          paused_at: session.paused_at,
          total_active_time_seconds: session.total_active_time_seconds,
          pause_count: session.pause_history.length,
        },
      };
    } catch (error) {
      this.logger.error('Error pausing session', error?.stack || error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to pause session');
    }
  }

  /**
   * Resume a paused session
   */
  async resumeSession(sessionId: string, user: JWTUserPayload) {
    this.logger.log(`Resuming session: ${sessionId}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const SessionModel = tenantConnection.model(StudentCaseSession.name, StudentCaseSessionSchema);

    try {
      const session = await SessionModel.findOne({
        _id: new Types.ObjectId(sessionId),
        student_id: new Types.ObjectId(user.id),
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      if (session.status !== SessionStatusEnum.PAUSED) {
        throw new BadRequestException(
          `Cannot resume session with status: ${session.status}`,
        );
      }

      const now = new Date();

      // Update the last pause record with resume time
      if (session.pause_history && session.pause_history.length > 0) {
        const lastPause = session.pause_history[session.pause_history.length - 1];
        lastPause.resumed_at = now;
        lastPause.pause_duration_seconds = Math.floor(
          (now.getTime() - lastPause.paused_at.getTime()) / 1000,
        );
      }

      // Update session status
      session.status = SessionStatusEnum.ACTIVE;
      session.paused_at = null as any;

      await session.save();

      this.logger.log(`Session resumed successfully: ${sessionId}`);

      return {
        message: 'Session resumed successfully',
        data: {
          session_id: session._id,
          status: session.status,
          resumed_at: now,
          total_active_time_seconds: session.total_active_time_seconds,
          pause_count: session.pause_history.length,
        },
      };
    } catch (error) {
      this.logger.error('Error resuming session', error?.stack || error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to resume session');
    }
  }

  /**
   * Get session timer information
   */
  async getSessionTimer(sessionId: string, user: JWTUserPayload) {
    this.logger.log(`Getting session timer: ${sessionId}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const SessionModel = tenantConnection.model(StudentCaseSession.name, StudentCaseSessionSchema);
    const CaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);

    try {
      const session = await SessionModel.findOne({
        _id: new Types.ObjectId(sessionId),
        student_id: new Types.ObjectId(user.id),
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      const caseData = await CaseModel.findById(session.case_id);
      const sessionConfig = caseData?.session_config;

      const now = new Date();
      let currentActiveTime = session.total_active_time_seconds;

      // If session is currently active, add time since last resume
      if (session.status === SessionStatusEnum.ACTIVE) {
        const lastResumeTime = session.pause_history && session.pause_history.length > 0
          ? session.pause_history[session.pause_history.length - 1].resumed_at || session.started_at
          : session.started_at;
        currentActiveTime += Math.floor((now.getTime() - lastResumeTime.getTime()) / 1000);
      }

      // Calculate remaining time if limit configured
      const maxDurationSeconds = session.max_duration_minutes 
        ? session.max_duration_minutes * 60 
        : null;
      const remainingTimeSeconds = maxDurationSeconds 
        ? Math.max(0, maxDurationSeconds - currentActiveTime) 
        : null;

      // Check if near timeout (within warning threshold)
      const warningThresholdSeconds = (sessionConfig?.warning_before_timeout_minutes || 5) * 60;
      const isNearTimeout = remainingTimeSeconds !== null && remainingTimeSeconds <= warningThresholdSeconds;

      return {
        status: session.status,
        total_active_time_seconds: currentActiveTime,
        remaining_time_seconds: remainingTimeSeconds,
        is_near_timeout: isNearTimeout,
        started_at: session.started_at,
        paused_at: session.paused_at,
        pause_count: session.pause_history?.length || 0,
      };
    } catch (error) {
      this.logger.error('Error getting session timer', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get session timer');
    }
  }

  /**
   * Get session history for a case (all student's attempts)
   */
  async getSessionHistory(caseId: string, user: JWTUserPayload) {
    this.logger.log(`Getting session history for case: ${caseId}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const SessionModel = tenantConnection.model(StudentCaseSession.name, StudentCaseSessionSchema);
    const CaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);

    try {
      // Verify case exists
      const caseData = await CaseModel.findOne({
        _id: new Types.ObjectId(caseId),
        deleted_at: null,
      });

      if (!caseData) {
        throw new NotFoundException('Case not found');
      }

      // Get all sessions for this case by this student
      const sessions = await SessionModel.find({
        student_id: new Types.ObjectId(user.id),
        case_id: new Types.ObjectId(caseId),
      })
        .sort({ session_number: -1, created_at: -1 })
        .lean();

      // Calculate statistics
      const totalSessions = sessions.length;
      const completedSessions = sessions.filter(
        s => s.status === SessionStatusEnum.COMPLETED || s.status === SessionStatusEnum.PENDING_VALIDATION,
      ).length;
      const activeSessions = sessions.filter(
        s => s.status === SessionStatusEnum.ACTIVE || s.status === SessionStatusEnum.PAUSED,
      ).length;

      // Calculate total time spent across all sessions
      const totalTimeSeconds = sessions.reduce((sum, session) => {
        let sessionTime = session.total_active_time_seconds || 0;
        
        // If session is currently active, add current active time
        if (session.status === SessionStatusEnum.ACTIVE) {
          const lastResumeTime = session.pause_history && session.pause_history.length > 0
            ? session.pause_history[session.pause_history.length - 1].resumed_at || session.started_at
            : session.started_at;
          sessionTime += Math.floor((Date.now() - new Date(lastResumeTime).getTime()) / 1000);
        }
        
        return sum + sessionTime;
      }, 0);

      // Format sessions for response
      const formattedSessions = sessions.map(session => ({
        session_id: session._id,
        session_number: session.session_number,
        session_type: session.session_type,
        status: session.status,
        started_at: session.started_at,
        ended_at: session.ended_at,
        paused_at: session.paused_at,
        total_active_time_seconds: session.total_active_time_seconds || 0,
        message_count: session.messages?.length || 0,
        tips_received: session.realtime_tips?.length || 0,
        pause_count: session.pause_history?.length || 0,
      }));

      return {
        case_id: caseId,
        case_title: caseData.title,
        student_id: user.id,
        statistics: {
          total_sessions: totalSessions,
          completed_sessions: completedSessions,
          active_sessions: activeSessions,
          total_time_seconds: totalTimeSeconds,
          max_sessions_allowed: caseData.session_config?.max_sessions_allowed || null,
          sessions_remaining: caseData.session_config?.max_sessions_allowed 
            ? Math.max(0, caseData.session_config.max_sessions_allowed - completedSessions)
            : null,
        },
        sessions: formattedSessions,
      };
    } catch (error) {
      this.logger.error('Error getting session history', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get session history');
    }
  }

  /**
   * Get active/paused session for a case (for resume functionality)
   */
  async getActiveSession(caseId: string, user: JWTUserPayload) {
    this.logger.log(`Getting active session for case: ${caseId}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const SessionModel = tenantConnection.model(StudentCaseSession.name, StudentCaseSessionSchema);

    try {
      const activeSession = await SessionModel.findOne({
        student_id: new Types.ObjectId(user.id),
        case_id: new Types.ObjectId(caseId),
        status: { $in: [SessionStatusEnum.ACTIVE, SessionStatusEnum.PAUSED] },
      }).lean();

      if (!activeSession) {
        return {
          has_active_session: false,
          session: null,
        };
      }

      return {
        has_active_session: true,
        session: {
          session_id: activeSession._id,
          session_number: activeSession.session_number,
          session_type: activeSession.session_type,
          status: activeSession.status,
          started_at: activeSession.started_at,
          paused_at: activeSession.paused_at,
          total_active_time_seconds: activeSession.total_active_time_seconds || 0,
          max_duration_minutes: activeSession.max_duration_minutes,
          message_count: activeSession.messages?.length || 0,
          pause_count: activeSession.pause_history?.length || 0,
        },
      };
    } catch (error) {
      this.logger.error('Error getting active session', error?.stack || error);
      throw new BadRequestException('Failed to get active session');
    }
  }
}

