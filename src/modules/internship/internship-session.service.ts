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
import {
  InternshipCaseAttempts,
  InternshipCaseAttemptsSchema,
} from 'src/database/schemas/tenant/internship-case-attempts.schema';
import { normalizePatientSimulationConfig } from './utils/enum-mapping.util';

@Injectable()
export class InternshipSessionService {
  private readonly logger = new Logger(InternshipSessionService.name);
  
  // NEW: Feature flag for real-time tips (disabled by default for new system)
  private readonly ENABLE_REALTIME_TIPS = process.env.ENABLE_REALTIME_TIPS === 'true';

  constructor(
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly errorMessageService: ErrorMessageService,
    private readonly pythonService: PythonInternshipService,
  ) {
    if (!this.ENABLE_REALTIME_TIPS) {
      this.logger.warn('⚠️ Real-time tips DISABLED via feature flag');
    } else {
      this.logger.log('✅ Real-time tips ENABLED');
    }
  }

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

      // Fetch cross-session memory for continuity
      const internshipIdStr = caseData.internship_id.toString();
      const userIdStr = typeof user.id === 'string' ? user.id : user.id.toString();
      const memory = await this.pythonService.getInternshipMemory(
        internshipIdStr,
        userIdStr,
      );

      // Log memory status
      if (memory.found && memory.memory) {
        this.logger.log(
          `Found existing memory: ${memory.memory.total_sessions} previous sessions, ` +
          `${memory.memory.patient_memory?.techniques_learned?.length || 0} techniques learned`,
        );
      } else {
        this.logger.log('No existing memory - this is the first session in this internship');
      }

      // Initialize session with Python backend (with graceful fallback)
      let pythonSessionId: string | null = null;
      let pythonBackendAvailable = true;

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

        // Try to initialize with cross-session memory context, with graceful fallback
        try {
          const pythonResponse = await this.pythonService.initializePatientSession(
            case_id,
            caseData.patient_simulation_config.patient_profile,
            scenarioConfig,
            internshipIdStr,  // Pass internship ID for memory
            userIdStr,        // Pass user ID for memory
          );
          pythonSessionId = pythonResponse.session_id;
          this.logger.log(`✅ Python backend initialized successfully: session_id=${pythonSessionId}`);
        } catch (error) {
          // Log error but allow session creation to continue
          this.logger.warn(
            `⚠️ Python AI backend temporarily unavailable: ${error.message}\n` +
            `Session will be created in DEGRADED mode (no AI patient responses until backend recovers)`
          );
          pythonBackendAvailable = false;
          pythonSessionId = null;
        }
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

