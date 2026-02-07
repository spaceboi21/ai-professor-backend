import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { ExportStageProgressDto } from './dto/stage-tracking.dto';

@Injectable()
export class StageExportService {
  private readonly logger = new Logger(StageExportService.name);

  constructor(
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {}

  /**
   * Export stage progress data
   */
  async exportStageProgress(
    internshipId: string,
    exportDto: ExportStageProgressDto,
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

    if (exportDto.student_ids && exportDto.student_ids.length > 0) {
      query.student_id = { $in: exportDto.student_ids.map((id) => new Types.ObjectId(id)) };
    }

    // Get stage progress
    const progressData = await StageProgressModel.find(query).lean();

    // Get student details
    const studentIds = progressData.map((p) => p.student_id);
    const students = await StudentModel.find({
      _id: { $in: studentIds },
    }).lean();

    const studentsMap = new Map(students.map((s: any) => [s._id.toString(), s]));

    if (exportDto.format === 'csv') {
      const csvData = this.generateCSV(progressData, studentsMap, exportDto.include_details);
      return {
        message: 'CSV export generated successfully',
        data: {
          format: 'csv',
          content: csvData,
          filename: `stage_progress_${internshipId}_${Date.now()}.csv`,
        },
      };
    } else {
      // PDF export
      const pdfData = this.generatePDFData(progressData, studentsMap, exportDto.include_details);
      return {
        message: 'PDF export data generated successfully (render on frontend)',
        data: {
          format: 'pdf',
          content: pdfData,
          filename: `stage_progress_${internshipId}_${Date.now()}.pdf`,
        },
      };
    }
  }

  /**
   * Generate CSV content
   */
  private generateCSV(
    progressData: any[],
    studentsMap: Map<string, any>,
    includeDetails: boolean = false,
  ): string {
    let csv = '';

    if (includeDetails) {
      // Detailed CSV with metrics
      csv = [
        'Student ID',
        'Student Name',
        'Email',
        'Stage 1 Status',
        'Stage 1 Score',
        'Stage 1 Sessions',
        'Stage 1 Rapport Building',
        'Stage 1 Safe Place Installation',
        'Stage 2 Status',
        'Stage 2 Score',
        'Stage 2 Sessions',
        'Stage 2 Trauma Target ID',
        'Stage 2 Bilateral Stimulation',
        'Stage 2 Initial SUD',
        'Stage 2 Final SUD',
        'Stage 3 Status',
        'Stage 3 Score',
        'Stage 3 Sessions',
        'Stage 3 VoC Assessment',
        'Stage 3 Closure Technique',
        'Stage 3 Initial VoC',
        'Stage 3 Final VoC',
        'Overall Progress %',
        'Overall Score',
        'Total Sessions',
        'All Stages Completed',
        'Completed At',
      ].join(',') + '\n';
    } else {
      // Simple CSV
      csv = [
        'Student ID',
        'Student Name',
        'Email',
        'Stage 1 Status',
        'Stage 1 Score',
        'Stage 2 Status',
        'Stage 2 Score',
        'Stage 3 Status',
        'Stage 3 Score',
        'Overall Progress %',
        'Overall Score',
        'Total Sessions',
      ].join(',') + '\n';
    }

    // Add data rows
    progressData.forEach((progress) => {
      const student = studentsMap.get(progress.student_id.toString());
      const studentName = student
        ? `${student.firstname} ${student.lastname}`
        : 'Unknown';
      const studentEmail = student?.email || '';

      if (includeDetails) {
        csv += [
          progress.student_id,
          `"${studentName}"`,
          studentEmail,
          progress.stage_1.status,
          progress.stage_1.score || '',
          progress.stage_1.sessions_count,
          progress.stage_1.metrics.rapport_building || '',
          progress.stage_1.metrics.safe_place_installation || '',
          progress.stage_2.status,
          progress.stage_2.score || '',
          progress.stage_2.sessions_count,
          progress.stage_2.metrics.trauma_target_identification || '',
          progress.stage_2.metrics.bilateral_stimulation_technique || '',
          progress.stage_2.metrics.initial_sud || '',
          progress.stage_2.metrics.final_sud || '',
          progress.stage_3.status,
          progress.stage_3.score || '',
          progress.stage_3.sessions_count,
          progress.stage_3.metrics.voc_assessment || '',
          progress.stage_3.metrics.closure_technique || '',
          progress.stage_3.metrics.initial_voc || '',
          progress.stage_3.metrics.final_voc || '',
          progress.overall_progress_percentage,
          progress.overall_score || '',
          progress.total_sessions,
          progress.all_stages_completed,
          progress.internship_completed_at
            ? new Date(progress.internship_completed_at).toISOString()
            : '',
        ].join(',') + '\n';
      } else {
        csv += [
          progress.student_id,
          `"${studentName}"`,
          studentEmail,
          progress.stage_1.status,
          progress.stage_1.score || '',
          progress.stage_2.status,
          progress.stage_2.score || '',
          progress.stage_3.status,
          progress.stage_3.score || '',
          progress.overall_progress_percentage,
          progress.overall_score || '',
          progress.total_sessions,
        ].join(',') + '\n';
      }
    });

    return csv;
  }

  /**
   * Generate PDF data structure (to be rendered on frontend)
   */
  private generatePDFData(
    progressData: any[],
    studentsMap: Map<string, any>,
    includeDetails: boolean = false,
  ): any {
    const students = progressData.map((progress) => {
      const student = studentsMap.get(progress.student_id.toString());
      return {
        student_id: progress.student_id,
        student_name: student
          ? `${student.firstname} ${student.lastname}`
          : 'Unknown',
        email: student?.email || null,
        stage_1: {
          status: progress.stage_1.status,
          score: progress.stage_1.score,
          sessions_count: progress.stage_1.sessions_count,
          metrics: includeDetails ? progress.stage_1.metrics : null,
        },
        stage_2: {
          status: progress.stage_2.status,
          score: progress.stage_2.score,
          sessions_count: progress.stage_2.sessions_count,
          metrics: includeDetails ? progress.stage_2.metrics : null,
        },
        stage_3: {
          status: progress.stage_3.status,
          score: progress.stage_3.score,
          sessions_count: progress.stage_3.sessions_count,
          metrics: includeDetails ? progress.stage_3.metrics : null,
        },
        overall_progress: progress.overall_progress_percentage,
        overall_score: progress.overall_score,
        total_sessions: progress.total_sessions,
        completed: progress.all_stages_completed,
        completed_at: progress.internship_completed_at,
      };
    });

    return {
      students,
      generated_at: new Date().toISOString(),
      include_details: includeDetails,
    };
  }
}
