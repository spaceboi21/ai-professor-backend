import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationTypeEnum } from 'src/common/constants/notification.constant';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { CSVUtil } from 'src/common/utils/csv.util';
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
  LearningLogReview,
  LearningLogReviewSchema,
} from 'src/database/schemas/tenant/learning-log-review.schema';
import { RecipientTypeEnum } from 'src/database/schemas/tenant/notification.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateLearningLogReviewDto } from './dto/create-learning-log-review.dto';
import { LearningLogReviewResponseDto } from './dto/learning-log-review-response.dto';
import { LearningLogsExportResponseDto } from './dto/learning-logs-export-response.dto';
import { LearningLogsFilterDto } from './dto/learning-logs-filter.dto';
import { LearningLogsResponseDto } from './dto/learning-logs-response.dto';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { DEFAULT_LANGUAGE } from 'src/common/constants/language.constant';
import { EmailEncryptionService } from 'src/common/services/email-encryption.service';

@Injectable()
export class LearningLogsService {
  private readonly logger = new Logger(LearningLogsService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly notificationsService: NotificationsService,
    private readonly csvUtil: CSVUtil,
    private readonly errorMessageService: ErrorMessageService,
    private readonly emailEncryptionService: EmailEncryptionService,
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

    this.logger.log(
      `User role: ${user.role.name}, Pipeline stages: ${pipeline.length}`,
    );

    // Execute aggregation with pagination
    const results = await AIChatFeedbackModel.aggregate(pipeline);

    this.logger.log(`Aggregation results: ${JSON.stringify(results)}`);

    // Handle case where no results are returned
    if (!results || results.length === 0 || !results[0]) {
      return createPaginationResult([], 0, options);
    }

    const result = results[0];
    const data = result.data || [];
    const totalCount = result.totalCount?.[0]?.total || 0;

    // Additional safety check for data integrity
    if (!Array.isArray(data)) {
      this.logger.warn(
        'Aggregation returned non-array data, defaulting to empty array',
      );
      return createPaginationResult([], totalCount, options);
    }

    // Decrypt student emails in the results
    const decryptedData = data.map(item => {
      if (item.student && item.student.email) {
        // Decrypt the student email
        item.student.email = this.emailEncryptionService.decryptEmail(item.student.email);
      }
      return item;
    });

    return createPaginationResult(decryptedData, totalCount, options);
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
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'LEARNING_LOGS',
          'LEARNING_LOG_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Decrypt student email in the result
    const result = results[0];
    if (result.student && result.student.email) {
      result.student.email = this.emailEncryptionService.decryptEmail(result.student.email);
    }

    return result;
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

  async createLearningLogReview(
    aiFeedbackId: string,
    createReviewDto: CreateLearningLogReviewDto,
    user: JWTUserPayload,
  ): Promise<LearningLogReviewResponseDto> {
    this.logger.log(`Received review DTO: ${JSON.stringify(createReviewDto)}`);

    // Check if user can review (not a student)
    if (user.role.name === RoleEnum.STUDENT) {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'LEARNING_LOGS',
          'STUDENTS_CANNOT_REVIEW_LEARNING_LOGS',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const { connection, AIChatFeedbackModel, LearningLogReviewModel } =
      await this.getConnectionAndModels(user);

    // Check if the learning log exists
    const learningLog = await AIChatFeedbackModel.findById(aiFeedbackId);
    if (!learningLog) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'LEARNING_LOGS',
          'LEARNING_LOG_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Check if user has already reviewed this learning log
    const existingReview = await LearningLogReviewModel.findOne({
      ai_feedback_id: new Types.ObjectId(aiFeedbackId),
      reviewer_id: new Types.ObjectId(user.id),
      reviewer_role: user.role.name,
      deleted_at: null,
    });

    if (existingReview) {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'LEARNING_LOGS',
          'ALREADY_REVIEWED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Create the review
    const reviewData = {
      ai_feedback_id: new Types.ObjectId(aiFeedbackId),
      reviewer_id: new Types.ObjectId(user.id),
      reviewer_role: user.role.name,
      rating: createReviewDto.rating,
      feedback: createReviewDto.feedback,
      metadata: createReviewDto.metadata || {},
    };

    this.logger.log(
      `Creating review with metadata: ${JSON.stringify(reviewData.metadata)}`,
    );
    this.logger.log(`Full review data: ${JSON.stringify(reviewData)}`);

    const review = new LearningLogReviewModel(reviewData);

    await review.save();

    this.logger.log(`Review saved with ID: ${review._id}`);
    this.logger.log(
      `Review saved metadata: ${JSON.stringify(review.metadata)}`,
    );
    this.logger.log(
      `Review saved document: ${JSON.stringify(review.toObject())}`,
    );

    // Get reviewer information
    const reviewer = await this.userModel.findById(user.id);
    if (!reviewer) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'LEARNING_LOGS',
          'REVIEWER_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
    // Decrypt the reviewer email before returning
    const decryptedReviewer = this.emailEncryptionService.decryptEmailFields(
      reviewer,
      ['email'],
    );

    const reviewerInfo = {
      first_name: reviewer.first_name,
      last_name: reviewer.last_name,
      email: decryptedReviewer.email,
      profile_pic: reviewer.profile_pic,
    };

    // Create notification for the student
    if (!user.school_id) {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'LEARNING_LOGS',
          'USER_SCHOOL_ID_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
    await this.notificationsService.createMultiLanguageNotification(
      new Types.ObjectId(learningLog.student_id.toString()),
      RecipientTypeEnum.STUDENT,
      'Learning Log Reviewed',
      "Journal d'Apprentissage Révisé",
      `${reviewerInfo.first_name} ${reviewerInfo.last_name} has reviewed your learning log and given you a ${createReviewDto.rating}-star rating.`,
      `${reviewerInfo.first_name} ${reviewerInfo.last_name} a révisé votre journal d'apprentissage et vous a donné une note de ${createReviewDto.rating} étoiles.`,
      NotificationTypeEnum.LEARNING_LOG_REVIEWED,
      {
        ai_feedback_id: aiFeedbackId,
        reviewer_id: user.id,
        reviewer_role: user.role.name,
        rating: createReviewDto.rating,
        review_id: review._id,
      },
      new Types.ObjectId(user.school_id.toString()),
    );

    const response = {
      _id: review._id.toString(),
      ai_feedback_id: review.ai_feedback_id.toString(),
      reviewer_id: review.reviewer_id.toString(),
      reviewer_role: review.reviewer_role,
      rating: review.rating,
      feedback: review.feedback,
      metadata: review.metadata,
      reviewer_info: reviewerInfo,
      created_at: review.created_at!,
      updated_at: review.updated_at!,
    };

    this.logger.log(
      `Returning response with metadata: ${JSON.stringify(response.metadata)}`,
    );

    return response;
  }

  async getLearningLogReview(
    aiFeedbackId: string,
    user: JWTUserPayload,
  ): Promise<LearningLogReviewResponseDto | null> {
    const { LearningLogReviewModel } = await this.getConnectionAndModels(user);

    const review = await LearningLogReviewModel.findOne({
      ai_feedback_id: new Types.ObjectId(aiFeedbackId),
      reviewer_id: new Types.ObjectId(user.id),
      reviewer_role: user.role.name,
      deleted_at: null,
    }).lean();

    if (!review) {
      return null;
    }

    // Get reviewer information
    const reviewer = await this.userModel.findById(user.id);
    if (!reviewer) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'LEARNING_LOGS',
          'REVIEWER_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
    // Decrypt the reviewer email before returning
    const decryptedReviewer = this.emailEncryptionService.decryptEmailFields(
      reviewer,
      ['email'],
    );

    const reviewerInfo = {
      first_name: reviewer.first_name,
      last_name: reviewer.last_name,
      email: decryptedReviewer.email,
      profile_pic: reviewer.profile_pic,
    };

    const response = {
      _id: review._id.toString(),
      ai_feedback_id: review.ai_feedback_id.toString(),
      reviewer_id: review.reviewer_id.toString(),
      reviewer_role: review.reviewer_role,
      rating: review.rating,
      feedback: review.feedback,
      metadata: review.metadata,
      reviewer_info: reviewerInfo,
      created_at: review.created_at!,
      updated_at: review.updated_at!,
    };

    this.logger.log(
      `Retrieved review with metadata: ${JSON.stringify(response.metadata)}`,
    );

    return response;
  }

  async exportLearningLogs(
    user: JWTUserPayload,
    filterDto?: LearningLogsFilterDto,
  ): Promise<LearningLogsExportResponseDto> {
    this.logger.log(`Exporting learning logs for user: ${user.id}`);

    const { connection, AIChatFeedbackModel } =
      await this.getConnectionAndModel(user);

    // Build aggregation pipeline without pagination for export
    const pipeline = this.buildAggregationPipeline(user, filterDto);

    this.logger.log(`Export pipeline stages: ${pipeline.length}`);

    // Execute aggregation to get all data
    const results = await AIChatFeedbackModel.aggregate(pipeline);

    this.logger.log(`Export aggregation results count: ${results.length}`);

    // Handle case where no results are returned
    if (!results || results.length === 0) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'LEARNING_LOGS',
          'NO_LEARNING_LOGS_FOUND_FOR_EXPORT',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // For export (without pagination), results is a direct array of documents
    // For paginated queries, results[0] contains { data: [...], totalCount: [...] }
    let data: any[];
    if (results.length === 1 && results[0].data) {
      // Paginated structure
      data = results[0].data || [];
    } else {
      // Direct array structure (export case)
      data = results;
    }

    // Additional safety check for data integrity
    if (!Array.isArray(data)) {
      this.logger.warn(
        'Aggregation returned non-array data, defaulting to empty array',
      );
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'LEARNING_LOGS',
          'NO_LEARNING_LOGS_FOUND_FOR_EXPORT',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Transform data for CSV export - removing IDs and technical fields
    const csvData = data.map((log: any) => {
      // Decrypt student email if it exists
      let decryptedStudentEmail = 'N/A';
      if (log.student?.email) {
        const decryptedStudent = this.emailEncryptionService.decryptEmailFields(
          log.student,
          ['email'],
        );
        decryptedStudentEmail = decryptedStudent.email;
      }

      return {
        'Student Name': log.student
          ? `${log.student.first_name} ${log.student.last_name}`.trim()
          : 'N/A',
        'Student Email': decryptedStudentEmail,
        'Module Title': log.module?.title || 'N/A',
        'Module Subject': log.module?.subject || 'N/A',
        'Module Difficulty': log.module?.difficulty || 'N/A',
        'Session Status': log.session?.status || 'N/A',
        'Session Start Date': log.session?.started_at
          ? new Date(log.session.started_at).toISOString()
          : 'N/A',
        'Session End Date': log.session?.ended_at
          ? new Date(log.session.ended_at).toISOString()
          : 'N/A',
        'Primary Skill Gap':
          Array.isArray(log.skill_gaps) && log.skill_gaps.length > 0
            ? log.skill_gaps[0]
            : 'N/A',
        'Skill Gaps': Array.isArray(log.skill_gaps)
          ? log.skill_gaps.join('; ')
          : 'N/A',
        Strengths: Array.isArray(log.strengths)
          ? log.strengths.join('; ')
          : 'N/A',
        'Areas for Improvement': Array.isArray(log.areas_for_improvement)
          ? log.areas_for_improvement.join('; ')
          : 'N/A',
        'Missed Opportunities': Array.isArray(log.missed_opportunities)
          ? log.missed_opportunities.join('; ')
          : 'N/A',
        Suggestions: Array.isArray(log.suggestions)
          ? log.suggestions.join('; ')
          : 'N/A',
        'Keywords for Learning': Array.isArray(log.keywords_for_learning)
          ? log.keywords_for_learning.join('; ')
          : 'N/A',
        'Overall Rating': log.rating?.overall_score || 'N/A',
        'Communication Rating': log.rating?.communication_score || 'N/A',
        'Professionalism Rating': log.rating?.professionalism_score || 'N/A',
        Status: log.status || 'N/A',
        'Feedback Created At': log.created_at
          ? new Date(log.created_at).toISOString()
          : 'N/A',
        'Feedback Updated At': log.updated_at
          ? new Date(log.updated_at).toISOString()
          : 'N/A',
        'Review Rating': log.user_review?.[0]?.rating || 'N/A',
        'Review Feedback': log.user_review?.[0]?.feedback || 'N/A',
        'Reviewer Role': log.user_review?.[0]?.reviewer_role || 'N/A',
        'Review Created At': log.user_review?.[0]?.created_at
          ? new Date(log.user_review[0].created_at).toISOString()
          : 'N/A',
      };
    });

    // Define CSV headers - removing IDs and technical fields
    const headers = [
      'Student Name',
      'Student Email',
      'Module Title',
      'Module Subject',
      'Module Difficulty',
      'Session Status',
      'Session Start Date',
      'Session End Date',
      'Primary Skill Gap',
      'Skill Gaps',
      'Strengths',
      'Areas for Improvement',
      'Missed Opportunities',
      'Suggestions',
      'Keywords for Learning',
      'Overall Rating',
      'Communication Rating',
      'Professionalism Rating',
      'Status',
      'Feedback Created At',
      'Feedback Updated At',
      'Review Rating',
      'Review Feedback',
      'Reviewer Role',
      'Review Created At',
    ];

    // Generate CSV file using storage service
    const filePath = await this.csvUtil.generateCSVFile({
      filename: 'learning-logs-export',
      headers,
      data: csvData,
      includeTimestamp: true,
    });

    // Get file info and download URL
    const filename = filePath.split('/').pop() || 'learning-logs-export.csv';
    const fileSize = this.csvUtil.getFileSize(filePath);
    const downloadUrl = await this.csvUtil.generateDownloadUrl(filename);

    this.logger.log(
      `CSV export completed: ${filePath}, Size: ${fileSize} bytes, Records: ${csvData.length}`,
    );

    return {
      filename,
      file_path: filePath,
      file_size: fileSize,
      record_count: csvData.length,
      exported_at: new Date(),
      storage_type: process.env.NODE_ENV === 'production' ? 's3' : 'local',
      download_url: downloadUrl,
      applied_filters: filterDto
        ? {
            text: filterDto.text,
            module_id: filterDto.module_id,
            skill_gap: filterDto.skill_gap,
            start_date: filterDto.start_date,
            end_date: filterDto.end_date,
          }
        : undefined,
    };
  }

  /**
   * Get CSV file content for download
   */
  async getCSVFileContent(
    filename: string,
  ): Promise<{ content: Buffer; contentType: string }> {
    return this.csvUtil.getFileContent(filename);
  }

  // Private helper methods
  private async getConnectionAndModel(user: JWTUserPayload) {
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'LEARNING_LOGS',
          'SCHOOL_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
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

  private async getConnectionAndModels(user: JWTUserPayload) {
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'LEARNING_LOGS',
          'SCHOOL_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );

    const AIChatFeedbackModel = connection.model(
      AIChatFeedback.name,
      AIChatFeedbackSchema,
    );

    const LearningLogReviewModel = connection.model(
      LearningLogReview.name,
      LearningLogReviewSchema,
    );

    this.logger.log(
      `LearningLogReviewModel created: ${LearningLogReviewModel.modelName}`,
    );
    this.logger.log(
      `Schema fields: ${Object.keys(LearningLogReviewSchema.paths)}`,
    );

    return { connection, AIChatFeedbackModel, LearningLogReviewModel };
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
      // Add text filter stage after module lookup
      ...(filterDto?.text
        ? [this.buildTextFilterStage(filterDto)].filter(Boolean)
        : []),
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
            moduleId: '$module_id',
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
              $unwind: '$skill_gaps',
            },
            {
              $group: {
                _id: '$skill_gaps',
                count: { $sum: 1 },
              },
            },
          ],
          as: 'all_skill_gap_counts',
        },
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
          // Include only the fields we need for CSV export
          _id: 1,
          rating: 1,
          skill_gaps: 1,
          strengths: 1,
          areas_for_improvement: 1,
          missed_opportunities: 1,
          suggestions: 1,
          keywords_for_learning: 1,
          created_at: 1,
          updated_at: 1,
          status: 1,
          frequency: 1,
          session: 1,
          module: 1,
          student: 1,
          user_review: 1,
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
                                  else: null,
                                },
                              },
                            },
                          },
                          0,
                        ],
                      },
                      0,
                    ],
                  },
                ],
              },
            },
          },
          status: '$status',
        },
      },

      // Add review lookup stages
      ...this.buildReviewLookupStages(user),

      // Add can_review flag
      {
        $addFields: {
          can_review: {
            $cond: {
              if: {
                $and: [
                  { $ne: ['$user_review', []] },
                  { $ne: [{ $literal: user.role.name }, 'STUDENT'] },
                ],
              },
              then: false,
              else: {
                $ne: [{ $literal: user.role.name }, 'STUDENT'],
              },
            },
          },
        },
      },

      ...(paginationOptions
        ? [
            {
              $facet: {
                data: [
                  { $skip: paginationOptions.skip },
                  { $limit: paginationOptions.limit },
                ],
                totalCount: [{ $count: 'total' }],
              },
            },
          ]
        : []),
    ];

    this.logger.log(
      `Built pipeline for user ${user.role.name} with ${pipeline.length} stages`,
    );
    return pipeline;
  }

  private buildReviewLookupStages(user: JWTUserPayload): any[] {
    if (user.role.name === RoleEnum.STUDENT) {
      return [
        {
          $addFields: {
            user_review: [],
          },
        },
        {
          $lookup: {
            from: 'learning_log_reviews',
            let: {
              aiFeedbackId: '$_id',
              currentUserId: { $literal: new Types.ObjectId(user.id) },
              currentUserRole: { $literal: user.role.name },
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$ai_feedback_id', '$$aiFeedbackId'] },
                      { $eq: ['$deleted_at', null] },
                    ],
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  rating: 1,
                  feedback: 1,
                  reviewer_role: 1,
                  created_at: 1,
                },
              },
            ],
            as: 'user_review',
          },
        },
      ];
    }

    return [
      {
        $addFields: {
          user_review: [],
        },
      },
      {
        $lookup: {
          from: 'learning_log_reviews',
          let: {
            aiFeedbackId: '$_id',
            currentUserId: { $literal: new Types.ObjectId(user.id) },
            currentUserRole: { $literal: user.role.name },
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$ai_feedback_id', '$$aiFeedbackId'] },
                    { $eq: ['$reviewer_id', '$$currentUserId'] },
                    { $eq: ['$reviewer_role', '$$currentUserRole'] },
                    { $eq: ['$deleted_at', null] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                rating: 1,
                feedback: 1,
                reviewer_role: 1,
                created_at: 1,
              },
            },
          ],
          as: 'user_review',
        },
      },
    ];
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
            moduleId: '$module_id',
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
              $unwind: '$skill_gaps',
            },
            {
              $group: {
                _id: '$skill_gaps',
                count: { $sum: 1 },
              },
            },
          ],
          as: 'all_skill_gap_counts',
        },
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
                                  else: null,
                                },
                              },
                            },
                          },
                          0,
                        ],
                      },
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
      },

      // Add review lookup stages
      ...this.buildReviewLookupStages(user),

      // Add can_review flag
      {
        $addFields: {
          can_review: {
            $cond: {
              if: {
                $and: [
                  { $ne: ['$user_review', []] },
                  { $ne: [{ $literal: user.role.name }, 'STUDENT'] },
                ],
              },
              then: false,
              else: {
                $ne: [{ $literal: user.role.name }, 'STUDENT'],
              },
            },
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

    if (!filterDto) {
      return conditions;
    }

    if (filterDto.module_id) {
      conditions.module_id = new Types.ObjectId(filterDto.module_id);
    }

    if (filterDto.skill_gap) {
      conditions.skill_gaps = filterDto.skill_gap;
    }

    if (filterDto.start_date || filterDto.end_date) {
      const dateRange: any = {};
      if (filterDto.start_date) {
        dateRange.$gte = new Date(`${filterDto.start_date}T00:00:00.000Z`);
      }
      if (filterDto.end_date) {
        dateRange.$lte = new Date(`${filterDto.end_date}T23:59:59.999Z`);
      }

      conditions.created_at = dateRange;
      conditions.updated_at = dateRange;
    }

    return conditions;
  }

  private buildTextFilterStage(filterDto?: LearningLogsFilterDto) {
    if (!filterDto?.text) {
      return null;
    }

    return {
      $match: {
        $or: [
          {
            'module.title': {
              $regex: filterDto.text,
              $options: 'i',
            },
          },
          {
            'module.description': {
              $regex: filterDto.text,
              $options: 'i',
            },
          },
        ],
      },
    };
  }
}
