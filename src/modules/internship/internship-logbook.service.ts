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
  StudentLogbook,
  StudentLogbookSchema,
} from 'src/database/schemas/tenant/student-logbook.schema';
import {
  CaseFeedbackLog,
  CaseFeedbackLogSchema,
} from 'src/database/schemas/tenant/case-feedback-log.schema';
import {
  InternshipCase,
  InternshipCaseSchema,
} from 'src/database/schemas/tenant/internship-case.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { AddLogbookEntryDto } from './dto/add-logbook-entry.dto';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { DEFAULT_LANGUAGE } from 'src/common/constants/language.constant';
import { FeedbackStatusEnum } from 'src/common/constants/internship.constant';

@Injectable()
export class InternshipLogbookService {
  private readonly logger = new Logger(InternshipLogbookService.name);

  constructor(
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly errorMessageService: ErrorMessageService,
  ) {}

  /**
   * Get student's logbook for an internship
   */
  async getLogbook(internshipId: string, user: JWTUserPayload) {
    this.logger.log(`Getting logbook for internship: ${internshipId}, student: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const LogbookModel = tenantConnection.model(StudentLogbook.name, StudentLogbookSchema);

    try {
      let logbook = await LogbookModel.findOne({
        student_id: new Types.ObjectId(user.id),
        internship_id: new Types.ObjectId(internshipId),
      }).lean();

      if (!logbook) {
        // Create empty logbook if it doesn't exist
        const newLogbook = new LogbookModel({
          student_id: new Types.ObjectId(user.id),
          internship_id: new Types.ObjectId(internshipId),
          entries: [],
          total_hours: 0,
        });
        logbook = (await newLogbook.save()).toObject() as any;
      }

      return {
        message: 'Logbook retrieved successfully',
        data: logbook,
      };
    } catch (error) {
      this.logger.error('Error getting logbook', error?.stack || error);
      throw new BadRequestException('Failed to retrieve logbook');
    }
  }

  /**
   * Add entry to logbook
   */
  async addLogbookEntry(
    internshipId: string,
    addEntryDto: AddLogbookEntryDto,
    user: JWTUserPayload,
  ) {
    const { case_id, session_summary, skills_practiced, self_reflection, attachments } = addEntryDto;

    this.logger.log(`Adding logbook entry for case: ${case_id}, student: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const LogbookModel = tenantConnection.model(StudentLogbook.name, StudentLogbookSchema);
    const CaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);
    const FeedbackModel = tenantConnection.model(CaseFeedbackLog.name, CaseFeedbackLogSchema);

    try {
      // Verify case exists
      const caseData = await CaseModel.findOne({
        _id: new Types.ObjectId(case_id),
        internship_id: new Types.ObjectId(internshipId),
        deleted_at: null,
      });

      if (!caseData) {
        throw new NotFoundException('Case not found in this internship');
      }

      // Get feedback for this case to include in summary
      const feedback = await FeedbackModel.findOne({
        case_id: new Types.ObjectId(case_id),
        student_id: new Types.ObjectId(user.id),
        status: { $in: [FeedbackStatusEnum.VALIDATED, FeedbackStatusEnum.REVISED] },
      }).sort({ created_at: -1 }).lean();

      let feedbackSummary: string | null = null;
      if (feedback) {
        feedbackSummary = `Score: ${feedback.ai_feedback.overall_score}/100. Strengths: ${feedback.ai_feedback.strengths.slice(0, 2).join(', ')}`;
        if (feedback.professor_feedback?.professor_comments) {
          feedbackSummary = feedbackSummary + `. Professor notes: ${feedback.professor_feedback.professor_comments}`;
        }
      }

      // Find or create logbook
      let logbook = await LogbookModel.findOne({
        student_id: new Types.ObjectId(user.id),
        internship_id: new Types.ObjectId(internshipId),
      });

      if (!logbook) {
        logbook = new LogbookModel({
          student_id: new Types.ObjectId(user.id),
          internship_id: new Types.ObjectId(internshipId),
          entries: [],
          total_hours: 0,
        });
      }

      // Check if entry for this case already exists
      const existingEntryIndex = logbook.entries.findIndex(
        (entry) => entry.case_id.toString() === case_id,
      );

      const newEntry = {
        case_id: new Types.ObjectId(case_id),
        case_title: caseData.title,
        completed_date: new Date(),
        session_summary: session_summary || null,
        skills_practiced: skills_practiced || [],
        feedback_summary: feedbackSummary,
        self_reflection: self_reflection || null,
        attachments: attachments || [],
      };

      if (existingEntryIndex >= 0) {
        // Update existing entry
        logbook.entries[existingEntryIndex] = newEntry;
      } else {
        // Add new entry
        logbook.entries.push(newEntry);
      }

      // Update total hours (estimate based on number of entries)
      logbook.total_hours = logbook.entries.length * 2; // Assume 2 hours per case

      await logbook.save();

      return {
        message: 'Logbook entry added successfully',
        data: logbook,
      };
    } catch (error) {
      this.logger.error('Error adding logbook entry', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to add logbook entry');
    }
  }

  /**
   * Auto-generate logbook entry after feedback is validated
   */
  async autoGenerateLogbookEntry(
    feedbackId: string,
    tenantConnection: any,
  ) {
    this.logger.log(`Auto-generating logbook entry for feedback: ${feedbackId}`);

    try {
      const FeedbackModel = tenantConnection.model(CaseFeedbackLog.name, CaseFeedbackLogSchema);
      const CaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);
      const LogbookModel = tenantConnection.model(StudentLogbook.name, StudentLogbookSchema);

      // Get feedback
      const feedback = await FeedbackModel.findById(feedbackId).lean();
      if (!feedback) {
        throw new NotFoundException('Feedback not found');
      }

      // Get case details
      const caseData = await CaseModel.findById(feedback.case_id).lean();
      if (!caseData) {
        throw new NotFoundException('Case not found');
      }

      // Get internship ID from case
      const internshipId = caseData.internship_id;

      // Find or create logbook
      let logbook = await LogbookModel.findOne({
        student_id: feedback.student_id,
        internship_id: internshipId,
      });

      if (!logbook) {
        logbook = new LogbookModel({
          student_id: feedback.student_id,
          internship_id: internshipId,
          entries: [],
          total_hours: 0,
        });
      }

      // Check if entry already exists
      const existingEntry = logbook.entries.find(
        (entry) => entry.case_id.toString() === feedback.case_id.toString(),
      );

      if (existingEntry) {
        // Update existing entry with feedback summary
        existingEntry.feedback_summary = `Score: ${feedback.ai_feedback.overall_score}/100. ${feedback.ai_feedback.strengths.slice(0, 2).join(', ')}`;
        if (feedback.professor_feedback?.professor_comments) {
          existingEntry.feedback_summary += `. Professor: ${feedback.professor_feedback.professor_comments}`;
        }
      } else {
        // Create new entry
        const feedbackSummary = `Score: ${feedback.ai_feedback.overall_score}/100. ${feedback.ai_feedback.strengths.slice(0, 2).join(', ')}`;
        
        logbook.entries.push({
          case_id: feedback.case_id,
          case_title: caseData.title,
          completed_date: new Date(),
          session_summary: 'Completed clinical interview session',
          skills_practiced: [],
          feedback_summary: feedbackSummary,
          self_reflection: null,
          attachments: [],
        });
      }

      // Update total hours
      logbook.total_hours = logbook.entries.length * 2;

      await logbook.save();

      this.logger.log(`Logbook entry auto-generated for student: ${feedback.student_id}`);
    } catch (error) {
      this.logger.error('Error auto-generating logbook entry', error);
      // Don't throw error, just log it
    }
  }

  /**
   * Update logbook progress summary
   */
  async updateProgressSummary(
    internshipId: string,
    summary: string,
    user: JWTUserPayload,
  ) {
    this.logger.log(`Updating progress summary for internship: ${internshipId}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const LogbookModel = tenantConnection.model(StudentLogbook.name, StudentLogbookSchema);

    try {
      const logbook = await LogbookModel.findOne({
        student_id: new Types.ObjectId(user.id),
        internship_id: new Types.ObjectId(internshipId),
      });

      if (!logbook) {
        throw new NotFoundException('Logbook not found');
      }

      logbook.overall_progress_summary = summary;
      await logbook.save();

      return {
        message: 'Progress summary updated successfully',
        data: logbook,
      };
    } catch (error) {
      this.logger.error('Error updating progress summary', error?.stack || error);
      throw new BadRequestException('Failed to update progress summary');
    }
  }
}