        try {
          const pythonResponse = await this.pythonService.initializeTherapistSession(
            case_id,
            sessionHistory,
            { student_id: user.id },
          );
          pythonSessionId = pythonResponse.session_id;
          this.logger.log(`✅ Python backend initialized successfully: session_id=${pythonSessionId}`);
        } catch (error) {
          // Log error but allow session creation to continue
          this.logger.warn(
            `⚠️ Python AI backend temporarily unavailable: ${error.message}\n` +
            `Session will be created in DEGRADED mode (no AI therapist responses until backend recovers)`
          );
          pythonBackendAvailable = false;
          pythonSessionId = null;
        }
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
        message: pythonBackendAvailable 
          ? 'Session created successfully' 
          : 'Session created successfully (AI backend temporarily unavailable - you can send messages but AI responses may be delayed)',
        data: savedSession,
        memory_context: {
          has_previous_sessions: memory.found,
          total_previous_sessions: memory.found && memory.memory ? memory.memory.total_sessions : 0,
          techniques_learned: memory.found && memory.memory ? (memory.memory.patient_memory?.techniques_learned || []) : [],
          safe_place_details: memory.found && memory.memory ? (memory.memory.patient_memory?.safe_place_details || null) : null,
        },
        degraded_mode: !pythonBackendAvailable,
        degraded_reason: !pythonBackendAvailable 
          ? 'AI simulation backend is temporarily unavailable. Sessions can still be created, but AI responses will not be available until the backend recovers.' 
          : null,
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
        // Check if patient_session_id exists (null means degraded mode)
        if (!session.patient_session_id) {
          this.logger.warn(
            `Session ${sessionId} created in degraded mode (no patient_session_id). ` +
            `Attempting to initialize Python session now...`
          );
          
          // Try to initialize Python session now
          try {
            const CaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);
            const caseData = await CaseModel.findById(session.case_id);
            
            if (caseData?.patient_simulation_config) {
              const normalizedConfig = normalizePatientSimulationConfig(
                caseData.patient_simulation_config
              );
              
              const scenarioConfig: Record<string, any> = {
                scenario_type: normalizedConfig.scenario_type,
                difficulty_level: normalizedConfig.difficulty_level,
                interview_focus: normalizedConfig.interview_focus || 'assessment_and_diagnosis',
                patient_openness: normalizedConfig.patient_openness || 'moderately_forthcoming',
              };
              
              const internshipIdStr = session.internship_id.toString();
              const userIdStr = typeof user.id === 'string' ? user.id : user.id.toString();
              
              const pythonResponse = await this.pythonService.initializePatientSession(
                session.case_id.toString(),
                caseData.patient_simulation_config.patient_profile,
                scenarioConfig,
                internshipIdStr,
                userIdStr,
              );
              
              // Update session with patient_session_id
              session.patient_session_id = pythonResponse.session_id;
              this.logger.log(`✅ Python backend recovered! Session ${sessionId} now has patient_session_id: ${pythonResponse.session_id}`);
            }
          } catch (error) {
            this.logger.error(`Failed to initialize Python session on message send: ${error.message}`);
            throw new BadRequestException(
              'AI patient simulation is temporarily unavailable. ' +
              'The AI backend is currently down or restarting. ' +
              'Please try again in a few moments, or contact support if the issue persists.'
            );
          }
        }

      // Build rich context with EMDR phase information
      const messageNumber = session.messages.length; // Current message count (includes the one we just added)
      const sessionStartTime = session.started_at || session.created_at || new Date();
      const elapsedTimeMs = Date.now() - new Date(sessionStartTime).getTime();
      const elapsedTimeMinutes = Math.floor(elapsedTimeMs / 60000); // Convert to minutes

      // Fetch memory to get current phase/stage information
      const internshipIdStr = session.internship_id.toString();
      const userIdStr = typeof user.id === 'string' ? user.id : user.id.toString();
      let memory: any = null;
      try {
        const memoryResponse = await this.pythonService.getInternshipMemory(
          internshipIdStr,
          userIdStr,
        );
        memory = memoryResponse.found ? memoryResponse.memory : null;
      } catch (error) {
        this.logger.warn('Failed to fetch memory for context', error);
      }

      // Determine current EMDR phase based on memory and message history
      const currentPhase = this.determineCurrentEMDRPhase(session.messages, memory);

      const context = {
        message_number: messageNumber,
        elapsed_time_minutes: elapsedTimeMinutes,
        
        // EMDR Phase Context
        current_emdr_phase: currentPhase, // e.g., "desensitization", "anamnesis", "safe_place"
        techniques_learned: memory?.patient_memory?.techniques_learned || [],
        safe_place_established: memory?.patient_memory?.safe_place_details ? true : false,
        trauma_targets_identified: memory?.patient_memory?.trauma_targets?.length || 0,
        current_sud_level: memory?.patient_memory?.current_sud_baseline || null,
        bls_preference: memory?.patient_memory?.bilateral_stimulation_preferences || null,
        
        // Session context
        session_number: session.session_number,
        total_previous_sessions: memory?.total_sessions || 0,
        
        ...(metadata || {}), // Include any additional metadata
      };

      this.logger.debug(
        `Sending message to Python API - Session: ${session.patient_session_id}, ` +
        `Phase: ${currentPhase}, Techniques: [${context.techniques_learned.join(', ') || 'none'}], ` +
        `SUD: ${context.current_sud_level || 'not set'}, Message: ${message.substring(0, 50)}...`
      );

        const pythonResponse = await this.pythonService.sendPatientMessage(
          session.patient_session_id,
          message,
          context,
          therapist_actions,
        );
        aiResponse = pythonResponse.patient_response;
        aiRole = MessageRoleEnum.AI_PATIENT;

        // Check if supervisor tip should be shown (FEATURE FLAG: disabled by default)
        if (this.ENABLE_REALTIME_TIPS) {
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
        }
      } else if (session.session_type === SessionTypeEnum.THERAPIST_CONSULTATION) {
        // Check if therapist_session_id exists (null means degraded mode)
        if (!session.therapist_session_id) {
          this.logger.warn(
            `Session ${sessionId} created in degraded mode (no therapist_session_id). ` +
            `Attempting to initialize Python session now...`
          );
          
          // Try to initialize Python session now
          try {
            const SessionModelForHistory = tenantConnection.model(StudentCaseSession.name, StudentCaseSessionSchema);
            const patientSession = await SessionModelForHistory.findOne({
              student_id: new Types.ObjectId(user.id),
              case_id: session.case_id,
              session_type: SessionTypeEnum.PATIENT_INTERVIEW,
              status: SessionStatusEnum.COMPLETED,
            })
              .sort({ ended_at: -1 })
              .lean();

            const sessionHistory = patientSession?.messages || [];
            
            const pythonResponse = await this.pythonService.initializeTherapistSession(
              session.case_id.toString(),
              sessionHistory,
              { student_id: user.id },
            );
            
            // Update session with therapist_session_id
            session.therapist_session_id = pythonResponse.session_id;
            this.logger.log(`✅ Python backend recovered! Session ${sessionId} now has therapist_session_id: ${pythonResponse.session_id}`);
          } catch (error) {
            this.logger.error(`Failed to initialize Python therapist session on message send: ${error.message}`);
            throw new BadRequestException(
              'AI therapist consultation is temporarily unavailable. ' +
              'The AI backend is currently down or restarting. ' +
              'Please try again in a few moments, or contact support if the issue persists.'
            );
          }
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

      // Detect and save techniques learned in this exchange
      if (aiResponse && session.session_type === SessionTypeEnum.PATIENT_INTERVIEW) {
        const userIdStr = typeof user.id === 'string' ? user.id : user.id.toString();
        await this.detectAndSaveTechniques(
          session.internship_id.toString(),
          userIdStr,
          message,
          aiResponse,
        );
      }

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

            // NEW: Track patient session for Steps 2-3 (patient evolution)
            if (caseData.step >= 2 && caseData.patient_base_id && feedbackResult) {
              try {
                const userIdStr = typeof user.id === 'string' ? user.id : user.id.toString();
                await this.pythonService.trackPatientSession({
                  internship_id: session.internship_id.toString(),
                  user_id: userIdStr,
                  patient_base_id: caseData.patient_base_id,
                  case_id: session.case_id.toString(),
                  step: caseData.step,
                  sequence_in_step: caseData.sequence_in_step,
                  emdr_phase_focus: caseData.emdr_phase_focus || undefined,
                  patient_state_before: caseData.patient_state || {
                    current_sud: null,
                    current_voc: null,
                    safe_place_established: false,
                    trauma_targets_resolved: [],
                    techniques_mastered: [],
                    progress_trajectory: null,
                  },
                  patient_state_after: this.extractPatientStateFromSession(session, feedbackResult),
                  student_performance: {
                    score: feedbackResult.ai_feedback.overall_score,
                    pass_fail: feedbackResult.ai_feedback.pass_fail || 
                      (feedbackResult.ai_feedback.overall_score >= (caseData.pass_threshold || 70) ? 'PASS' : 'FAIL'),
                  },
                  session_narrative: this.generateSessionNarrative(session, caseData),
                });

                this.logger.log(
                  `📊 Patient session tracked for ${caseData.patient_base_id} (Step ${caseData.step})`,
                );
              } catch (error) {
                this.logger.warn('Failed to track patient session', error);
                // Don't fail completion if tracking fails
              }
            }
          }
        }
      } catch (error) {
        this.logger.error('Failed to auto-generate feedback', error?.stack || error);
        // Don't fail the completion if feedback generation fails
        // The user can manually generate feedback later
      }

      // Save session summary to cross-session memory
      try {
        const sessionDuration = session.total_active_time_seconds 
          ? Math.floor(session.total_active_time_seconds / 60)
          : Math.floor(
              (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000
            );

        const keyActivities = this.extractKeyActivities(session.messages);
        const studentSkills = feedbackResult?.ai_feedback?.strengths 
          ? this.extractSkills(feedbackResult.ai_feedback.strengths)
          : [];

        const userIdStr = typeof user.id === 'string' ? user.id : user.id.toString();
        await this.pythonService.saveSessionSummary({
          internship_id: session.internship_id.toString(),
          user_id: userIdStr,
          session_summary: {
            session_number: session.session_number,
            session_type: session.session_type,
            duration_minutes: sessionDuration,
            key_activities: keyActivities,
            outcomes: feedbackResult?.ai_feedback?.overall_score 
              ? `Session completed with score ${feedbackResult.ai_feedback.overall_score}/100`
              : 'Session completed',
            student_skills_demonstrated: studentSkills,
            feedback_highlights: feedbackResult?.ai_feedback
              ? `Score: ${feedbackResult.ai_feedback.overall_score}/100. ` +
                `${feedbackResult.ai_feedback.strengths?.length || 0} strengths, ` +
                `${feedbackResult.ai_feedback.areas_for_improvement?.length || 0} areas to improve.`
              : 'Feedback pending',
          },
        });

        this.logger.log(
          `Session summary saved to cross-session memory: session ${session.session_number}`,
        );
      } catch (error) {
        this.logger.warn('Failed to save session summary to memory', error);
        // Don't fail completion if memory save fails
      }

      // Update student progress
      await this.updateStudentProgress(
        session.student_id,
        session.internship_id,
        tenantConnection,
      );

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
   * Get cross-session memory for student's progress tracking
   */
  async getInternshipMemory(internshipId: string, user: JWTUserPayload) {
    const userIdStr = typeof user.id === 'string' ? user.id : user.id.toString();
    this.logger.log(`Getting memory for internship: ${internshipId}, user: ${userIdStr}`);

    try {
      const memory = await this.pythonService.getInternshipMemory(
        internshipId,
        userIdStr,
      );

      // Optional: Sync memory to MongoDB for backup (non-blocking)
      if (memory.found && memory.memory) {
        this.syncMemoryToDatabase(internshipId, userIdStr, memory.memory).catch(err => {
          this.logger.warn('Failed to sync memory to database (non-critical)', err);
        });
      }

      if (memory.found) {
        return {
          message: 'Memory retrieved successfully',
          data: memory.memory,
        };
      } else {
        return {
          message: 'No previous sessions found',
          data: null,
        };
      }
    } catch (error) {
      this.logger.error('Error retrieving memory', error?.stack || error);
      throw new BadRequestException('Failed to retrieve memory');
    }
  }

  /**
   * Sync memory to MongoDB for backup (optional, non-blocking)
   */
  private async syncMemoryToDatabase(
    internshipId: string,
    userId: string,
    memoryData: any,
  ): Promise<void> {
    try {
      // Note: This requires InternshipMemory model to be injected
      // For now, just log - you can implement full sync later if needed
      this.logger.debug(
        `Memory sync to DB: internship=${internshipId}, user=${userId}, ` +
        `sessions=${memoryData.total_sessions}`,
      );
      
      // TODO: Implement full database sync if needed:
      // const MemoryModel = tenantConnection.model(InternshipMemory.name, InternshipMemorySchema);
      // await MemoryModel.findOneAndUpdate(
      //   { internship_id: new Types.ObjectId(internshipId), user_id: userId },
      //   { memory_snapshot: memoryData, last_synced_at: new Date() },
      //   { upsert: true }
      // );
    } catch (error) {
      this.logger.warn('Memory sync failed (non-critical)', error);
    }
  }

  /**
   * Detect and save techniques learned during session
   */
  private async detectAndSaveTechniques(
    internshipId: string,
    userId: string,
    studentMessage: string,
    patientResponse: string,
  ): Promise<void> {
    try {
      const combinedText = `${studentMessage} ${patientResponse}`.toLowerCase();

      // Detect safe place installation (EMDR technique)
      if (
        combinedText.includes('lieu sûr') ||
        combinedText.includes('safe place') ||
        combinedText.includes('endroit sûr') ||
        combinedText.includes('lieu de sécurité')
      ) {
        // Try to extract safe place description from patient response
        const safePlacePatterns = [
          /(?:plage|forêt|jardin|montagne|chambre|maison|lac|rivière|océan|nature)[^.!?]{0,100}[.!?]/i,
          /je (?:vois|imagine|visualise)[^.!?]{10,100}[.!?]/i,
          /c'est (?:un|une)[^.!?]{10,100}[.!?]/i,
        ];

        let safePlaceDetails: string | null = null;
        for (const pattern of safePlacePatterns) {
          const match = patientResponse.match(pattern);
          if (match) {
            safePlaceDetails = match[0].trim();
            break;
          }
        }

        if (safePlaceDetails) {
          this.logger.log(`Detected safe place: ${safePlaceDetails.substring(0, 50)}...`);
          await this.pythonService.updatePatientMemory({
            internship_id: internshipId,
            user_id: userId,
            technique_learned: 'safe_place',
            safe_place_details: safePlaceDetails,
          });
        } else {
          // Just mark that safe place was discussed
          await this.pythonService.updatePatientMemory({
            internship_id: internshipId,
            user_id: userId,
            technique_learned: 'safe_place',
          });
        }
      }

      // Detect container technique (EMDR)
      if (
        combinedText.includes('container') ||
        combinedText.includes('coffre') ||
        combinedText.includes('boîte') ||
        combinedText.includes('conteneur')
      ) {
        this.logger.log('Detected container technique');
        await this.pythonService.updatePatientMemory({
          internship_id: internshipId,
          user_id: userId,
          technique_learned: 'container',
        });
      }

      // Detect trauma target identification
      if (
        combinedText.includes('cible') ||
        combinedText.includes('target') ||
        combinedText.includes('image perturbante') ||
        combinedText.includes('souvenir traumatique')
      ) {
        // Try to extract SUD level
        const sudMatch = combinedText.match(/(?:sud|échelle)[^\d]*(\d+)/i);
        if (sudMatch) {
          const sudLevel = parseInt(sudMatch[1], 10);
          if (sudLevel >= 0 && sudLevel <= 10) {
            this.logger.log(`Detected trauma target with SUD level: ${sudLevel}`);
            await this.pythonService.updatePatientMemory({
              internship_id: internshipId,
              user_id: userId,
              sud_level: sudLevel,
            });
          }
        }

        // Mark that trauma target work was done
        await this.pythonService.updatePatientMemory({
          internship_id: internshipId,
          user_id: userId,
          technique_learned: 'trauma_target_identification',
        });
      }

      // Detect bilateral stimulation (BLS)
      if (
        combinedText.includes('stimulation bilatérale') ||
        combinedText.includes('sba') ||
        combinedText.includes('bilateral stimulation') ||
        combinedText.includes('mouvements oculaires') ||
        combinedText.includes('eye movement')
      ) {
        // Try to detect BLS type preference
        let blsPreference: string | undefined = undefined;
        if (combinedText.includes('visuel') || combinedText.includes('yeux') || combinedText.includes('eye')) {
          blsPreference = 'visual';
        } else if (combinedText.includes('auditif') || combinedText.includes('son') || combinedText.includes('auditory')) {
          blsPreference = 'auditory';
        } else if (combinedText.includes('tactile') || combinedText.includes('tapping')) {
          blsPreference = 'tactile';
        }

        this.logger.log(`Detected BLS technique${blsPreference ? ` (${blsPreference})` : ''}`);
        const updatePayload: any = {
          internship_id: internshipId,
          user_id: userId,
          technique_learned: 'bilateral_stimulation',
        };
        if (blsPreference) {
          updatePayload.bls_preference = blsPreference;
        }
        await this.pythonService.updatePatientMemory(updatePayload);
      }

      // Detect resource installation
      if (
        combinedText.includes('ressource') ||
        combinedText.includes('resource') ||
        combinedText.includes('renforcement positif')
      ) {
        this.logger.log('Detected resource installation technique');
        await this.pythonService.updatePatientMemory({
          internship_id: internshipId,
          user_id: userId,
          technique_learned: 'resource_installation',
        });
      }

      // Detect desensitization phase
      if (
        combinedText.includes('désensibilisation') ||
        combinedText.includes('desensitization') ||
        combinedText.includes('retraitement') ||
        combinedText.includes('reprocessing')
      ) {
        this.logger.log('Detected desensitization/reprocessing technique');
        await this.pythonService.updatePatientMemory({
          internship_id: internshipId,
          user_id: userId,
          technique_learned: 'desensitization',
        });
      }
    } catch (error) {
      // Log error but don't throw - technique detection is optional
      this.logger.warn('Error detecting techniques', error);
    }
  }

  /**
   * Extract key activities from conversation history
   */
  private extractKeyActivities(messages: any[]): string[] {
    const activities: string[] = [];
    const fullText = messages.map(m => m.content).join(' ').toLowerCase();

    // EMDR techniques
    if (fullText.includes('lieu sûr') || fullText.includes('safe place')) {
      activities.push('safe_place_installation');
    }
    if (fullText.includes('sba') || fullText.includes('stimulation bilatérale') || fullText.includes('bilateral')) {
      activities.push('bilateral_stimulation');
    }
    if (fullText.includes('cible') || fullText.includes('target')) {
      activities.push('trauma_target_identification');
    }
    if (fullText.includes('désensibilisation') || fullText.includes('desensitization')) {
      activities.push('trauma_desensitization');
    }
    if (fullText.includes('container') || fullText.includes('coffre')) {
      activities.push('container_technique');
    }
    if (fullText.includes('ressource') || fullText.includes('resource')) {
      activities.push('resource_installation');
    }

    // General clinical skills
    if (fullText.includes('rapport') || fullText.includes('alliance')) {
      activities.push('therapeutic_alliance_building');
    }
    if (fullText.includes('évaluation') || fullText.includes('assessment')) {
      activities.push('clinical_assessment');
    }
    if (fullText.includes('histoire') || fullText.includes('anamnèse') || fullText.includes('history')) {
      activities.push('patient_history_taking');
    }

    // Default if nothing specific detected
    if (activities.length === 0) {
      activities.push('clinical_interview');
    }

    return activities;
  }

  /**
   * Extract skill names from feedback strengths
   */
  private extractSkills(strengths: any[]): string[] {
    if (!Array.isArray(strengths)) {
      return [];
    }

    const skills: string[] = [];
    
    for (const strength of strengths) {
      if (typeof strength === 'string') {
        // Simple string strength
        const skillName = strength.toLowerCase()
          .replace(/[^a-z0-9_\s]/g, '')
          .replace(/\s+/g, '_')
          .substring(0, 50);
        skills.push(skillName);
      } else if (strength.category) {
        // Structured strength with category
        skills.push(strength.category);
      } else if (strength.skill) {
        skills.push(strength.skill);
      } else if (strength.area) {
        skills.push(strength.area);
      }
    }

    return skills.filter(Boolean);
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
    const SessionModel = tenantConnection.model(
      StudentCaseSession.name,
      StudentCaseSessionSchema,
    );

    try {
      // Count total cases for this internship
      const totalCases = await InternshipCaseModel.countDocuments({
        internship_id: internshipId,
        deleted_at: null,
      });

      // Count completed cases (cases with completed sessions OR validated feedback)
      // OPTION 1: Count cases with validated feedback
      const completedFeedbacks = await FeedbackModel.find({
        student_id: studentId,
        status: { $in: [FeedbackStatusEnum.VALIDATED, FeedbackStatusEnum.REVISED] },
      }).distinct('case_id');

      // OPTION 2: Count cases with at least one completed session (as fallback)
      const completedSessionCases = await SessionModel.find({
        student_id: studentId,
        status: { $in: [SessionStatusEnum.COMPLETED, SessionStatusEnum.PENDING_VALIDATION] },
        deleted_at: null,
      }).distinct('case_id');

      // Merge both lists (use Set to avoid duplicates)
      const allCompletedCaseIds = [
        ...new Set([
          ...completedFeedbacks.map(id => id.toString()),
          ...completedSessionCases.map(id => id.toString())
        ])
      ].map(id => new Types.ObjectId(id));

      // Filter completed cases to only count cases belonging to this internship
      const completedCasesForInternship = await InternshipCaseModel.countDocuments({
        _id: { $in: allCompletedCaseIds },
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

      // Check if Python session still exists (for patient interviews)
      if (session.session_type === SessionTypeEnum.PATIENT_INTERVIEW && session.patient_session_id) {
        try {
          // Try to get session health by fetching memory (if this fails, session is dead)
          const internshipIdStr = session.internship_id.toString();
          const userIdStr = typeof user.id === 'string' ? user.id : user.id.toString();
          await this.pythonService.getInternshipMemory(internshipIdStr, userIdStr);
          
          this.logger.log(`Python session ${session.patient_session_id} is still active`);
        } catch (error) {
          this.logger.warn(
            `Python session ${session.patient_session_id} may have expired. Re-initializing...`
          );
          
          // Re-initialize Python session with conversation history
          try {
            const CaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);
            const caseData = await CaseModel.findById(session.case_id);
            
            if (caseData?.patient_simulation_config) {
              const normalizedConfig = normalizePatientSimulationConfig(
                caseData.patient_simulation_config
              );
              
              const scenarioConfig: Record<string, any> = {
                scenario_type: normalizedConfig.scenario_type,
                difficulty_level: normalizedConfig.difficulty_level,
                interview_focus: normalizedConfig.interview_focus || 'assessment_and_diagnosis',
                patient_openness: normalizedConfig.patient_openness || 'moderately_forthcoming',
              };
              
              const internshipIdStr = session.internship_id.toString();
              const userIdStr = typeof user.id === 'string' ? user.id : user.id.toString();
              
              const pythonResponse = await this.pythonService.initializePatientSession(
                session.case_id.toString(),
                caseData.patient_simulation_config.patient_profile,
                scenarioConfig,
                internshipIdStr,
                userIdStr,
              );
              
              // Update session with new patient_session_id
              session.patient_session_id = pythonResponse.session_id;
              
              this.logger.log(
                `✅ Python session re-initialized successfully: ${pythonResponse.session_id}`
              );
            }
          } catch (reInitError) {
            this.logger.error(`Failed to re-initialize Python session: ${reInitError.message}`);
            throw new BadRequestException(
              'Failed to resume session. The AI backend session has expired. ' +
              'Your conversation history has been preserved. Please try resuming again, ' +
              'and if the issue persists, you may need to close and create a new session.'
            );
          }
        }
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

  /**
   * NEW: Extract patient state from completed session (for Steps 2-3 tracking)
   */
  private extractPatientStateFromSession(session: any, feedbackResult: any): any {
    const messages = session.messages || [];
    const fullText = messages.map(m => m.content).join(' ').toLowerCase();

    // Extract SUD level from conversation
    let extractedSUD: number | null = null;
    const sudMatches = fullText.match(/sud[^\d]*(\d+)/gi);
    if (sudMatches && sudMatches.length > 0) {
      // Get the last mentioned SUD (most recent state)
      const lastSudMatch = sudMatches[sudMatches.length - 1].match(/\d+/);
      if (lastSudMatch) {
        extractedSUD = parseInt(lastSudMatch[0], 10);
      }
    }

    // Extract VOC level from conversation
    let extractedVOC: number | null = null;
    const vocMatches = fullText.match(/voc[^\d]*(\d+)/gi);
    if (vocMatches && vocMatches.length > 0) {
      const lastVocMatch = vocMatches[vocMatches.length - 1].match(/\d+/);
      if (lastVocMatch) {
        extractedVOC = parseInt(lastVocMatch[0], 10);
      }
    }

    // Check if safe place was established
    const safePlaceEstablished =
      fullText.includes('lieu sûr') ||
      fullText.includes('safe place') ||
      fullText.includes('endroit sûr');

    // Identify techniques used in this session
    const techniquesMastered: string[] = [];
    if (fullText.includes('anamnèse') || fullText.includes('anamnesis')) {
      techniquesMastered.push('anamnesis');
    }
    if (safePlaceEstablished) {
      techniquesMastered.push('safe_place');
    }
    if (fullText.includes('sba') || fullText.includes('stimulation bilatérale')) {
      techniquesMastered.push('bilateral_stimulation');
    }
    if (fullText.includes('body scan') || fullText.includes('balayage corporel')) {
      techniquesMastered.push('body_scan');
    }
    if (fullText.includes('container') || fullText.includes('coffre')) {
      techniquesMastered.push('container');
    }

    return {
      current_sud: extractedSUD,
      current_voc: extractedVOC,
      safe_place_established: safePlaceEstablished,
      trauma_targets_resolved: [], // TODO: Extract from conversation
      techniques_mastered: techniquesMastered,
      progress_trajectory: this.determineProgressTrajectory(extractedSUD, extractedVOC),
    };
  }

  /**
   * NEW: Determine progress trajectory based on SUD/VOC values
   */
  private determineProgressTrajectory(sud: number | null, voc: number | null): string | null {
    if (sud === null && voc === null) return null;

    if (sud !== null && sud <= 2) return 'breakthrough';
    if (sud !== null && sud >= 7) return 'regression';
    if (voc !== null && voc >= 6) return 'improvement';
    
    return 'stable';
  }

  /**
   * NEW: Generate narrative for session (for Steps 2-3)
   */
  private generateSessionNarrative(session: any, caseData: any): string {
    const messages = session.messages || [];
    const techniques = this.extractKeyActivities(messages);
    
    let narrative = `Session ${session.session_number} with ${caseData.patient_simulation_config?.patient_profile?.name || 'patient'}. `;
    
    if (caseData.emdr_phase_focus) {
      narrative += `Focus: ${caseData.emdr_phase_focus}. `;
    }
    
    if (techniques.length > 0) {
      narrative += `Techniques: ${techniques.slice(0, 3).join(', ')}. `;
    }
    
    const duration = Math.floor(
      (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000
    );
    narrative += `Duration: ${duration} minutes.`;
    
    return narrative;
  }

  /**
   * Determine current EMDR phase from conversation history and memory
   */
  private determineCurrentEMDRPhase(messages: any[], memory: any): string {
    const recentMessages = messages.slice(-10); // Last 10 messages
    const messageContent = recentMessages
      .map(m => m.content.toLowerCase())
      .join(' ');
    
    // Phase 8: Reevaluation (if checking progress from previous sessions)
    if (memory?.total_sessions > 1 && messages.length < 5) {
      return 'reevaluation';
    }
    
    // Phase 5: Installation (VoC, positive cognition)
    if (
      messageContent.includes('cognition positive') ||
      messageContent.includes('positive cognition') ||
      messageContent.includes('voc') ||
      messageContent.includes('validity') ||
      messageContent.includes('validité')
    ) {
      return 'installation';
    }
    
    // Phase 6: Body Scan
    if (
      messageContent.includes('body scan') ||
      messageContent.includes('sensation corporelle') ||
      messageContent.includes('balayage corporel') ||
      messageContent.includes('scan corporel')
    ) {
      return 'body_scan';
    }
    
    // Phase 7: Closure
    if (
      messageContent.includes('clôture') ||
      messageContent.includes('closure') ||
      messageContent.includes('fin de séance') ||
      messageContent.includes('end session')
    ) {
      return 'closure';
    }
    
    // Phase 4: Desensitization (BLS, trauma reprocessing)
    if (
      messageContent.includes('sba') ||
      messageContent.includes('stimulation') ||
      messageContent.includes('désensibilisation') ||
      messageContent.includes('desensitization') ||
      messageContent.includes('retraitement') ||
      messageContent.includes('reprocessing') ||
      messageContent.includes('bilateral') ||
      messageContent.includes('what do you notice') ||
      messageContent.includes('que remarquez-vous') ||
      memory?.patient_memory?.techniques_learned?.includes('bilateral_stimulation')
    ) {
      return 'desensitization';
    }
    
    // Phase 3: Assessment (SUD, target identification)
    if (
      messageContent.includes('sud') ||
      messageContent.includes('cible') ||
      messageContent.includes('target') ||
      messageContent.includes('souvenir traumatique') ||
      messageContent.includes('traumatic memory') ||
      messageContent.includes('échelle') ||
      memory?.patient_memory?.trauma_targets?.length > 0
    ) {
      return 'assessment';
    }
    
    // Phase 2: Preparation (safe place, resources)
    if (
      messageContent.includes('lieu sûr') ||
      messageContent.includes('safe place') ||
      messageContent.includes('ressource') ||
      messageContent.includes('resource') ||
      messageContent.includes('container') ||
      messageContent.includes('coffre') ||
      memory?.patient_memory?.techniques_learned?.includes('safe_place')
    ) {
      return 'preparation';
    }
    
    // Phase 1: Anamnesis (history taking, rapport building)
    // Default for new sessions
    return 'anamnesis';
  }
}

