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
  CaseFeedbackLog,
  CaseFeedbackLogSchema,
} from 'src/database/schemas/tenant/case-feedback-log.schema';
import {
  StudentCaseSession,
  StudentCaseSessionSchema,
} from 'src/database/schemas/tenant/student-case-session.schema';
import {
  InternshipCase,
  InternshipCaseSchema,
} from 'src/database/schemas/tenant/internship-case.schema';
import {
  Student,
  StudentSchema,
} from 'src/database/schemas/tenant/student.schema';
import {
  StudentInternshipProgress,
  StudentInternshipProgressSchema,
} from 'src/database/schemas/tenant/student-internship-progress.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { ValidateFeedbackDto } from './dto/validate-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { DEFAULT_LANGUAGE } from 'src/common/constants/language.constant';
import {
  FeedbackTypeEnum,
  FeedbackStatusEnum,
  SessionStatusEnum,
} from 'src/common/constants/internship.constant';
import { ProgressStatusEnum } from 'src/common/constants/status.constant';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { PythonInternshipService } from './python-internship.service';
import { InternshipStageTrackingService } from './internship-stage-tracking.service';
import { InternshipCaseAttemptsService } from './internship-case-attempts.service'; // NEW
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  getPaginationOptions,
  createPaginationResult,
} from 'src/common/utils/pagination.util';

@Injectable()
export class InternshipFeedbackService {
  private readonly logger = new Logger(InternshipFeedbackService.name);

  constructor(
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly errorMessageService: ErrorMessageService,
    private readonly pythonService: PythonInternshipService,
    private readonly stageTrackingService: InternshipStageTrackingService,
    private readonly caseAttemptsService: InternshipCaseAttemptsService, // NEW
  ) {}

