import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { School } from 'src/database/schemas/central/school.schema';
import {
  InternshipCaseAttempts,
  InternshipCaseAttemptsSchema,
} from 'src/database/schemas/tenant/internship-case-attempts.schema';
import {
  InternshipCase,
  InternshipCaseSchema,
} from 'src/database/schemas/tenant/internship-case.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';

@Injectable()
export class InternshipCaseAttemptsService {
  private readonly logger = new Logger(InternshipCaseAttemptsService.name);

  constructor(
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {}

  /**
   * Track a new attempt for a student on a case
   */
  async trackAttempt(
    dbName: string,
    studentId: Types.ObjectId,
    caseId: Types.ObjectId,
    internshipId: Types.ObjectId,
    sessionId: Types.ObjectId,
    assessmentId: Types.ObjectId,
    assessmentData: {
      score: number;
      grade: string;
      pass_fail: 'PASS' | 'FAIL';
      pass_threshold: number;
      key_learnings: string[];
      mistakes_made: string[];
      strengths: string[];
      areas_for_improvement: string[];
    },
  ) {
    this.logger.log(`Tracking attempt for student ${studentId} on case ${caseId}`);

    const tenantConnection = await this.tenantConnectionService.getTenantConnection(dbName);
    const AttemptsModel = tenantConnection.model(
      InternshipCaseAttempts.name,
      InternshipCaseAttemptsSchema,
    );
    const CaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);

    // Get case details (step, patient_base_id)
    const caseDoc = await CaseModel.findById(caseId);
    if (!caseDoc) {
      throw new NotFoundException('Case not found');
    }

    // Find or create attempts document
    let attemptsDoc = await AttemptsModel.findOne({
      student_id: studentId,
      case_id: caseId,
    });

    if (!attemptsDoc) {
      // Create new attempts document
      attemptsDoc = new AttemptsModel({
        student_id: studentId,
        case_id: caseId,
        internship_id: internshipId,
        step: caseDoc.step,
        patient_base_id: caseDoc.patient_base_id,
        attempts: [],
        total_attempts: 0,
        best_score: 0,
        average_score: 0,
        current_status: 'in_progress',
      });
    }

    // Calculate attempt number (unlimited retries)
    const attemptNumber = attemptsDoc.total_attempts + 1;

    // Add new attempt
    attemptsDoc.attempts.push({
      attempt_number: attemptNumber,
      session_id: sessionId,
      assessment_id: assessmentId,
      assessment_score: assessmentData.score,
      grade: assessmentData.grade,
      pass_fail: assessmentData.pass_fail,
      pass_threshold: assessmentData.pass_threshold,
      key_learnings: assessmentData.key_learnings,
      mistakes_made: assessmentData.mistakes_made,
      strengths: assessmentData.strengths,
      areas_for_improvement: assessmentData.areas_for_improvement,
      completed_at: new Date(),
    });

    // Update totals
    attemptsDoc.total_attempts = attemptNumber;

    // Update best score
    if (assessmentData.score > attemptsDoc.best_score) {
      attemptsDoc.best_score = assessmentData.score;
    }

    // Calculate average score
    const totalScore = attemptsDoc.attempts.reduce((sum, attempt) => sum + attempt.assessment_score, 0);
    attemptsDoc.average_score = Math.round(totalScore / attemptsDoc.total_attempts);

    // Update status
    if (assessmentData.pass_fail === 'PASS') {
      attemptsDoc.current_status = 'passed';
      if (!attemptsDoc.first_passed_at) {
        attemptsDoc.first_passed_at = new Date();
      }
    } else {
      attemptsDoc.current_status = 'needs_retry';
    }

    attemptsDoc.last_attempt_at = new Date();

    await attemptsDoc.save();

    this.logger.log(
      `Tracked attempt ${attemptNumber} for student ${studentId} on case ${caseId}: ` +
      `${assessmentData.score}/100 (${assessmentData.pass_fail})`
    );

    return attemptsDoc;
  }

  /**
   * Get attempt history for a student on a specific case
   */
  async getAttemptHistory(
    dbName: string,
    studentId: Types.ObjectId,
    caseId: Types.ObjectId,
  ) {
    const tenantConnection = await this.tenantConnectionService.getTenantConnection(dbName);
    const AttemptsModel = tenantConnection.model(
      InternshipCaseAttempts.name,
      InternshipCaseAttemptsSchema,
    );

    const attemptsDoc = await AttemptsModel.findOne({
      student_id: studentId,
      case_id: caseId,
    }).lean();

    if (!attemptsDoc) {
      return {
        found: false,
        attempts: [],
        total_attempts: 0,
        best_score: 0,
        average_score: 0,
        current_status: 'not_started',
      };
    }

    return {
      found: true,
      attempts: attemptsDoc.attempts,
      total_attempts: attemptsDoc.total_attempts,
      best_score: attemptsDoc.best_score,
      average_score: attemptsDoc.average_score,
      current_status: attemptsDoc.current_status,
      first_passed_at: attemptsDoc.first_passed_at,
      last_attempt_at: attemptsDoc.last_attempt_at,
    };
  }

