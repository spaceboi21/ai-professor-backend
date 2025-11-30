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
import { PythonInternshipService } from './python-internship.service';
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
  ) {}

  /**
   * Generate AI feedback for a completed session
   */
  async generateFeedback(sessionId: string, user: JWTUserPayload) {
    this.logger.log(`Generating feedback for session: ${sessionId}`);

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
      const session = await SessionModel.findOne({
        _id: new Types.ObjectId(sessionId),
        student_id: new Types.ObjectId(user.id),
        deleted_at: null,
      });

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
        return {
          message: 'Feedback already exists',
          data: existingFeedback,
        };
      }

      // Get case details for evaluation criteria
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
      const sessionDurationMinutes = Math.floor(durationMs / 60000); // Convert to minutes

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
      const savedFeedback = await newFeedback.save();

      // Update session status to pending validation
      session.status = SessionStatusEnum.PENDING_VALIDATION;
      await session.save();

      this.logger.log(`Feedback generated: ${savedFeedback._id}`);

      return {
        message: 'Feedback generated successfully',
        data: savedFeedback,
      };
    } catch (error) {
      this.logger.error('Error generating feedback', error?.stack || error);
      throw new BadRequestException('Failed to generate feedback');
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

      return {
        message: 'Feedback validated successfully',
        data: feedback,
      };
    } catch (error) {
      this.logger.error('Error validating feedback', error?.stack || error);
      throw new BadRequestException('Failed to validate feedback');
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

      return {
        message: 'Feedback updated successfully',
        data: feedback,
      };
    } catch (error) {
      this.logger.error('Error updating feedback', error?.stack || error);
      throw new BadRequestException('Failed to update feedback');
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
        status: { $in: [FeedbackStatusEnum.VALIDATED, FeedbackStatusEnum.REVISED] },
      })
        .sort({ created_at: -1 })
        .lean();

      if (!feedback) {
        throw new NotFoundException('Feedback not found or not yet validated');
      }

      return {
        message: 'Feedback retrieved successfully',
        data: feedback,
      };
    } catch (error) {
      this.logger.error('Error getting feedback', error?.stack || error);
      throw new BadRequestException('Failed to retrieve feedback');
    }
  }
}