  /**
   * Generate COMPREHENSIVE AI ASSESSMENT for a completed session
   * NEW: Uses comprehensive assessment endpoint with full conversation history
   */
  async generateFeedback(sessionId: string, user: JWTUserPayload) {
    this.logger.log(`🎯 Generating comprehensive assessment for session: ${sessionId}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const SessionModel = tenantConnection.model(StudentCaseSession.name, StudentCaseSessionSchema);
    const FeedbackModel = tenantConnection.model(CaseFeedbackLog.name, CaseFeedbackLogSchema);
    const CaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);

    try {
      // Find session
      const query: any = {
        _id: new Types.ObjectId(sessionId),
        deleted_at: null,
      };
      
      // If user is a student, restrict to their own sessions
      if (user.role.name === 'STUDENT') {
        query.student_id = new Types.ObjectId(user.id);
      }
      
      const session = await SessionModel.findOne(query);

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      if (session.status !== SessionStatusEnum.COMPLETED) {
        throw new BadRequestException('Session must be completed before generating feedback');
      }

      // Check if feedback already exists
      const existingFeedback = await FeedbackModel.findOne({
        session_id: new Types.ObjectId(sessionId),
      });

      if (existingFeedback) {
        this.logger.log(`Feedback already exists for session ${sessionId}`);
        return {
          message: 'Feedback already exists',
          data: existingFeedback,
        };
      }

      // Get case details with NEW comprehensive fields
      const caseData = await CaseModel.findOne({
        _id: session.case_id,
        deleted_at: null,
      });

      if (!caseData) {
        throw new NotFoundException('Case not found');
      }

      // Calculate session duration in minutes
      const sessionStartTime = session.started_at || session.created_at;
      const sessionEndTime = session.ended_at || new Date();
      const durationMs = new Date(sessionEndTime).getTime() - new Date(sessionStartTime).getTime();
      const sessionDurationMinutes = Math.floor(durationMs / 60000);

      this.logger.log(
        `📊 Session duration: ${sessionDurationMinutes} min, Messages: ${session.messages.length}`
      );

      // NEW: Get student's attempt history for this case
      const attemptHistory = await this.caseAttemptsService.getAttemptHistory(
        school.db_name,
        session.student_id,
        session.case_id,
      );

      // NEW: Get cross-session memory
      const userIdStr = session.student_id.toString();
      const internshipIdStr = session.internship_id.toString();
      const memoryResponse = await this.pythonService.getInternshipMemory(
        internshipIdStr,
        userIdStr,
      );

      const previousAttempts = attemptHistory.attempts.map(attempt => ({
        attempt_number: attempt.attempt_number,
        score: attempt.assessment_score,
        key_mistakes: attempt.mistakes_made,
        date: attempt.completed_at,
      }));

      const crossSessionMemory = memoryResponse.found && memoryResponse.memory
        ? {
            total_sessions: memoryResponse.memory.total_sessions || 0,
            techniques_learned: memoryResponse.memory.patient_memory?.techniques_learned || [],
            strengths_so_far: memoryResponse.memory.student_progress?.areas_of_strength || [],
            improvement_areas: memoryResponse.memory.student_progress?.areas_for_improvement || [],
            average_score:
              memoryResponse.memory.student_progress &&
              (memoryResponse.memory.student_progress as any).assessment_history &&
              Array.isArray((memoryResponse.memory.student_progress as any).assessment_history) &&
              (memoryResponse.memory.student_progress as any).assessment_history.length > 0
                ? Math.round(
                    (memoryResponse.memory.student_progress as any).assessment_history.reduce(
                      (sum: number, a: any) => sum + a.score,
                      0,
                    ) / (memoryResponse.memory.student_progress as any).assessment_history.length,
                  )
                : 0,
          }
        : {
            total_sessions: 0,
            techniques_learned: [],
            strengths_so_far: [],
            improvement_areas: [],
            average_score: 0,
          };

      this.logger.log(
        `📚 Student history: ${previousAttempts.length} previous attempts, ` +
        `${crossSessionMemory.total_sessions} total sessions`
      );

      // NEW: Use assessment_criteria (or fallback to evaluation_criteria for backward compat)
      // IMPORTANT: Convert null to empty strings for Python API validation
      // Explicitly map only the fields we need (avoid MongoDB _id, etc.)
      const assessmentCriteria = caseData.assessment_criteria && caseData.assessment_criteria.length > 0
        ? caseData.assessment_criteria.map((criterion: any) => ({
            criterion_id: criterion.criterion_id || '',
            name: criterion.name || '',
            description: criterion.description || '',
            max_points: criterion.max_points || 0,
            reference_literature: criterion.reference_literature || '',
            ko_example: criterion.ko_example || '',
            ok_example: criterion.ok_example || '',
          }))
        : (caseData.evaluation_criteria || []).map(criterion => ({
            criterion_id: criterion.criterion.toLowerCase().replace(/\s+/g, '_'),
            name: criterion.criterion,
            description: `Évaluation de ${criterion.criterion}`,
            max_points: criterion.weight,
            reference_literature: '',
            ko_example: '',
            ok_example: '',
          }));

      // NEW: Call comprehensive assessment endpoint
      this.logger.log(`🚀 Calling comprehensive assessment endpoint...`);
      this.logger.debug(
        `📋 Assessment criteria count: ${assessmentCriteria.length}, ` +
        `first criterion: ${JSON.stringify(assessmentCriteria[0])}`
      );
      
      const comprehensiveAssessment = await this.pythonService.generateComprehensiveAssessment(
        session.case_id.toString(),
        {
          step: caseData.step,
          case_type: caseData.case_type,
          student_id: userIdStr,
          internship_id: internshipIdStr,
          session_data: {
            session_number: session.session_number,
            duration_minutes: sessionDurationMinutes,
            full_conversation: session.messages,
            started_at: session.started_at,
            ended_at: session.ended_at,
          },
          assessment_criteria: assessmentCriteria,
          literature_references: caseData.literature_references || [],
          student_history: {
            previous_attempts_this_case: previousAttempts,
            cross_session_memory: crossSessionMemory,
          },
          patient_base: {
            name: caseData.patient_simulation_config?.patient_profile?.name || 'Patient',
            age: caseData.patient_simulation_config?.patient_profile?.age || null,
            trauma_summary: caseData.patient_simulation_config?.patient_profile?.trauma_summary || '',
            key_symptoms: caseData.patient_simulation_config?.patient_profile?.key_symptoms || [],
            current_sud_voc: caseData.patient_simulation_config?.patient_profile?.current_sud_voc || {},
          },
        },
      );

      this.logger.log(
        `✅ Assessment generated: ${comprehensiveAssessment.overall_score}/100 (${comprehensiveAssessment.pass_fail})`
      );

      // NEW: Create comprehensive feedback log
      const feedbackData = {
        student_id: session.student_id,
        case_id: session.case_id,
        session_id: new Types.ObjectId(sessionId),
        feedback_type: FeedbackTypeEnum.AUTO_GENERATED,
        ai_feedback: {
          overall_score: comprehensiveAssessment.overall_score,
          grade: comprehensiveAssessment.grade,
          pass_fail: comprehensiveAssessment.pass_fail,
          pass_threshold: comprehensiveAssessment.pass_threshold || caseData.pass_threshold || 70,
          criteria_scores: comprehensiveAssessment.criteria_scores || [],
          strengths: comprehensiveAssessment.strengths || [],
          areas_for_improvement: comprehensiveAssessment.areas_for_improvement || [],
          recommendations_next_session: comprehensiveAssessment.recommendations_next_session || [],
          evolution_vs_previous_attempts: comprehensiveAssessment.evolution_vs_previous_attempts || null,
          literature_adherence: comprehensiveAssessment.literature_adherence || {},
          // Keep old fields for backward compatibility
          technical_assessment: comprehensiveAssessment.technical_assessment || {},
          communication_assessment: comprehensiveAssessment.communication_assessment || {},
          clinical_reasoning: comprehensiveAssessment.clinical_reasoning || {},
          generated_at: new Date(),
        },
        professor_feedback: {},
        status: FeedbackStatusEnum.PENDING_VALIDATION,
      };

      const newFeedback = new FeedbackModel(feedbackData);
      const savedFeedback = await newFeedback.save();

      // Update session status to pending validation
      session.status = SessionStatusEnum.PENDING_VALIDATION;
      await session.save();

      // NEW: Track this attempt in InternshipCaseAttemptsService
      try {
        await this.caseAttemptsService.trackAttempt(
          school.db_name,
          session.student_id,
          session.case_id,
          session.internship_id,
          session._id,
          savedFeedback._id,
          {
            score: comprehensiveAssessment.overall_score,
            grade: comprehensiveAssessment.grade,
            pass_fail: comprehensiveAssessment.pass_fail as 'PASS' | 'FAIL',
            pass_threshold: comprehensiveAssessment.pass_threshold || caseData.pass_threshold || 70,
            key_learnings: comprehensiveAssessment.strengths || [],
            mistakes_made: comprehensiveAssessment.areas_for_improvement || [],
            strengths: comprehensiveAssessment.strengths || [],
            areas_for_improvement: comprehensiveAssessment.areas_for_improvement || [],
          },
        );
        this.logger.log(`📝 Attempt tracked successfully`);
      } catch (error) {
        this.logger.error(`Failed to track attempt: ${error.message}`);
        // Don't fail feedback generation if attempt tracking fails
      }

      // NEW: Save assessment to memory
      try {
        await this.pythonService.saveAssessmentToMemory({
          internship_id: internshipIdStr,
          user_id: userIdStr,
          case_id: session.case_id.toString(),
          step: caseData.step,
          assessment_result: comprehensiveAssessment,
        });
        this.logger.log(`💾 Assessment saved to memory`);
      } catch (error) {
        this.logger.error(`Failed to save assessment to memory: ${error.message}`);
        // Don't fail feedback generation if memory save fails
      }

      // Auto-update stage progress
      try {
        await this.stageTrackingService.autoUpdateStageProgress(
          session.student_id.toString(),
          session.internship_id.toString(),
          session.case_id.toString(),
          sessionId,
          school.db_name,
        );
        this.logger.log(`📈 Stage progress auto-updated`);
      } catch (error) {
        this.logger.error(`Failed to auto-update stage progress: ${error.message}`);
        // Don't fail the feedback generation if stage tracking fails
      }

      this.logger.log(`✅ Comprehensive assessment complete: ${savedFeedback._id}`);

      return {
        message: 'Comprehensive assessment generated successfully',
        data: savedFeedback,
        attempt_number: attemptHistory.total_attempts + 1,
        best_score: Math.max(attemptHistory.best_score, comprehensiveAssessment.overall_score),
      };
    } catch (error) {
      this.logger.error('❌ Error generating comprehensive assessment', error?.stack || error);
      throw new BadRequestException(`Failed to generate assessment: ${error.message}`);
    }
  }

  /**
   * Get all pending feedback for validation (Professor/Admin)
   */
  async getPendingFeedback(user: JWTUserPayload, paginationDto?: PaginationDto) {
    this.logger.log(`Getting pending feedback for school: ${user.school_id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    
    // Register models on tenant connection for populate to work
    const FeedbackModel = tenantConnection.model(CaseFeedbackLog.name, CaseFeedbackLogSchema);
    tenantConnection.model(Student.name, StudentSchema);
    tenantConnection.model(InternshipCase.name, InternshipCaseSchema);

    try {
      const paginationOptions = getPaginationOptions(paginationDto || {});
      
      const query = {
        status: FeedbackStatusEnum.PENDING_VALIDATION,
      };

      const total = await FeedbackModel.countDocuments(query);

      const feedbacks = await FeedbackModel.find(query)
        .sort({ created_at: -1 })
        .skip(paginationOptions.skip)
        .limit(paginationOptions.limit)
        .populate('student_id', 'first_name last_name email')
        .populate('case_id', 'title description')
        .lean();

      const result = createPaginationResult(feedbacks, total, paginationOptions);

      return {
        message: 'Pending feedback retrieved successfully',
        data: result.data,
        pagination_data: result.pagination_data,
      };
    } catch (error) {
      this.logger.error('Error getting pending feedback', error?.stack || error);
      throw new BadRequestException('Failed to retrieve pending feedback');
    }
  }

  /**
   * Validate feedback (Professor/Admin)
   */
  async validateFeedback(
    feedbackId: string,
    validateDto: ValidateFeedbackDto,
    user: JWTUserPayload,
  ) {
    this.logger.log(`Validating feedback: ${feedbackId} by user: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const FeedbackModel = tenantConnection.model(CaseFeedbackLog.name, CaseFeedbackLogSchema);

    try {
      const feedback = await FeedbackModel.findOne({
        _id: new Types.ObjectId(feedbackId),
      });

      if (!feedback) {
        throw new NotFoundException('Feedback not found');
      }

      // Update feedback with professor validation
      feedback.professor_feedback = {
        validated_by: new Types.ObjectId(user.id),
        is_approved: validateDto.is_approved,
        professor_comments: validateDto.professor_comments || null,
        edited_score: validateDto.edited_score || feedback.ai_feedback.overall_score,
        validation_date: new Date(),
      };

      feedback.status = FeedbackStatusEnum.VALIDATED;
      feedback.feedback_type = validateDto.is_approved
        ? FeedbackTypeEnum.PROFESSOR_VALIDATED
        : FeedbackTypeEnum.PROFESSOR_EDITED;

      await feedback.save();

      // Update student progress after validation
      const CaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);
      const caseData = await CaseModel.findById(feedback.case_id);
      if (caseData) {
        await this.updateStudentProgress(
          feedback.student_id,
          caseData.internship_id,
          tenantConnection,
        );
      }

      return {
        message: 'Feedback validated successfully',
        data: feedback,
      };
    } catch (error) {
      this.logger.error('Error validating feedback', error?.stack || error);
      
      // Provide more specific error messages
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('Cast to ObjectId failed')) {
        throw new BadRequestException('Invalid feedback ID format');
      }
      
      throw new BadRequestException(`Failed to validate feedback: ${errorMessage}`);
    }
  }

  /**
   * Update feedback (Professor/Admin)
   */
  async updateFeedback(
    feedbackId: string,
    updateDto: UpdateFeedbackDto,
    user: JWTUserPayload,
  ) {
    this.logger.log(`Updating feedback: ${feedbackId} by user: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const FeedbackModel = tenantConnection.model(CaseFeedbackLog.name, CaseFeedbackLogSchema);

    try {
      const feedback = await FeedbackModel.findOne({
        _id: new Types.ObjectId(feedbackId),
      });

      if (!feedback) {
        throw new NotFoundException('Feedback not found');
      }

      // Update AI feedback fields
      if (updateDto.overall_score !== undefined) {
        feedback.ai_feedback.overall_score = updateDto.overall_score;
      }
      if (updateDto.strengths) {
        feedback.ai_feedback.strengths = updateDto.strengths;
      }
      if (updateDto.areas_for_improvement) {
        feedback.ai_feedback.areas_for_improvement = updateDto.areas_for_improvement;
      }
      if (updateDto.technical_assessment) {
        feedback.ai_feedback.technical_assessment = updateDto.technical_assessment;
      }
      if (updateDto.communication_assessment) {
        feedback.ai_feedback.communication_assessment = updateDto.communication_assessment;
      }
      if (updateDto.clinical_reasoning) {
        feedback.ai_feedback.clinical_reasoning = updateDto.clinical_reasoning;
      }

      // Update professor feedback if provided
      if (updateDto.professor_comments) {
        feedback.professor_feedback.professor_comments = updateDto.professor_comments;
      }

      feedback.feedback_type = FeedbackTypeEnum.PROFESSOR_EDITED;
      feedback.status = FeedbackStatusEnum.REVISED;

      await feedback.save();

      // Update student progress after update
      const CaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);
      const caseData = await CaseModel.findById(feedback.case_id);
      if (caseData) {
        await this.updateStudentProgress(
          feedback.student_id,
          caseData.internship_id,
          tenantConnection,
        );
      }

      return {
        message: 'Feedback updated successfully',
        data: feedback,
      };
    } catch (error) {
      this.logger.error('Error updating feedback', error?.stack || error);
      
      // Provide more specific error messages
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('Cast to ObjectId failed')) {
        throw new BadRequestException('Invalid feedback ID format');
      }
      
      throw new BadRequestException(`Failed to update feedback: ${errorMessage}`);
    }
  }

  /**
   * Get feedback by session ID (Student view)
   */
  async getFeedbackBySession(sessionId: string, user: JWTUserPayload) {
    this.logger.log(`Getting feedback for session: ${sessionId}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const FeedbackModel = tenantConnection.model(CaseFeedbackLog.name, CaseFeedbackLogSchema);

    try {
      const feedback = await FeedbackModel.findOne({
        session_id: new Types.ObjectId(sessionId),
        student_id: new Types.ObjectId(user.id),
      })
        .sort({ created_at: -1 })
        .lean();

      if (!feedback) {
        throw new NotFoundException('Feedback not found. Please generate feedback first by calling POST /internship/sessions/:sessionId/feedback');
      }

      return {
        message: 'Feedback retrieved successfully',
        data: feedback,
      };
    } catch (error) {
      this.logger.error('Error getting feedback', error?.stack || error);
      
      // Re-throw NotFoundException as-is (404)
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      // Convert other errors to BadRequestException (400)
      throw new BadRequestException('Failed to retrieve feedback');
    }
  }

  /**
   * Get feedback by ID (Any authenticated user)
   */
  async getFeedbackById(feedbackId: string, user: JWTUserPayload) {
    this.logger.log(`Getting feedback by ID: ${feedbackId}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const FeedbackModel = tenantConnection.model(CaseFeedbackLog.name, CaseFeedbackLogSchema);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);
    const CaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);
    const SessionModel = tenantConnection.model(StudentCaseSession.name, StudentCaseSessionSchema);

    try {
      const feedback = await FeedbackModel.findOne({
        _id: new Types.ObjectId(feedbackId),
      }).lean();

      if (!feedback) {
        throw new NotFoundException('Feedback not found');
      }

      // For students, only show their own feedback
      if (user.role.name === RoleEnum.STUDENT && feedback.student_id.toString() !== user.id) {
        throw new NotFoundException('Feedback not found');
      }

      // Populate related data
      const student = await StudentModel.findById(feedback.student_id).select('first_name last_name email').lean();
      const caseData = await CaseModel.findById(feedback.case_id).select('title description').lean();
      const session = await SessionModel.findById(feedback.session_id).select('session_type started_at ended_at').lean();

      return {
        message: 'Feedback retrieved successfully',
        data: {
          ...feedback,
          student_info: student,
          case_info: caseData,
          session_info: session,
        },
      };
    } catch (error) {
      this.logger.error('Error getting feedback by ID', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve feedback');
    }
  }

  /**
   * Get feedback by case ID (Student view)
   */
  async getFeedbackByCase(caseId: string, user: JWTUserPayload) {
    this.logger.log(`Getting feedback for case: ${caseId}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const FeedbackModel = tenantConnection.model(CaseFeedbackLog.name, CaseFeedbackLogSchema);

    try {
      const feedback = await FeedbackModel.findOne({
        case_id: new Types.ObjectId(caseId),
        student_id: new Types.ObjectId(user.id),
        // Allow students to see all feedback statuses including PENDING_VALIDATION
      })
        .sort({ created_at: -1 })
        .lean();

      if (!feedback) {
        throw new NotFoundException('Feedback not found. Please generate feedback first by calling POST /internship/sessions/:sessionId/feedback');
      }

      return {
        message: 'Feedback retrieved successfully',
        data: feedback,
      };
    } catch (error) {
      this.logger.error('Error getting feedback', error?.stack || error);
      
      // Re-throw NotFoundException as-is (404)
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      // Convert other errors to BadRequestException (400)
      throw new BadRequestException('Failed to retrieve feedback');
    }
  }

  /**
   * Helper to update student progress after feedback validation
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

      // Count completed cases (cases with validated feedback OR completed sessions)
      const completedFeedbacks = await FeedbackModel.find({
        student_id: studentId,
        status: { $in: [FeedbackStatusEnum.VALIDATED, FeedbackStatusEnum.REVISED] },
      }).distinct('case_id');

      // Also count cases with at least one completed session (as fallback)
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
      this.logger.log(`Updated progress for student ${studentId} in internship ${internshipId}: ${completedCasesForInternship}/${totalCases} cases completed (${progressPercentage}%)`);
    } catch (error) {
      this.logger.error('Error updating student progress', error);
    }
  }
}