  /**
   * Get all attempts for a student across all cases in an internship
   */
  async getStudentAllAttempts(
    dbName: string,
    studentId: Types.ObjectId,
    internshipId: Types.ObjectId,
  ) {
    const tenantConnection = await this.tenantConnectionService.getTenantConnection(dbName);
    const AttemptsModel = tenantConnection.model(
      InternshipCaseAttempts.name,
      InternshipCaseAttemptsSchema,
    );

    const allAttempts = await AttemptsModel.find({
      student_id: studentId,
      internship_id: internshipId,
    })
      .populate('case_id', 'title step case_type patient_base_id')
      .lean();

    // Calculate overall statistics
    const totalCases = allAttempts.length;
    const passedCases = allAttempts.filter(a => a.current_status === 'passed').length;
    const totalAttempts = allAttempts.reduce((sum, a) => sum + a.total_attempts, 0);
    const overallAverageScore = allAttempts.length > 0
      ? Math.round(allAttempts.reduce((sum, a) => sum + a.average_score, 0) / allAttempts.length)
      : 0;

    return {
      attempts: allAttempts,
      statistics: {
        total_cases: totalCases,
        passed_cases: passedCases,
        total_attempts: totalAttempts,
        overall_average_score: overallAverageScore,
        pass_rate: totalCases > 0 ? Math.round((passedCases / totalCases) * 100) : 0,
      },
    };
  }

  /**
   * Get patient progression across cases (for Steps 2-3)
   */
  async getPatientProgression(
    dbName: string,
    studentId: Types.ObjectId,
    patientBaseId: string,
  ) {
    this.logger.log(`Getting progression for patient ${patientBaseId} - student ${studentId}`);

    const tenantConnection = await this.tenantConnectionService.getTenantConnection(dbName);
    const AttemptsModel = tenantConnection.model(
      InternshipCaseAttempts.name,
      InternshipCaseAttemptsSchema,
    );

    const progressionDocs = await AttemptsModel.find({
      student_id: studentId,
      patient_base_id: patientBaseId,
    })
      .populate('case_id', 'title step sequence_in_step emdr_phase_focus session_narrative patient_state')
      .sort({ 'case_id.sequence_in_step': 1 })
      .lean();

    if (progressionDocs.length === 0) {
      return {
        found: false,
        patient_base_id: patientBaseId,
        progression_history: [],
      };
    }

    // Build progression history
    const progressionHistory = progressionDocs.map(doc => {
      // After populate, case_id is a plain object (not ObjectId)
      const caseData = doc.case_id as any;
      
      return {
        case_id: caseData._id,
        case_title: caseData.title,
        step: doc.step,
        sequence_in_step: caseData.sequence_in_step,
        emdr_phase_focus: caseData.emdr_phase_focus,
        session_narrative: caseData.session_narrative,
        patient_state: caseData.patient_state,
        attempts: doc.attempts,
        best_score: doc.best_score,
        current_status: doc.current_status,
        last_attempt_at: doc.last_attempt_at,
      };
    });

    return {
      found: true,
      patient_base_id: patientBaseId,
      progression_history: progressionHistory,
    };
  }

  /**
   * Get best score for a case
   */
  async getBestScore(
    dbName: string,
    studentId: Types.ObjectId,
    caseId: Types.ObjectId,
  ): Promise<number> {
    const tenantConnection = await this.tenantConnectionService.getTenantConnection(dbName);
    const AttemptsModel = tenantConnection.model(
      InternshipCaseAttempts.name,
      InternshipCaseAttemptsSchema,
    );

    const attemptsDoc = await AttemptsModel.findOne({
      student_id: studentId,
      case_id: caseId,
    }).lean();

    return attemptsDoc?.best_score || 0;
  }

  /**
   * Update status for a case attempt
   */
  async updateStatus(
    dbName: string,
    studentId: Types.ObjectId,
    caseId: Types.ObjectId,
    status: 'not_started' | 'in_progress' | 'passed' | 'needs_retry',
  ) {
    const tenantConnection = await this.tenantConnectionService.getTenantConnection(dbName);
    const AttemptsModel = tenantConnection.model(
      InternshipCaseAttempts.name,
      InternshipCaseAttemptsSchema,
    );

    await AttemptsModel.updateOne(
      { student_id: studentId, case_id: caseId },
      { $set: { current_status: status } },
    );
  }
}
