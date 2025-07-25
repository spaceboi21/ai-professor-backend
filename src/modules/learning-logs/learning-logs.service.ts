import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import {
  createPaginationResult,
  getPaginationOptions,
} from 'src/common/utils/pagination.util';
import { School } from 'src/database/schemas/central/school.schema';
import { User } from 'src/database/schemas/central/user.schema';
import {
  AIChatFeedback,
  AIChatFeedbackSchema,
} from 'src/database/schemas/tenant/ai-chat-feedback.schema';
import {
  AIChatSession,
  AIChatSessionSchema,
} from 'src/database/schemas/tenant/ai-chat-session.schema';
import {
  Module,
  ModuleSchema,
} from 'src/database/schemas/tenant/module.schema';
import {
  Student,
  StudentSchema,
} from 'src/database/schemas/tenant/student.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { LearningLogsFilterDto } from './dto/learning-logs-filter.dto';
import { LearningLogsResponseDto } from './dto/learning-logs-response.dto';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { AI_LEARNING_ERROR_TYPES } from 'src/common/constants/ai-learning-error.constant';

@Injectable()
export class LearningLogsService {
  private readonly logger = new Logger(LearningLogsService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {}

  async getLearningLogs(
    user: JWTUserPayload,
    filterDto?: LearningLogsFilterDto,
    paginationOptions?: any,
  ) {
    const { connection, AIChatFeedbackModel } =
      await this.getConnectionAndModel(user);
    const options = getPaginationOptions(paginationOptions);

    // Build aggregation pipeline with pagination
    const pipeline = this.buildAggregationPipeline(user, filterDto, options);

    // Execute aggregation with pagination
    const results = await AIChatFeedbackModel.aggregate(pipeline);

    // Transform results
    const transformedResults = this.transformResults(results[0].data);

    return createPaginationResult(
      transformedResults,
      results[0].totalCount[0].total,
      options,
    );
  }

  async getLearningLogById(
    id: string,
    user: JWTUserPayload,
  ): Promise<LearningLogsResponseDto> {
    const { connection, AIChatFeedbackModel } =
      await this.getConnectionAndModel(user);

    const pipeline = this.buildSingleLogPipeline(id, user);
    const results = await AIChatFeedbackModel.aggregate(pipeline);

    if (results.length === 0) {
      throw new NotFoundException('Learning log not found');
    }

    const transformedResults = this.transformResults(results);
    return transformedResults[0];
  }

  async getSkillGapStats(user: JWTUserPayload) {
    const { AIChatFeedbackModel } = await this.getConnectionAndModel(user);

    const pipeline: any[] = [
      {
        $match: this.getRoleBasedFilter(user),
      },
      {
        $unwind: '$skill_gaps',
      },
      {
        $group: {
          _id: '$skill_gaps',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ];

    const skillGapStats = await AIChatFeedbackModel.aggregate(pipeline);

    return skillGapStats.map((stat) => ({
      skill_gap: stat._id,
      count: stat.count,
    }));
  }

  // Private helper methods
  private async getConnectionAndModel(user: JWTUserPayload) {
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );

    const AIChatFeedbackModel = connection.model(
      AIChatFeedback.name,
      AIChatFeedbackSchema,
    );

    return { connection, AIChatFeedbackModel };
  }

  private buildAggregationPipeline(
    user: JWTUserPayload,
    filterDto?: LearningLogsFilterDto,
    paginationOptions?: any,
  ): any[] {
    const pipeline: any[] = [
      // Apply filters early for better performance
      {
        $match: {
          ...this.getRoleBasedFilter(user),
          ...this.getFilterConditions(filterDto),
        },
      },
      // Sort early for consistent pagination
      {
        $sort: {
          created_at: -1,
        },
      },
      // Lookup session information with projection
      {
        $lookup: {
          from: 'ai_chat_session',
          localField: 'session_id',
          foreignField: '_id',
          pipeline: [
            {
              $match: {
                deleted_at: null,
              },
            },
            {
              $project: {
                _id: 1,
                session_title: 1,
                session_description: 1,
                status: 1,
                started_at: 1,
                ended_at: 1,
                total_messages: 1,
                student_messages: 1,
                ai_messages: 1,
                scenario: 1,
                session_metadata: 1,
                created_at: 1,
              },
            },
          ],
          as: 'session',
        },
      },
      {
        $unwind: '$session',
      },
      // Lookup module information with projection
      {
        $lookup: {
          from: 'modules',
          localField: 'module_id',
          foreignField: '_id',
          pipeline: [
            {
              $match: {
                deleted_at: null,
              },
            },
            {
              $project: {
                _id: 1,
                title: 1,
                subject: 1,
                description: 1,
                category: 1,
                duration: 1,
                difficulty: 1,
                tags: 1,
                thumbnail: 1,
                created_at: 1,
              },
            },
          ],
          as: 'module',
        },
      },
      {
        $unwind: '$module',
      },
      // Lookup student information with projection
      {
        $lookup: {
          from: 'students',
          localField: 'student_id',
          foreignField: '_id',
          pipeline: [
            {
              $match: {
                deleted_at: null,
              },
            },
            {
              $project: {
                _id: 1,
                first_name: 1,
                last_name: 1,
                email: 1,
                student_code: 1,
                profile_pic: 1,
                created_at: 1,
              },
            },
          ],
          as: 'student',
        },
      },
      {
        $unwind: '$student',
      },
      {
        $project: {
          keywords_for_learning: 0,
          feedback_updated_at: 0,
        },
      },
      {
        $facet: {
          data: [
            { $skip: paginationOptions.skip },
            { $limit: paginationOptions.limit },
          ],
          totalCount: [{ $count: 'total' }],
        },
      }
    ];

    return pipeline;
  }

  private buildSingleLogPipeline(id: string, user: JWTUserPayload): any[] {
    return [
      {
        $match: {
          _id: new Types.ObjectId(id),
          ...this.getRoleBasedFilter(user),
        },
      },
      // Lookup session information
      {
        $lookup: {
          from: 'ai_chat_session',
          localField: 'session_id',
          foreignField: '_id',
          pipeline: [
            {
              $match: {
                deleted_at: null,
              },
            },
            {
              $project: {
                _id: 1,
                session_title: 1,
                session_description: 1,
                status: 1,
                started_at: 1,
                ended_at: 1,
                total_messages: 1,
                student_messages: 1,
                ai_messages: 1,
                scenario: 1,
                session_metadata: 1,
                created_at: 1,
              },
            },
          ],
          as: 'session',
        },
      },
      {
        $unwind: '$session',
      },
      // Lookup module information
      {
        $lookup: {
          from: 'modules',
          localField: 'module_id',
          foreignField: '_id',
          pipeline: [
            {
              $match: {
                deleted_at: null,
              },
            },
            {
              $project: {
                _id: 1,
                title: 1,
                subject: 1,
                description: 1,
                category: 1,
                duration: 1,
                difficulty: 1,
                tags: 1,
                thumbnail: 1,
                created_at: 1,
              },
            },
          ],
          as: 'module',
        },
      },
      {
        $unwind: '$module',
      },
      // Lookup student information
      {
        $lookup: {
          from: 'students',
          localField: 'student_id',
          foreignField: '_id',
          pipeline: [
            {
              $match: {
                deleted_at: null,
              },
            },
            {
              $project: {
                _id: 1,
                first_name: 1,
                last_name: 1,
                email: 1,
                student_code: 1,
                profile_pic: 1,
                created_at: 1,
              },
            },
          ],
          as: 'student',
        },
      },
      {
        $unwind: '$student',
      },
    ];
  }

  private async getTotalCount(
    user: JWTUserPayload,
    filterDto?: LearningLogsFilterDto,
    connection?: Connection,
  ): Promise<number> {
    if (!connection) {
      const { connection: conn } = await this.getConnectionAndModel(user);
      connection = conn;
    }

    const AIChatFeedbackModel = connection.model(
      AIChatFeedback.name,
      AIChatFeedbackSchema,
    );

    const countPipeline = [
      {
        $match: {
          ...this.getRoleBasedFilter(user),
          ...this.getFilterConditions(filterDto),
        },
      },
      {
        $count: 'total',
      },
    ];

    const result = await AIChatFeedbackModel.aggregate(countPipeline);
    return result.length > 0 ? result[0].total : 0;
  }

  private getRoleBasedFilter(user: JWTUserPayload) {
    if (user.role.name === RoleEnum.STUDENT) {
      return {
        student_id: new Types.ObjectId(user.id),
      };
    }

    if (user.role.name === RoleEnum.SCHOOL_ADMIN) {
      return {};
    }

    return {};
  }

  private getFilterConditions(filterDto?: LearningLogsFilterDto) {
    const conditions: any = {};

    if (filterDto?.module_id) {
      conditions.module_id = new Types.ObjectId(filterDto.module_id);
    }

    if (filterDto?.skill_gap) {
      conditions.skill_gaps = filterDto.skill_gap;
    }

    if (filterDto?.start_date || filterDto?.end_date) {
      conditions.created_at = {};
      if (filterDto.start_date) {
        conditions.created_at.$gte = new Date(filterDto.start_date);
      }
      if (filterDto.end_date) {
        conditions.created_at.$lte = new Date(
          filterDto.end_date + 'T23:59:59.999Z',
        );
      }
    }

    return conditions;
  }

  private transformResults(results: any[]): LearningLogsResponseDto[] {
    return results.map((result) => {
      // Get primary skill gap (first one in the array)
      const primarySkillGap =
        result.skill_gaps && result.skill_gaps.length > 0
          ? result.skill_gaps[0]
          : null;

      // Validate skill gaps against the constant
      const validSkillGaps =
        result.skill_gaps?.filter((gap: string) =>
          AI_LEARNING_ERROR_TYPES.includes(gap),
        ) || [];

      // Transform student details
      const studentDetails = {
        _id: result.student?._id?.toString() || result.student_id?.toString(),
        first_name: result.student?.first_name || '',
        last_name: result.student?.last_name || '',
        email: result.student?.email || '',
        student_code: result.student?.student_code || '',
        profile_pic: result.student?.profile_pic || '',
        created_at: result.student?.created_at,
      };

      // Transform module details
      const moduleDetails = {
        _id: result.module?._id?.toString() || result.module_id?.toString(),
        title: result.module?.title || 'Unknown Module',
        subject: result.module?.subject || '',
        description: result.module?.description || '',
        category: result.module?.category || '',
        duration: result.module?.duration || 0,
        difficulty: result.module?.difficulty || '',
        tags: result.module?.tags || [],
        thumbnail: result.module?.thumbnail || '',
        created_at: result.module?.created_at,
      };

      // Transform session details
      const sessionDetails = {
        _id: result.session?._id?.toString() || result.session_id?.toString(),
        session_title: result.session?.session_title || '',
        session_description: result.session?.session_description || '',
        status: result.session?.status || '',
        started_at: result.session?.started_at || result.session?.created_at,
        ended_at: result.session?.ended_at,
        total_messages: result.session?.total_messages || 0,
        student_messages: result.session?.student_messages || 0,
        ai_messages: result.session?.ai_messages || 0,
        scenario: result.session?.scenario || '',
        session_metadata: result.session?.session_metadata || {},
        created_at: result.session?.created_at,
      };

      return {
        _id: result._id.toString(),
        session_id: result.session_id.toString(),
        module_id: result.module_id.toString(),
        student_id: result.student_id.toString(),
        primary_skill_gap: primarySkillGap,
        skill_gaps: validSkillGaps,
        strengths: result.strengths || [],
        areas_for_improvement: result.areas_for_improvement || [],
        missed_opportunities: result.missed_opportunities || [],
        suggestions: result.suggestions || [],
        keywords_for_learning: result.keywords_for_learning || [],
        rating: result.rating || {},
        feedback_created_at: result.created_at,
        feedback_updated_at: result.updated_at,
        student: studentDetails,
        module: moduleDetails,
        session: sessionDetails,
      };
    });
  }
}
