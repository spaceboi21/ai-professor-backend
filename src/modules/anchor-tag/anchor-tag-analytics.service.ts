import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/database/schemas/central/user.schema';
import { School } from 'src/database/schemas/central/school.schema';
import {
  StudentAnchorTagAttempt,
  StudentAnchorTagAttemptSchema,
} from 'src/database/schemas/tenant/student-anchor-tag-attempt.schema';

import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { AnchorTagAttemptStatusEnum } from 'src/common/constants/anchor-tag.constant';
import { ExportFormatEnum } from 'src/common/constants/export.constant';
import { AnchorTagAnalyticsFilterDto } from './dto/anchor-tag-analytics-filter.dto';
import { getErrorMessage } from 'src/common/constants/error-messages.constant';
import { LanguageEnum } from 'src/common/constants/language.constant';

@Injectable()
export class AnchorTagAnalyticsService {
  private readonly logger = new Logger(AnchorTagAnalyticsService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {}

  // ========== STUDENT ANCHOR TAG ANALYTICS ==========

  async getStudentAttemptedAnchorTags(
    user: JWTUserPayload,
    page: number = 1,
    limit: number = 10,
    studentId?: string,
  ) {
    // Determine the target student ID
    let targetStudentId: string;

    if (user.role.name === RoleEnum.STUDENT) {
      // Students can only view their own data
      targetStudentId = user.id.toString();
      this.logger.log(
        `Getting attempted anchor tags for student: ${user.id} with pagination - page: ${page}, limit: ${limit}`,
      );
    } else if (
      user.role.name === RoleEnum.SCHOOL_ADMIN ||
      user.role.name === RoleEnum.PROFESSOR
    ) {
      // Admins can view any student's data if student_id is provided
      if (!studentId) {
        throw new BadRequestException(
          getErrorMessage(
            'ANCHOR_TAG',
            'STUDENT_ID_REQUIRED_FOR_ADMIN_ACCESS',
            LanguageEnum.ENGLISH,
          ),
        );
      }
      targetStudentId = studentId;
      this.logger.log(
        `Admin ${user.id} getting attempted anchor tags for student: ${studentId} with pagination - page: ${page}, limit: ${limit}`,
      );
    } else {
      throw new BadRequestException(
        getErrorMessage(
          'ANCHOR_TAG',
          'ONLY_STUDENTS_ADMINS_PROFESSORS_CAN_ACCESS',
          LanguageEnum.ENGLISH,
        ),
      );
    }

    // Get school and tenant connection
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException(
        getErrorMessage('ANCHOR_TAG', 'SCHOOL_NOT_FOUND', LanguageEnum.ENGLISH),
      );
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);

    const StudentAnchorTagAttemptModel = tenantConnection.model(
      StudentAnchorTagAttempt.name,
      StudentAnchorTagAttemptSchema,
    );

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalCount = await StudentAnchorTagAttemptModel.aggregate([
      {
        $match: {
          student_id: new Types.ObjectId(targetStudentId),
          status: AnchorTagAttemptStatusEnum.COMPLETED,
        },
      },
      {
        $lookup: {
          from: 'anchor_tags',
          localField: 'anchor_tag_id',
          foreignField: '_id',
          as: 'anchor_tag',
        },
      },
      { $unwind: '$anchor_tag' },
      {
        $group: {
          _id: '$anchor_tag_id',
        },
      },
      {
        $count: 'total',
      },
    ]);

    const total = totalCount.length > 0 ? totalCount[0].total : 0;

    // Get anchor tags that the student has attempted with pagination
    const attemptedAnchorTags = await StudentAnchorTagAttemptModel.aggregate([
      {
        $match: {
          student_id: new Types.ObjectId(targetStudentId),
          status: AnchorTagAttemptStatusEnum.COMPLETED,
        },
      },
      {
        $lookup: {
          from: 'anchor_tags',
          localField: 'anchor_tag_id',
          foreignField: '_id',
          as: 'anchor_tag',
        },
      },
      { $unwind: '$anchor_tag' },
      {
        $lookup: {
          from: 'quiz_group',
          localField: 'anchor_tag.quiz_group_id',
          foreignField: '_id',
          as: 'quiz_group',
        },
      },
      {
        $lookup: {
          from: 'quizzes',
          localField: 'quiz_attempt.quiz_id',
          foreignField: '_id',
          as: 'quiz',
        },
      },
      {
        $lookup: {
          from: 'modules',
          localField: 'module_id',
          foreignField: '_id',
          as: 'module',
        },
      },
      {
        $lookup: {
          from: 'chapters',
          localField: 'chapter_id',
          foreignField: '_id',
          as: 'chapter',
        },
      },
      {
        $lookup: {
          from: 'bibliographies',
          localField: 'bibliography_id',
          foreignField: '_id',
          as: 'bibliography',
        },
      },
      {
        $group: {
          _id: '$anchor_tag_id',
          anchor_tag: { $first: '$anchor_tag' },
          quiz_group: { $first: { $arrayElemAt: ['$quiz_group', 0] } },
          quiz: { $first: { $arrayElemAt: ['$quiz', 0] } },
          module: { $first: { $arrayElemAt: ['$module', 0] } },
          chapter: { $first: { $arrayElemAt: ['$chapter', 0] } },
          bibliography: { $first: { $arrayElemAt: ['$bibliography', 0] } },
          total_attempts: { $sum: 1 },
          average_score: { $avg: '$score_percentage' },
          best_score: { $max: '$score_percentage' },
          worst_score: { $min: '$score_percentage' },
          total_correct: {
            $sum: { $cond: ['$is_correct', 1, 0] },
          },
          last_attempt_date: { $max: '$completed_at' },
          first_attempt_date: { $min: '$started_at' },
        },
      },
      {
        $addFields: {
          success_rate: {
            $multiply: [
              { $divide: ['$total_correct', '$total_attempts'] },
              100,
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          anchor_tag: {
            _id: 1,
            title: 1,
            description: 1,
            content_type: 1,
            content_reference: 1,
            is_mandatory: 1,
          },
          quiz_group: {
            _id: 1,
            subject: 1,
            description: 1,
            difficulty: 1,
            category: 1,
            type: 1,
            time_left: 1,
          },
          quiz: {
            _id: 1,
            question: 1,
            type: 1,
            options: 1,
            answer: 1,
            explanation: 1,
            tags: 1,
          },
          module: {
            _id: 1,
            title: 1,
            subject: 1,
          },
          chapter: {
            _id: 1,
            title: 1,
          },
          bibliography: {
            _id: 1,
            title: 1,
            type: 1,
          },
          total_attempts: 1,
          average_score: { $round: ['$average_score', 2] },
          success_rate: { $round: ['$success_rate', 2] },
          best_score: 1,
          worst_score: 1,
          total_correct: 1,
          last_attempt_date: 1,
          first_attempt_date: 1,
        },
      },
      { $sort: { last_attempt_date: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      attempted_anchor_tags: attemptedAnchorTags,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      summary: {
        total_anchor_tags_attempted: total,
        total_attempts: attemptedAnchorTags.reduce(
          (sum, tag) => sum + tag.total_attempts,
          0,
        ),
        average_success_rate: attemptedAnchorTags.length
          ? attemptedAnchorTags.reduce(
              (sum, tag) => sum + tag.success_rate,
              0,
            ) / attemptedAnchorTags.length
          : 0,
      },
      // Include student information for admin access
      student_info:
        user.role.name !== RoleEnum.STUDENT
          ? {
              student_id: targetStudentId,
              accessed_by: user.role.name,
              accessed_by_id: user.id,
            }
          : undefined,
    };
  }

  async getStudentAnchorTagAnalytics(
    user: JWTUserPayload,
    filterDto?: AnchorTagAnalyticsFilterDto, // You can create a specific DTO for this
    studentId?: string,
  ) {
    // Determine the target student ID
    let targetStudentId: string;

    if (user.role.name === RoleEnum.STUDENT) {
      // Students can only view their own data
      targetStudentId = user.id.toString();
      this.logger.log(
        `Getting student anchor tag analytics for user: ${user.id}`,
      );
    } else if (
      user.role.name === RoleEnum.SCHOOL_ADMIN ||
      user.role.name === RoleEnum.PROFESSOR
    ) {
      // Admins can view any student's data if student_id is provided
      if (!studentId) {
        throw new BadRequestException(
          getErrorMessage(
            'ANCHOR_TAG',
            'STUDENT_ID_REQUIRED_FOR_ADMIN_ACCESS',
            LanguageEnum.ENGLISH,
          ),
        );
      }
      targetStudentId = studentId;
      this.logger.log(
        `Admin ${user.id} getting anchor tag analytics for student: ${studentId}`,
      );
    } else {
      throw new BadRequestException(
        getErrorMessage(
          'ANCHOR_TAG',
          'ONLY_STUDENTS_ADMINS_PROFESSORS_CAN_ACCESS',
          LanguageEnum.ENGLISH,
        ),
      );
    }

    // Get school and tenant connection
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException(
        getErrorMessage('ANCHOR_TAG', 'SCHOOL_NOT_FOUND', LanguageEnum.ENGLISH),
      );
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);

    const StudentAnchorTagAttemptModel = tenantConnection.model(
      StudentAnchorTagAttempt.name,
      StudentAnchorTagAttemptSchema,
    );

    // Build match conditions
    const matchConditions: any = {
      student_id: new Types.ObjectId(targetStudentId),
      status: AnchorTagAttemptStatusEnum.COMPLETED,
    };

    if (filterDto?.module_id) {
      matchConditions.module_id = new Types.ObjectId(filterDto.module_id);
    }

    if (filterDto?.chapter_id) {
      matchConditions.chapter_id = new Types.ObjectId(filterDto.chapter_id);
    }

    if (filterDto?.bibliography_id) {
      matchConditions.bibliography_id = new Types.ObjectId(
        filterDto.bibliography_id,
      );
    }

    if (filterDto?.anchor_tag_id) {
      matchConditions.anchor_tag_id = new Types.ObjectId(
        filterDto.anchor_tag_id,
      );
    }

    if (filterDto?.date_from) {
      matchConditions.completed_at = {
        $gte: new Date(filterDto.date_from),
      };
    }

    if (filterDto?.date_to) {
      if (matchConditions.completed_at) {
        matchConditions.completed_at.$lte = new Date(filterDto.date_to);
      } else {
        matchConditions.completed_at = {
          $lte: new Date(filterDto.date_to),
        };
      }
    }

    // Get student's anchor tag attempts with details
    const attempts = await StudentAnchorTagAttemptModel.aggregate([
      { $match: matchConditions },
      {
        $lookup: {
          from: 'anchor_tags',
          localField: 'anchor_tag_id',
          foreignField: '_id',
          as: 'anchor_tag',
        },
      },
      { $unwind: '$anchor_tag' },
      {
        $lookup: {
          from: 'quiz_group',
          localField: 'anchor_tag.quiz_group_id',
          foreignField: '_id',
          as: 'quiz_group',
        },
      },
      {
        $lookup: {
          from: 'quizzes',
          localField: 'quiz_attempt.quiz_id',
          foreignField: '_id',
          as: 'quiz',
        },
      },
      {
        $lookup: {
          from: 'modules',
          localField: 'module_id',
          foreignField: '_id',
          as: 'module',
        },
      },
      {
        $lookup: {
          from: 'chapters',
          localField: 'chapter_id',
          foreignField: '_id',
          as: 'chapter',
        },
      },
      {
        $lookup: {
          from: 'bibliographies',
          localField: 'bibliography_id',
          foreignField: '_id',
          as: 'bibliography',
        },
      },
      {
        $project: {
          _id: 1,
          anchor_tag: {
            _id: 1,
            title: 1,
            description: 1,
            content_type: 1,
            content_reference: 1,
            is_mandatory: 1,
          },
          quiz_group: { $arrayElemAt: ['$quiz_group', 0] },
          quiz: { $arrayElemAt: ['$quiz', 0] },
          module: { $arrayElemAt: ['$module', 0] },
          chapter: { $arrayElemAt: ['$chapter', 0] },
          bibliography: { $arrayElemAt: ['$bibliography', 0] },
          score_percentage: 1,
          is_correct: 1,
          attempt_number: 1,
          started_at: 1,
          completed_at: 1,
          time_spent_seconds: 1,
          quiz_attempt: 1,
          text_response: 1,
          ai_verification_report: '$ai_verification_result',
        },
      },
      { $sort: { completed_at: -1 } },
    ]);

    // Calculate summary statistics
    const summary = this.calculateStudentAnchorTagSummary(attempts);

    return {
      attempts: attempts,
      summary,
      // Include student information for admin access
      student_info:
        user.role.name !== RoleEnum.STUDENT
          ? {
              student_id: targetStudentId,
              accessed_by: user.role.name,
              accessed_by_id: user.id,
            }
          : undefined,
    };
  }

  private calculateStudentAnchorTagSummary(attempts: any[]) {
    if (attempts.length === 0) {
      return {
        total_attempts: 0,
        average_score: 0,
        success_rate: 0,
        total_correct: 0,
        total_incorrect: 0,
        average_time_taken: 0,
        best_score: 0,
        worst_score: 0,
      };
    }

    const totalAttempts = attempts.length;
    const totalCorrect = attempts.filter((a) => a.is_correct).length;
    const averageScore =
      attempts.reduce((sum, a) => sum + a.score_percentage, 0) / totalAttempts;
    const averageTimeTaken =
      attempts.reduce((sum, a) => sum + a.time_spent_seconds, 0) /
      totalAttempts;
    const scores = attempts.map((a) => a.score_percentage);

    return {
      total_attempts: totalAttempts,
      average_score: Math.round(averageScore * 100) / 100,
      success_rate:
        Math.round((totalCorrect / totalAttempts) * 100 * 100) / 100,
      total_correct: totalCorrect,
      total_incorrect: totalAttempts - totalCorrect,
      average_time_taken: Math.round(averageTimeTaken * 100) / 100,
      best_score: Math.max(...scores),
      worst_score: Math.min(...scores),
    };
  }

  // ========== EXPORT FUNCTIONALITY ==========

  async exportStudentAnchorTagAnalytics(
    user: JWTUserPayload,
    format: ExportFormatEnum,
    filterDto?: AnchorTagAnalyticsFilterDto,
    studentId?: string,
  ) {
    this.logger.log(
      `Exporting student anchor tag analytics in ${format} format for user: ${user.id}`,
    );

    const analytics = await this.getStudentAnchorTagAnalytics(
      user,
      filterDto,
      studentId,
    );

    if (format === ExportFormatEnum.CSV) {
      return this.exportStudentToCSV(analytics);
    } else if (format === ExportFormatEnum.JSON) {
      return this.exportStudentToJSON(analytics);
    }

    throw new BadRequestException(
      getErrorMessage(
        'ANCHOR_TAG',
        'UNSUPPORTED_EXPORT_FORMAT',
        LanguageEnum.ENGLISH,
      ),
    );
  }

  private exportStudentToCSV(analytics: any) {
    const headers = [
      'Anchor Tag Title',
      'Quiz Group Subject',
      'Quiz Group Description',
      'Quiz Group Difficulty',
      'Quiz Group Category',
      'Quiz Question',
      'Quiz Type',
      'Module',
      'Chapter',
      'Bibliography',
      'Content Type',
      'Attempt Number',
      'Score (%)',
      'Correct',
      'Time Taken (seconds)',
      'Completed At',
    ];

    const rows = analytics.attempts.map((attempt: any) => [
      attempt.anchor_tag.title,
      attempt.quiz_group?.subject || 'N/A',
      attempt.quiz_group?.description || 'N/A',
      attempt.quiz_group?.difficulty || 'N/A',
      attempt.quiz_group?.category || 'N/A',
      attempt.quiz?.question || 'N/A',
      attempt.quiz?.type || 'N/A',
      attempt.module?.title || 'N/A',
      attempt.chapter?.title || 'N/A',
      attempt.bibliography?.title || 'N/A',
      attempt.anchor_tag.content_type,
      attempt.attempt_number,
      attempt.score_percentage,
      attempt.is_correct ? 'Yes' : 'No',
      attempt.time_spent_seconds,
      attempt.completed_at,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    return {
      filename: `student-anchor-tag-analytics-${new Date().toISOString().split('T')[0]}.csv`,
      content: csvContent,
      contentType: 'text/csv',
    };
  }

  private exportStudentToJSON(analytics: any) {
    return {
      filename: `student-anchor-tag-analytics-${new Date().toISOString().split('T')[0]}.json`,
      content: JSON.stringify(analytics, null, 2),
      contentType: 'application/json',
    };
  }
}
