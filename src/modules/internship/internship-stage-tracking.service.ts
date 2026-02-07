import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { School } from 'src/database/schemas/central/school.schema';
import { Student } from 'src/database/schemas/tenant/student.schema';
import {
  InternshipStageProgress,
  InternshipStageProgressSchema,
  StageStatusEnum,
} from 'src/database/schemas/tenant/internship-stage-progress.schema';
import {
  StudentCaseSession,
  StudentCaseSessionSchema,
} from 'src/database/schemas/tenant/student-case-session.schema';
import {
  CaseFeedbackLog,
  CaseFeedbackLogSchema,
} from 'src/database/schemas/tenant/case-feedback-log.schema';
import {
  InternshipCase,
  InternshipCaseSchema,
} from 'src/database/schemas/tenant/internship-case.schema';
import {
  Internship,
  InternshipSchema,
} from 'src/database/schemas/tenant/internship.schema';
import {
  InternshipMemory,
  InternshipMemorySchema,
} from 'src/database/schemas/tenant/internship-memory.schema';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { SessionStatusEnum } from 'src/common/constants/internship.constant';
import {
  UpdateStageProgressDto,
  ValidateStageDto,
  UpdateThresholdsDto,
  DashboardFiltersDto,
} from './dto/stage-tracking.dto';

@Injectable()
export class InternshipStageTrackingService {
  private readonly logger = new Logger(InternshipStageTrackingService.name);

