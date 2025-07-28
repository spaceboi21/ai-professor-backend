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

    return createPaginationResult(
      results[0].data,
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

    return results[0];
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
                // session_title: 1,
                // session_description: 1,
                status: 1,
                started_at: 1,
                ended_at: 1,
                // total_messages: 1,
                // student_messages: 1,
                // ai_messages: 1,
                // scenario: 1,
                // session_metadata: 1,
                // created_at: 1,
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
                // category: 1,
                // duration: 1,
                difficulty: 1,
                // tags: 1,
                thumbnail: 1,
                published_at: 1,
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
                // student_code: 1,
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
      // Calculate frequency across all sessions for this student-module combination
      {
        $lookup: {
          from: 'ai_chat_feedback',
          let: { 
            studentId: '$student_id', 
            moduleId: '$module_id'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$student_id', '$$studentId'] },
                    { $eq: ['$module_id', '$$moduleId'] },
                    { $eq: ['$deleted_at', null] }
                  ]
                }
              }
            },
            {
              $unwind: '$skill_gaps'
            },
            {
              $group: {
                _id: '$skill_gaps',
                count: { $sum: 1 }
              }
            }
          ],
          as: 'all_skill_gap_counts'
        }
      },
      // Lookup all feedback for this student-module combination to calculate status
      {
        $lookup: {
          from: 'ai_chat_feedback',
          let: {
            studentId: '$student_id',
            moduleId: '$module_id',
            currentSkillGaps: '$skill_gaps',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$student_id', '$$studentId'] },
                    { $eq: ['$module_id', '$$moduleId'] },
                    { $eq: ['$deleted_at', null] },
                  ],
                },
              },
            },
            {
              $sort: { created_at: -1 },
            },
            {
              $limit: 5, // Get last 5 sessions for trend analysis
            },
          ],
          as: 'recent_feedback',
        },
      },
      // Calculate status based on recent performance
      {
        $addFields: {
          status: {
            $cond: {
              if: {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: '$recent_feedback',
                        cond: {
                          $anyElementTrue: {
                            $map: {
                              input: '$$this.skill_gaps',
                              as: 'gap',
                              in: {
                                $in: ['$$gap', '$skill_gaps'],
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                  0,
                ],
              },
              then: {
                $cond: {
                  if: {
                    $gt: [
                      {
                        $size: {
                          $filter: {
                            input: { $slice: ['$recent_feedback', 2] },
                            cond: {
                              $anyElementTrue: {
                                $map: {
                                  input: '$$this.skill_gaps',
                                  as: 'gap',
                                  in: {
                                    $in: ['$$gap', '$skill_gaps'],
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                      0,
                    ],
                  },
                  then: 'Stable',
                  else: 'Improving',
                },
              },
              else: 'Improving',
            },
          },
        },
      },
      {
        $project: {
          keywords_for_learning: 0,
          feedback_updated_at: 0,
          session_id: 0,
          module_id: 0,
          student_id: 0,
          recent_feedback: 0,
        },
      },
      {
        $addFields: {
          areas_for_improvement: { $slice: ['$areas_for_improvement', 2] },
          missed_opportunities: { $slice: ['$missed_opportunities', 2] },
          suggestions: { $slice: ['$suggestions', 2] },
          // Add frequency and status to the main document
          frequency: {
            $reduce: {
              input: '$skill_gaps',
              initialValue: 0,
              in: {
                $max: [
                  '$$value',
                  {
                    $ifNull: [
                      {
                        $arrayElemAt: [
                          {
                            $map: {
                              input: '$all_skill_gap_counts',
                              as: 'count',
                              in: {
                                $cond: {
                                  if: { $eq: ['$$count._id', '$$this'] },
                                  then: '$$count.count',
                                  else: null
                                }
                              }
                            }
                          },
                          0
                        ]
                      },
                      0
                    ]
                  }
                ]
              }
            }
          },
          status: '$status',
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
      },
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
      // Calculate frequency across all sessions for this student-module combination
      {
        $lookup: {
          from: 'ai_chat_feedback',
          let: { 
            studentId: '$student_id', 
            moduleId: '$module_id'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$student_id', '$$studentId'] },
                    { $eq: ['$module_id', '$$moduleId'] },
                    { $eq: ['$deleted_at', null] }
                  ]
                }
              }
            },
            {
              $unwind: '$skill_gaps'
            },
            {
              $group: {
                _id: '$skill_gaps',
                count: { $sum: 1 }
              }
            }
          ],
          as: 'all_skill_gap_counts'
        }
      },
      // Lookup all feedback for this student-module combination to calculate status
      {
        $lookup: {
          from: 'ai_chat_feedback',
          let: {
            studentId: '$student_id',
            moduleId: '$module_id',
            currentSkillGaps: '$skill_gaps',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$student_id', '$$studentId'] },
                    { $eq: ['$module_id', '$$moduleId'] },
                    { $eq: ['$deleted_at', null] },
                  ],
                },
              },
            },
            {
              $sort: { created_at: -1 },
            },
            {
              $limit: 5, // Get last 5 sessions for trend analysis
            },
          ],
          as: 'recent_feedback',
        },
      },
      // Calculate status based on recent performance
      {
        $addFields: {
          status: {
            $cond: {
              if: {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: '$recent_feedback',
                        cond: {
                          $anyElementTrue: {
                            $map: {
                              input: '$$this.skill_gaps',
                              as: 'gap',
                              in: {
                                $in: ['$$gap', '$skill_gaps'],
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                  0,
                ],
              },
              then: {
                $cond: {
                  if: {
                    $gt: [
                      {
                        $size: {
                          $filter: {
                            input: { $slice: ['$recent_feedback', 2] },
                            cond: {
                              $anyElementTrue: {
                                $map: {
                                  input: '$$this.skill_gaps',
                                  as: 'gap',
                                  in: {
                                    $in: ['$$gap', '$skill_gaps'],
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                      0,
                    ],
                  },
                  then: 'Stable',
                  else: 'Improving',
                },
              },
              else: 'Improving',
            },
          },
          frequency: {
            $reduce: {
              input: '$skill_gaps',
              initialValue: 0,
              in: {
                $max: [
                  '$$value',
                  {
                    $ifNull: [
                      {
                        $arrayElemAt: [
                          {
                            $map: {
                              input: '$all_skill_gap_counts',
                              as: 'count',
                              in: {
                                $cond: {
                                  if: { $eq: ['$$count._id', '$$this'] },
                                  then: '$$count.count',
                                  else: null
                                }
                              }
                            }
                          },
                          0
                        ]
                      },
                      0
                    ]
                  }
                ]
              }
            }
          },
        },
      },
    ];
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
}