  constructor(
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {}

  /**
   * Get or create stage progress for a student
   */
  async getOrCreateStageProgress(
    studentId: string,
    internshipId: string,
    user: JWTUserPayload,
  ) {
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StageProgressModel = tenantConnection.model(
      InternshipStageProgress.name,
      InternshipStageProgressSchema,
    );

    let stageProgress = await StageProgressModel.findOne({
      student_id: new Types.ObjectId(studentId),
      internship_id: new Types.ObjectId(internshipId),
    }).lean();

    if (!stageProgress) {
      // Create new stage progress
      const newProgress = new StageProgressModel({
        student_id: new Types.ObjectId(studentId),
        internship_id: new Types.ObjectId(internshipId),
      });
      const saved = await newProgress.save();
      stageProgress = saved.toObject() as any;
      this.logger.log(`Created stage progress for student ${studentId}`);
    }

    return {
      message: 'Stage progress retrieved successfully',
      data: stageProgress,
    };
  }

  /**
   * Update stage progress manually (for professors/admins)
   */
  async updateStageProgress(
    studentId: string,
    internshipId: string,
    updateDto: UpdateStageProgressDto,
    user: JWTUserPayload,
  ) {
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StageProgressModel = tenantConnection.model(
      InternshipStageProgress.name,
      InternshipStageProgressSchema,
    );

    const stageField = `stage_${updateDto.stage_number}`;
    const updateData: any = {};

    if (updateDto.status) {
      updateData[`${stageField}.status`] = updateDto.status;

      // Auto-set timestamps based on status
      if (updateDto.status === StageStatusEnum.IN_PROGRESS) {
        updateData[`${stageField}.started_at`] = new Date();
      } else if (updateDto.status === StageStatusEnum.COMPLETED) {
        updateData[`${stageField}.completed_at`] = new Date();
      } else if (updateDto.status === StageStatusEnum.VALIDATED) {
        updateData[`${stageField}.validated_at`] = new Date();
      }
    }

    if (updateDto.score !== undefined) {
      updateData[`${stageField}.score`] = updateDto.score;
    }

    if (updateDto.case_id) {
      updateData[`${stageField}.case_id`] = new Types.ObjectId(updateDto.case_id);
    }

    if (updateDto.validation_notes) {
      updateData[`${stageField}.validation_notes`] = updateDto.validation_notes;
    }

    if (updateDto.needs_improvement_areas) {
      updateData[`${stageField}.needs_improvement_areas`] =
        updateDto.needs_improvement_areas;
    }

    if (updateDto.metrics) {
      Object.keys(updateDto.metrics).forEach((key) => {
        updateData[`${stageField}.metrics.${key}`] = updateDto.metrics![key];
      });
    }

    const updated = await StageProgressModel.findOneAndUpdate(
      {
        student_id: new Types.ObjectId(studentId),
        internship_id: new Types.ObjectId(internshipId),
      },
      { $set: updateData },
      { new: true, upsert: true },
    ).lean();

    // Recalculate overall progress
    await this.recalculateOverallProgress(
      studentId,
      internshipId,
      school.db_name,
    );

    this.logger.log(
      `Updated stage ${updateDto.stage_number} for student ${studentId}`,
    );

    return {
      message: 'Stage progress updated successfully',
      data: updated,
    };
  }

  /**
   * Validate a stage (professor approval)
   */
  async validateStage(
    studentId: string,
    internshipId: string,
    validateDto: ValidateStageDto,
    user: JWTUserPayload,
  ) {
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StageProgressModel = tenantConnection.model(
      InternshipStageProgress.name,
      InternshipStageProgressSchema,
    );

    const stageField = `stage_${validateDto.stage_number}`;
    const updateData: any = {};

    updateData[`${stageField}.status`] = validateDto.is_approved
      ? StageStatusEnum.VALIDATED
      : StageStatusEnum.NEEDS_REVISION;
    updateData[`${stageField}.validated_at`] = new Date();

    if (validateDto.validation_notes) {
      updateData[`${stageField}.validation_notes`] = validateDto.validation_notes;
    }

    if (validateDto.edited_score !== undefined) {
      updateData[`${stageField}.score`] = validateDto.edited_score;
    }

    if (validateDto.needs_improvement_areas) {
      updateData[`${stageField}.needs_improvement_areas`] =
        validateDto.needs_improvement_areas;
    }

    const updated = await StageProgressModel.findOneAndUpdate(
      {
        student_id: new Types.ObjectId(studentId),
        internship_id: new Types.ObjectId(internshipId),
      },
      { $set: updateData },
      { new: true },
    ).lean();

    if (!updated) {
      throw new NotFoundException('Stage progress not found');
    }

    // Recalculate overall progress
    await this.recalculateOverallProgress(
      studentId,
      internshipId,
      school.db_name,
    );

    this.logger.log(
      `Stage ${validateDto.stage_number} ${validateDto.is_approved ? 'validated' : 'needs revision'} for student ${studentId}`,
    );

    return {
      message: `Stage ${validateDto.is_approved ? 'validated' : 'marked as needs revision'} successfully`,
      data: updated,
    };
  }

  /**
   * Auto-update stage progress based on completed sessions
   */
  async autoUpdateStageProgress(
    studentId: string,
    internshipId: string,
    caseId: string,
    sessionId: string,
    dbName: string,
  ) {
    try {
      const tenantConnection =
        await this.tenantConnectionService.getTenantConnection(dbName);
      const StageProgressModel = tenantConnection.model(
        InternshipStageProgress.name,
        InternshipStageProgressSchema,
      );
      const SessionModel = tenantConnection.model(
        StudentCaseSession.name,
        StudentCaseSessionSchema,
      );
      const FeedbackModel = tenantConnection.model(
        CaseFeedbackLog.name,
        CaseFeedbackLogSchema,
      );
      const MemoryModel = tenantConnection.model(
        InternshipMemory.name,
        InternshipMemorySchema,
      );

      // Get session data
      const session = await SessionModel.findById(sessionId).lean();
      if (!session) return;

      // Get feedback for this session
      const feedback = await FeedbackModel.findOne({
        session_id: new Types.ObjectId(sessionId),
      }).lean();

      // Get memory data
      const memory = await MemoryModel.findOne({
        student_id: new Types.ObjectId(studentId),
        internship_id: new Types.ObjectId(internshipId),
      }).lean();

      // Determine which stage this session belongs to
      const stageNumber = this.determineStageFromSession(session, memory);
      if (!stageNumber) return;

      // Get or create stage progress
      let stageProgress = await StageProgressModel.findOne({
        student_id: new Types.ObjectId(studentId),
        internship_id: new Types.ObjectId(internshipId),
      });

      if (!stageProgress) {
        stageProgress = new StageProgressModel({
          student_id: new Types.ObjectId(studentId),
          internship_id: new Types.ObjectId(internshipId),
        });
      }

      const stageField = `stage_${stageNumber}`;

      // Update stage status
      if (stageProgress[stageField].status === StageStatusEnum.NOT_STARTED) {
        stageProgress[stageField].status = StageStatusEnum.IN_PROGRESS;
        stageProgress[stageField].started_at = new Date();
      }

      // Increment session count
      stageProgress[stageField].sessions_count += 1;
      stageProgress.total_sessions += 1;

      // Set case ID
      if (!stageProgress[stageField].case_id) {
        stageProgress[stageField].case_id = new Types.ObjectId(caseId);
      }

      // Update metrics based on feedback
      if (feedback?.ai_feedback) {
        const score = feedback.professor_feedback?.edited_score || feedback.ai_feedback.overall_score;
        stageProgress[stageField].score = score;

        // Extract metrics from feedback
        this.extractMetricsFromFeedback(
          stageProgress[stageField],
          feedback,
          memory,
          stageNumber,
        );
      }

      await stageProgress.save();

      // Recalculate overall progress
      await this.recalculateOverallProgress(studentId, internshipId, dbName);

      this.logger.log(
        `Auto-updated stage ${stageNumber} progress for student ${studentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error auto-updating stage progress: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Determine stage number from session content
   */
  private determineStageFromSession(session: any, memory: any): number | null {
    const messageContent = session.messages
      ?.map((m: any) => m.content.toLowerCase())
      .join(' ');

    if (!messageContent) return null;

    // Stage 1: Safe place, rapport building, initial assessment
    if (
      messageContent.includes('safe place') ||
      messageContent.includes('lieu sûr') ||
      messageContent.includes('lieu sécurisant') ||
      (memory?.patient_memory?.techniques_learned?.includes('safe_place') &&
        memory.total_sessions <= 2)
    ) {
      return 1;
    }

    // Stage 2: Trauma processing, bilateral stimulation, SUD tracking
    if (
      messageContent.includes('bilateral') ||
      messageContent.includes('stimulation') ||
      messageContent.includes('trauma') ||
      messageContent.includes('sud') ||
      messageContent.includes('souvenir traumatique') ||
      memory?.patient_memory?.techniques_learned?.includes('bilateral_stimulation')
    ) {
      return 2;
    }

    // Stage 3: Integration, VoC, closure, future template
    if (
      messageContent.includes('voc') ||
      messageContent.includes('cognition positive') ||
      messageContent.includes('clôture') ||
      messageContent.includes('closure') ||
      messageContent.includes('intégration') ||
      messageContent.includes('future template')
    ) {
      return 3;
    }

    // Default to stage 1 if can't determine
    return 1;
  }

  /**
   * Extract metrics from feedback and memory
   */
  private extractMetricsFromFeedback(
    stage: any,
    feedback: any,
    memory: any,
    stageNumber: number,
  ) {
    const aiAssessment = feedback.ai_feedback;

    if (stageNumber === 1) {
      // Stage 1 metrics
      if (aiAssessment.technical_assessment) {
        stage.metrics.rapport_building =
          aiAssessment.technical_assessment.rapport_building || null;
        stage.metrics.safe_place_installation =
          aiAssessment.technical_assessment.safe_place_installation || null;
      }
      if (aiAssessment.communication_assessment) {
        stage.metrics.patient_engagement =
          aiAssessment.communication_assessment.patient_engagement || null;
        stage.metrics.communication_clarity =
          aiAssessment.communication_assessment.clarity || null;
      }
    } else if (stageNumber === 2) {
      // Stage 2 metrics
      if (aiAssessment.technical_assessment) {
        stage.metrics.trauma_target_identification =
          aiAssessment.technical_assessment.trauma_target_identification || null;
        stage.metrics.bilateral_stimulation_technique =
          aiAssessment.technical_assessment.bilateral_stimulation || null;
        stage.metrics.sud_tracking =
          aiAssessment.technical_assessment.sud_tracking || null;
        stage.metrics.pacing_and_timing =
          aiAssessment.technical_assessment.pacing || null;
      }
      // Extract SUD levels from memory
      if (memory?.patient_memory?.trauma_targets?.length > 0) {
        const targets = memory.patient_memory.trauma_targets;
        stage.metrics.initial_sud = targets[0].initial_sud || null;
        stage.metrics.final_sud = targets[targets.length - 1].current_sud || null;
      }
    } else if (stageNumber === 3) {
      // Stage 3 metrics
      if (aiAssessment.technical_assessment) {
        stage.metrics.voc_assessment =
          aiAssessment.technical_assessment.voc_assessment || null;
        stage.metrics.closure_technique =
          aiAssessment.technical_assessment.closure || null;
        stage.metrics.future_template =
          aiAssessment.technical_assessment.future_template || null;
        stage.metrics.integration_quality =
          aiAssessment.technical_assessment.integration || null;
      }
      // Extract VoC levels from memory (if available)
      if (memory?.patient_memory?.voc_scores) {
        const vocScores = memory.patient_memory.voc_scores;
        stage.metrics.initial_voc = vocScores[0] || null;
        stage.metrics.final_voc = vocScores[vocScores.length - 1] || null;
      }
    }
  }

  /**
   * Recalculate overall progress percentage and scores
   */
  private async recalculateOverallProgress(
    studentId: string,
    internshipId: string,
    dbName: string,
  ) {
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(dbName);
    const StageProgressModel = tenantConnection.model(
      InternshipStageProgress.name,
      InternshipStageProgressSchema,
    );

    const progress = await StageProgressModel.findOne({
      student_id: new Types.ObjectId(studentId),
      internship_id: new Types.ObjectId(internshipId),
    });

    if (!progress) return;

    // Calculate overall progress percentage
    let completedStages = 0;
    if (
      progress.stage_1.status === StageStatusEnum.COMPLETED ||
      progress.stage_1.status === StageStatusEnum.VALIDATED
    ) {
      completedStages++;
    }
    if (
      progress.stage_2.status === StageStatusEnum.COMPLETED ||
      progress.stage_2.status === StageStatusEnum.VALIDATED
    ) {
      completedStages++;
    }
    if (
      progress.stage_3.status === StageStatusEnum.COMPLETED ||
      progress.stage_3.status === StageStatusEnum.VALIDATED
    ) {
      completedStages++;
    }

    progress.overall_progress_percentage = (completedStages / 3) * 100;

    // Calculate overall score (average of stage scores)
    const scores = [
      progress.stage_1.score,
      progress.stage_2.score,
      progress.stage_3.score,
    ].filter((s) => s !== null && s !== undefined);

    if (scores.length > 0) {
      progress.overall_score =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }

    // Check if all stages completed
    progress.all_stages_completed = completedStages === 3;
    if (progress.all_stages_completed && !progress.internship_completed_at) {
      progress.internship_completed_at = new Date();
    }

    await progress.save();
  }

  /**
   * Update thresholds for a student's stage progress
   */
  async updateThresholds(
    studentId: string,
    internshipId: string,
    thresholdsDto: UpdateThresholdsDto,
    user: JWTUserPayload,
  ) {
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StageProgressModel = tenantConnection.model(
      InternshipStageProgress.name,
      InternshipStageProgressSchema,
    );

    const updateData: any = {};
    if (thresholdsDto.minimum_score_to_pass !== undefined) {
      updateData['thresholds.minimum_score_to_pass'] =
        thresholdsDto.minimum_score_to_pass;
    }
    if (thresholdsDto.minimum_sessions_per_stage !== undefined) {
      updateData['thresholds.minimum_sessions_per_stage'] =
        thresholdsDto.minimum_sessions_per_stage;
    }
    if (thresholdsDto.require_professor_validation !== undefined) {
      updateData['thresholds.require_professor_validation'] =
        thresholdsDto.require_professor_validation;
    }

    const updated = await StageProgressModel.findOneAndUpdate(
      {
        student_id: new Types.ObjectId(studentId),
        internship_id: new Types.ObjectId(internshipId),
      },
      { $set: updateData },
      { new: true },
    ).lean();

    if (!updated) {
      throw new NotFoundException('Stage progress not found');
    }

    return {
      message: 'Thresholds updated successfully',
      data: updated.thresholds,
    };
  }

  /**
   * Get dashboard data for professors/admins
   */
  async getDashboardData(
    internshipId: string,
    filters: DashboardFiltersDto,
    user: JWTUserPayload,
  ) {
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StageProgressModel = tenantConnection.model(
      InternshipStageProgress.name,
      InternshipStageProgressSchema,
    );
    const StudentModel = tenantConnection.model(Student.name);

    // Build query
    const query: any = { internship_id: new Types.ObjectId(internshipId) };

    if (filters.stage_number && filters.stage_status) {
      query[`stage_${filters.stage_number}.status`] = filters.stage_status;
    }

    if (filters.min_score !== undefined) {
      query.overall_score = { $gte: filters.min_score };
    }

    if (filters.max_score !== undefined) {
      query.overall_score = { ...query.overall_score, $lte: filters.max_score };
    }

    if (filters.only_completed) {
      query.all_stages_completed = true;
    }

    // Get all stage progress
    const progressData = await StageProgressModel.find(query).lean();

    // Get student details
    const studentIds = progressData.map((p) => p.student_id);
    const students = await StudentModel.find({
      _id: { $in: studentIds },
    }).lean();

    // Merge data
    const studentsMap = new Map(students.map((s: any) => [s._id.toString(), s]));

    const studentsWithProgress = progressData.map((progress) => {
      const student = studentsMap.get(progress.student_id.toString());
      return {
        student_id: progress.student_id,
        student_name: student
          ? `${student.firstname} ${student.lastname}`
          : 'Unknown',
        student_email: student?.email || null,
        stage_1: progress.stage_1,
        stage_2: progress.stage_2,
        stage_3: progress.stage_3,
        overall_progress: progress.overall_progress_percentage,
        overall_score: progress.overall_score,
        total_sessions: progress.total_sessions,
        all_stages_completed: progress.all_stages_completed,
        completed_at: progress.internship_completed_at,
      };
    });

    // Calculate statistics
    const stats = {
      total_students: studentsWithProgress.length,
      students_completed: studentsWithProgress.filter((s) => s.all_stages_completed)
        .length,
      students_in_progress: studentsWithProgress.filter(
        (s) => !s.all_stages_completed && s.stage_1.status !== StageStatusEnum.NOT_STARTED,
      ).length,
      students_not_started: studentsWithProgress.filter(
        (s) => s.stage_1.status === StageStatusEnum.NOT_STARTED,
      ).length,
      average_score:
        studentsWithProgress.reduce((sum, s) => sum + (s.overall_score || 0), 0) /
        (studentsWithProgress.length || 1),
      average_sessions:
        studentsWithProgress.reduce((sum, s) => sum + s.total_sessions, 0) /
        (studentsWithProgress.length || 1),
      stage_1_completion_rate:
        (studentsWithProgress.filter(
          (s) =>
            s.stage_1.status === StageStatusEnum.COMPLETED ||
            s.stage_1.status === StageStatusEnum.VALIDATED,
        ).length /
          (studentsWithProgress.length || 1)) *
        100,
      stage_2_completion_rate:
        (studentsWithProgress.filter(
          (s) =>
            s.stage_2.status === StageStatusEnum.COMPLETED ||
            s.stage_2.status === StageStatusEnum.VALIDATED,
        ).length /
          (studentsWithProgress.length || 1)) *
        100,
      stage_3_completion_rate:
        (studentsWithProgress.filter(
          (s) =>
            s.stage_3.status === StageStatusEnum.COMPLETED ||
            s.stage_3.status === StageStatusEnum.VALIDATED,
        ).length /
          (studentsWithProgress.length || 1)) *
        100,
    };

    return {
      message: 'Dashboard data retrieved successfully',
      data: {
        students: studentsWithProgress,
        statistics: stats,
      },
    };
  }

  /**
   * Get detailed student view with timeline
   */
  async getStudentDetailedView(
    studentId: string,
    internshipId: string,
    user: JWTUserPayload,
  ) {
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StageProgressModel = tenantConnection.model(
      InternshipStageProgress.name,
      InternshipStageProgressSchema,
    );
    const SessionModel = tenantConnection.model(
      StudentCaseSession.name,
      StudentCaseSessionSchema,
    );
    const FeedbackModel = tenantConnection.model(
      CaseFeedbackLog.name,
      CaseFeedbackLogSchema,
    );
    const MemoryModel = tenantConnection.model(
      InternshipMemory.name,
      InternshipMemorySchema,
    );
    const StudentModel = tenantConnection.model(Student.name);

    // Get stage progress
    const stageProgress = await StageProgressModel.findOne({
      student_id: new Types.ObjectId(studentId),
      internship_id: new Types.ObjectId(internshipId),
    }).lean();

    if (!stageProgress) {
      throw new NotFoundException('Stage progress not found');
    }

    // Get student details
    const student = await StudentModel.findById(studentId).lean();

    // Get all sessions
    const sessions = await SessionModel.find({
      student_id: new Types.ObjectId(studentId),
      internship_id: new Types.ObjectId(internshipId),
      status: { $in: [SessionStatusEnum.COMPLETED, SessionStatusEnum.ACTIVE] },
    })
      .sort({ started_at: 1 })
      .lean();

    // Get feedback for sessions
    const sessionIds = sessions.map((s) => s._id);
    const feedbacks = await FeedbackModel.find({
      session_id: { $in: sessionIds },
    }).lean();

    const feedbackMap = new Map(
      feedbacks.map((f) => [f.session_id.toString(), f]),
    );

    // Get memory data
    const memory = await MemoryModel.findOne({
      student_id: new Types.ObjectId(studentId),
      internship_id: new Types.ObjectId(internshipId),
    }).lean();

    // Build timeline
    const timeline = sessions.map((session) => {
      const feedback = feedbackMap.get(session._id.toString());
      return {
        session_id: session._id,
        session_number: session.session_number,
        started_at: session.started_at,
        duration_seconds: session.total_active_time_seconds,
        score: feedback?.ai_feedback?.overall_score || null,
        feedback_status: feedback?.status || null,
        is_validated: feedback?.professor_feedback?.is_approved || false,
      };
    });

    // Extract SUD/VoC evolution
    const patientMemory = (memory as any)?.patient_memory;
    const sudEvolution = patientMemory?.trauma_targets?.map((target: any) => ({
      timestamp: target.identified_at || null,
      initial_sud: target.initial_sud,
      current_sud: target.current_sud,
      target_description: target.description?.substring(0, 100) || null,
    })) || [];

    const vocEvolution = patientMemory?.voc_scores || [];

    return {
      message: 'Student detailed view retrieved successfully',
      data: {
        student: {
          id: studentId,
          name: student ? `${(student as any).firstname} ${(student as any).lastname}` : 'Unknown',
          email: (student as any)?.email || null,
        },
        stage_progress: {
          stage_1: stageProgress.stage_1,
          stage_2: stageProgress.stage_2,
          stage_3: stageProgress.stage_3,
          overall_progress: stageProgress.overall_progress_percentage,
          overall_score: stageProgress.overall_score,
          total_sessions: stageProgress.total_sessions,
          all_stages_completed: stageProgress.all_stages_completed,
        },
        timeline,
        sud_evolution: sudEvolution,
        voc_evolution: vocEvolution,
        techniques_learned:
          patientMemory?.techniques_learned || [],
        thresholds: stageProgress.thresholds,
      },
    };
  }
}
