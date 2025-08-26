import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/database/schemas/central/user.schema';
import { School } from 'src/database/schemas/central/school.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { RoleEnum } from 'src/common/constants/roles.constant';
import {
  ForumDiscussion,
  ForumDiscussionSchema,
  DiscussionTypeEnum,
  DiscussionStatusEnum,
  VideoPlatformEnum,
} from 'src/database/schemas/tenant/forum-discussion.schema';
import {
  ForumReply,
  ForumReplySchema,
  ReplyStatusEnum,
} from 'src/database/schemas/tenant/forum-reply.schema';
import {
  ForumLike,
  ForumLikeSchema,
  LikeEntityTypeEnum,
} from 'src/database/schemas/tenant/forum-like.schema';
import {
  ForumPin,
  ForumPinSchema,
} from 'src/database/schemas/tenant/forum-pin.schema';
import {
  ForumMention,
  ForumMentionSchema,
} from 'src/database/schemas/tenant/forum-mention.schema';
import {
  ForumAttachment,
  ForumAttachmentSchema,
  AttachmentEntityTypeEnum,
  AttachmentStatusEnum,
} from 'src/database/schemas/tenant/forum-attachment.schema';
import { PinDiscussionDto } from './dto/pin-discussion.dto';

import {
  SchoolMembersFilterDto,
  MemberRoleEnum,
} from './dto/school-members-filter.dto';

import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { ReportContentDto } from './dto/report-content.dto';
import { DiscussionFilterDto } from './dto/discussion-filter.dto';
import { CreateForumAttachmentDto } from './dto/forum-attachment.dto';
import { DeleteForumAttachmentDto } from './dto/delete-forum-attachment.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  getPaginationOptions,
  createPaginationResult,
} from 'src/common/utils/pagination.util';
import {
  attachUserDetails,
  attachUserDetailsToEntity,
} from 'src/common/utils/user-details.util';
import {
  ForumReport,
  ForumReportSchema,
  ReportEntityTypeEnum,
  ReportStatusEnum,
} from 'src/database/schemas/tenant/forum-report.schema';
import {
  ForumView,
  ForumViewSchema,
} from 'src/database/schemas/tenant/forum-view.schema';
import { NotificationsService } from 'src/modules/notifications/notifications.service';
import { NotificationTypeEnum } from 'src/common/constants/notification.constant';
import { RecipientTypeEnum } from 'src/database/schemas/tenant/notification.schema';
import {
  Student,
  StudentSchema,
} from 'src/database/schemas/tenant/student.schema';
import {
  resolveMentions,
  extractMentions,
  formatMentionsInContent,
  MentionInfo,
} from 'src/common/utils/mention.util';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { DEFAULT_LANGUAGE } from 'src/common/constants/language.constant';
import { CSVUtil } from 'src/common/utils/csv.util';
import { ExportDiscussionsDto } from './dto/export-discussions.dto';
import { ExportDiscussionsResponseDto } from './dto/export-discussions-response.dto';
import { EmailEncryptionService } from 'src/common/services/email-encryption.service';

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly notificationsService: NotificationsService,
    private readonly errorMessageService: ErrorMessageService,
    private readonly csvUtil: CSVUtil,
    private readonly emailEncryptionService: EmailEncryptionService,
  ) {}

  /**
   * Helper method to resolve school_id based on user role
   */
  private resolveSchoolId(
    user: JWTUserPayload,
    bodySchoolId?: string | Types.ObjectId,
  ): string {
    if (user.role.name === RoleEnum.SUPER_ADMIN) {
      if (!bodySchoolId) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'SUPER_ADMIN_SCHOOL_ID_REQUIRED',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
      return bodySchoolId.toString();
    } else {
      if (!user.school_id) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'SCHOOL',
            'USER_SCHOOL_ID_NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
      return user.school_id.toString();
    }
  }

  /**
   * Create a new forum discussion
   */
  async createDiscussion(
    createDiscussionDto: CreateDiscussionDto | any, // Allow both DTOs
    user: JWTUserPayload,
  ) {
    const {
      school_id,
      title,
      content,
      type,
      tags,
      attachments,
      mentions,
      meeting_link,
      meeting_platform,
      meeting_scheduled_at,
      meeting_duration_minutes,
    } = createDiscussionDto;

    this.logger.log(`Creating discussion: ${title} by user: ${user.id}`);

    // Validate that only professors and admins can create meeting discussions
    if (type === DiscussionTypeEnum.MEETING) {
      if (
        ![
          RoleEnum.PROFESSOR,
          RoleEnum.SCHOOL_ADMIN,
          RoleEnum.SUPER_ADMIN,
        ].includes(user.role.name as RoleEnum)
      ) {
        throw new ForbiddenException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'ONLY_PROFESSORS_ADMINS_CAN_CREATE_MEETING',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    }

    const resolvedSchoolId = this.resolveSchoolId(user, school_id);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const DiscussionModel = tenantConnection.model(
      ForumDiscussion.name,
      ForumDiscussionSchema,
    );

    try {
      // Validate meeting fields if type is MEETING
      if (type === DiscussionTypeEnum.MEETING) {
        if (!meeting_link || !meeting_platform || !meeting_scheduled_at) {
          throw new BadRequestException(
            this.errorMessageService.getMessageWithLanguage(
              'COMMUNITY',
              'MEETING_FIELDS_REQUIRED',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }
      }

      // Extract mentions from content if not provided
      const extractedMentions = mentions || extractMentions(content);

      // Resolve mentions to user IDs
      const resolvedMentions = await resolveMentions(
        extractedMentions,
        tenantConnection,
        this.userModel,
      );

      // Format content with mention links
      const formattedContent = formatMentionsInContent(
        content,
        resolvedMentions,
      );

      // Create discussion
      const newDiscussion = new DiscussionModel({
        title,
        content: formattedContent,
        type,
        tags: tags || [],
        created_by: new Types.ObjectId(user.id),
        created_by_role: user.role.name as RoleEnum,
        ...(type === DiscussionTypeEnum.MEETING && {
          meeting_link,
          meeting_platform,
          meeting_scheduled_at: meeting_scheduled_at
            ? new Date(meeting_scheduled_at)
            : undefined,
          meeting_duration_minutes,
        }),
      });

      const savedDiscussion = await newDiscussion.save();

      // If there are attachments, create them
      if (attachments && attachments.length > 0) {
        const AttachmentModel = tenantConnection.model(
          ForumAttachment.name,
          ForumAttachmentSchema,
        );

        for (const attachment of attachments) {
          await this.createForumAttachment(
            {
              discussion_id: savedDiscussion._id,
              reply_id: undefined, // No reply for discussion attachments
              entity_type: AttachmentEntityTypeEnum.DISCUSSION,
              original_filename: attachment.original_filename,
              stored_filename: attachment.stored_filename,
              file_url: attachment.file_url,
              mime_type: attachment.mime_type,
              file_size: attachment.file_size,
            },
            user,
          );
        }
      }

      // Create mention records
      const MentionModel = tenantConnection.model(
        ForumMention.name,
        ForumMentionSchema,
      );

      const mentionPromises = resolvedMentions.map(async (mention) => {
        if (mention.userId) {
          const mentionRecord = new MentionModel({
            discussion_id: savedDiscussion._id,
            mentioned_by: new Types.ObjectId(user.id),
            mentioned_user: mention.userId,
            mention_text: mention.mentionText,
          });
          return mentionRecord.save();
        }
      });

      await Promise.all(mentionPromises.filter(Boolean));

      // Get user details for notifications
      const userDetails = await this.getUserDetails(
        user.id.toString(),
        user.role.name,
        tenantConnection,
      );

      // Send notifications to all school members about new discussion
      await this.notifyNewDiscussion(
        savedDiscussion,
        userDetails,
        resolvedSchoolId,
        tenantConnection,
      );

      // Send notifications to mentioned users
      await this.notifyMentionedUsersInDiscussion(
        savedDiscussion,
        userDetails,
        resolvedMentions,
        resolvedSchoolId,
      );

      // Attach user details to the response
      const discussionWithUser = {
        ...savedDiscussion.toObject(),
        created_by_user: userDetails || null,
        mentions: resolvedMentions,
      };

      this.logger.log(`Discussion created: ${savedDiscussion._id}`);

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'COMMUNITY',
          'DISCUSSION_CREATED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: discussionWithUser,
      };
    } catch (error) {
      this.logger.error('Error creating discussion', error?.stack || error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'CREATE_DISCUSSION_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Get all discussions with filtering and pagination
   */
  async findAllDiscussions(
    user: JWTUserPayload,
    filterDto?: DiscussionFilterDto,
    paginationDto?: PaginationDto,
  ) {
    this.logger.log(`Finding discussions for user: ${user.id}`);

    try {
      const resolvedSchoolId = this.resolveSchoolId(user);

      // Validate school exists
      const school = await this.schoolModel.findById(resolvedSchoolId);
      if (!school) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'SCHOOL',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Get tenant connection
      const tenantConnection =
        await this.tenantConnectionService.getTenantConnection(school.db_name);
      const DiscussionModel = tenantConnection.model(
        ForumDiscussion.name,
        ForumDiscussionSchema,
      );

      const options = getPaginationOptions(paginationDto || {});

      // Build simple filter first
      const filter: any = {
        deleted_at: null,
      };

      // Apply status filtering logic
      if (filterDto?.status) {
        // If a specific status is requested, apply it based on user permissions
        if (user.role.name === RoleEnum.STUDENT) {
          // Students can only see ACTIVE discussions
          if (filterDto.status === DiscussionStatusEnum.ACTIVE) {
            filter.status = DiscussionStatusEnum.ACTIVE;
          } else {
            // If student requests non-ACTIVE status, still only show ACTIVE
            filter.status = DiscussionStatusEnum.ACTIVE;
          }
        } else if (user.role.name === RoleEnum.PROFESSOR) {
          // Professors can see ACTIVE and ARCHIVED discussions
          if (
            [
              DiscussionStatusEnum.ACTIVE,
              DiscussionStatusEnum.ARCHIVED,
            ].includes(filterDto.status)
          ) {
            filter.status = filterDto.status;
          } else {
            // If professor requests other status, fall back to ACTIVE
            filter.status = DiscussionStatusEnum.ACTIVE;
          }
        } else if (
          [RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN].includes(
            user.role.name as RoleEnum,
          )
        ) {
          // Admins can see all statuses
          filter.status = filterDto.status;
        }
      } else {
        // If no status is specified, default to ACTIVE for all users
        filter.status = DiscussionStatusEnum.ACTIVE;
      }

      // Apply additional filters
      if (filterDto?.type) {
        filter.type = filterDto.type;
      }

      if (filterDto?.search) {
        filter.$or = [
          { title: { $regex: filterDto.search, $options: 'i' } },
          { content: { $regex: filterDto.search, $options: 'i' } },
        ];
      }

      if (filterDto?.tags && filterDto.tags.trim() !== '') {
        // Parse tags string (comma-separated or pipe-separated)
        const tagArray = filterDto.tags
          .split(/[,|]/) // Split by comma or pipe
          .map((tag) => tag.trim()) // Trim whitespace
          .filter((tag) => tag !== ''); // Remove empty tags

        if (tagArray.length > 0) {
          filter.tags = { $in: tagArray };
        }
      }

      if (filterDto?.author_id) {
        filter.created_by = new Types.ObjectId(filterDto.author_id);
      }

      this.logger.debug(`Filter query: ${JSON.stringify(filter)}`);

      // Use aggregation pipeline for better performance
      const aggregationPipeline: any[] = [
        { $match: filter },
        {
          $lookup: {
            from: 'forum_pins',
            let: { discussionId: '$_id', userId: new Types.ObjectId(user.id) },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$discussion_id', '$$discussionId'] },
                      { $eq: ['$pinned_by', '$$userId'] },
                    ],
                  },
                },
              },
            ],
            as: 'userPin',
          },
        },
        {
          $addFields: {
            is_pinned: { $gt: [{ $size: '$userPin' }, 0] },
            pinned_at: { $arrayElemAt: ['$userPin.created_at', 0] },
          },
        },
        {
          $lookup: {
            from: 'forum_replies',
            let: { discussionId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$discussion_id', '$$discussionId'] },
                  parent_reply_id: null, // Only top-level replies
                  deleted_at: null,
                  status: ReplyStatusEnum.ACTIVE,
                },
              },
              { $sort: { created_at: -1 } },
              { $limit: 1 },
              {
                $lookup: {
                  from: 'students',
                  localField: 'created_by',
                  foreignField: '_id',
                  as: 'lastReplyUser',
                },
              },
              {
                $addFields: {
                  last_reply_user: {
                    $cond: {
                      if: { $gt: [{ $size: '$lastReplyUser' }, 0] },
                      then: {
                        _id: { $arrayElemAt: ['$lastReplyUser._id', 0] },
                        first_name: {
                          $arrayElemAt: ['$lastReplyUser.first_name', 0],
                        },
                        last_name: {
                          $arrayElemAt: ['$lastReplyUser.last_name', 0],
                        },
                        email: { $arrayElemAt: ['$lastReplyUser.email', 0] },
                        image: { $arrayElemAt: ['$lastReplyUser.image', 0] },
                        role: 'STUDENT',
                      },
                      else: null, // Will be populated later for professors/admins
                    },
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  content: 1,
                  created_by: 1,
                  created_by_role: 1,
                  created_at: 1,
                  last_reply_user: 1,
                },
              },
            ],
            as: 'lastReply',
          },
        },
        {
          $addFields: {
            last_reply_date: {
              $ifNull: ['$last_reply.created_at', '$created_at'],
            },
          },
        },
        {
          $lookup: {
            from: 'students',
            localField: 'created_by',
            foreignField: '_id',
            as: 'createdByStudent',
          },
        },
        {
          $addFields: {
            created_by_user: {
              $cond: {
                if: { $gt: [{ $size: '$createdByStudent' }, 0] },
                then: {
                  _id: { $arrayElemAt: ['$createdByStudent._id', 0] },
                  first_name: {
                    $arrayElemAt: ['$createdByStudent.first_name', 0],
                  },
                  last_name: {
                    $arrayElemAt: ['$createdByStudent.last_name', 0],
                  },
                  email: { $arrayElemAt: ['$createdByStudent.email', 0] },
                  image: { $arrayElemAt: ['$createdByStudent.image', 0] },
                  profile_pic: {
                    $arrayElemAt: ['$createdByStudent.profile_pic', 0],
                  },
                  role: 'STUDENT',
                },
                else: null, // Will be populated later for professors/admins
              },
            },
          },
        },
        {
          $lookup: {
            from: 'forum_views',
            let: { discussionId: '$_id', userId: new Types.ObjectId(user.id) },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$discussion_id', '$$discussionId'] },
                      { $eq: ['$user_id', '$$userId'] },
                    ],
                  },
                },
              },
            ],
            as: 'userView',
          },
        },
        {
          $addFields: {
            is_unread: {
              $cond: {
                if: { $eq: [{ $size: '$userView' }, 0] },
                then: true,
                else: {
                  $gt: [
                    '$created_at',
                    { $arrayElemAt: ['$userView.viewed_at', 0] },
                  ],
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: 'forum_likes',
            let: { discussionId: '$_id', userId: new Types.ObjectId(user.id) },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$entity_id', '$$discussionId'] },
                      { $eq: ['$entity_type', 'DISCUSSION'] },
                      { $eq: ['$liked_by', '$$userId'] },
                    ],
                  },
                },
              },
            ],
            as: 'userLike',
          },
        },
        {
          $addFields: {
            has_liked: { $gt: [{ $size: '$userLike' }, 0] },
            liked_at: { $arrayElemAt: ['$userLike.created_at', 0] },
          },
        },
        {
          $addFields: {
            last_reply_date: {
              $ifNull: ['$last_reply.created_at', '$created_at'],
            },
          },
        },
        {
          $lookup: {
            from: 'forum_attachments',
            let: { discussionId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$discussion_id', '$$discussionId'] },
                  reply_id: null, // Only discussion attachments
                  status: AttachmentStatusEnum.ACTIVE,
                  deleted_at: null,
                },
              },
              { $sort: { created_at: 1 } },
              {
                $lookup: {
                  from: 'students',
                  localField: 'uploaded_by',
                  foreignField: '_id',
                  as: 'uploadedByStudent',
                },
              },
              {
                $addFields: {
                  uploaded_by_user: {
                    $cond: {
                      if: { $gt: [{ $size: '$uploadedByStudent' }, 0] },
                      then: {
                        _id: { $arrayElemAt: ['$uploadedByStudent._id', 0] },
                        first_name: {
                          $arrayElemAt: ['$uploadedByStudent.first_name', 0],
                        },
                        last_name: {
                          $arrayElemAt: ['$uploadedByStudent.last_name', 0],
                        },
                        email: {
                          $arrayElemAt: ['$uploadedByStudent.email', 0],
                        },
                        image: {
                          $arrayElemAt: ['$uploadedByStudent.image', 0],
                        },
                        role: 'STUDENT',
                      },
                      else: null, // Will be populated later for professors/admins
                    },
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  original_filename: 1,
                  stored_filename: 1,
                  file_url: 1,
                  mime_type: 1,
                  file_size: 1,
                  created_at: 1,
                  uploaded_by_user: 1,
                },
              },
            ],
            as: 'attachments',
          },
        },
        {
          $sort: {
            is_pinned: -1, // Pinned discussions first
            last_reply_date: -1, // Sort by last reply date or discussion creation date
          },
        },
        { $skip: options.skip },
        { $limit: options.limit },
        {
          $project: {
            // Include all base discussion fields
            _id: 1,
            title: 1,
            content: 1,
            type: 1,
            tags: 1,
            created_by: 1,
            created_by_role: 1,
            reply_count: 1,
            view_count: 1,
            like_count: 1,
            status: 1,
            created_at: 1,
            updated_at: 1,
            archived_at: 1,
            archived_by: 1,
            deleted_at: 1,
            deleted_by: 1,
            last_reply_at: 1,

            // Explicitly include meeting fields
            meeting_link: 1,
            meeting_platform: 1,
            meeting_scheduled_at: 1,
            meeting_duration_minutes: 1,

            // Include computed fields
            is_pinned: 1,
            pinned_at: 1,
            last_reply: 1,
            created_by_user: 1,
            is_unread: 1,
            has_liked: 1,
            liked_at: 1,
            is_upcoming_meeting: 1,
            meeting_priority: 1,
            meeting_status: 1,
            meeting_time_until: 1,
            meeting_end_time: 1,
            is_meeting_ongoing: 1,
            attachments: 1,
          },
        },
      ];

      // Execute aggregation pipeline
      const [discussions, total] = await Promise.all([
        DiscussionModel.aggregate(aggregationPipeline),
        DiscussionModel.countDocuments(filter),
      ]);

      this.logger.debug(`Found ${discussions.length} discussions`);
      console.log(discussions);

      // Process discussions and populate user details
      for (const discussion of discussions) {
        // If created_by_user is null (professor/admin), populate it using getUserDetails
        if (
          !discussion.created_by_user &&
          discussion.created_by &&
          discussion.created_by_role
        ) {
          this.logger.debug(
            `Populating user details for discussion ${discussion._id} created by ${discussion.created_by}`,
          );
          discussion.created_by_user = await this.getUserDetails(
            discussion.created_by.toString(),
            discussion.created_by_role,
            tenantConnection,
          );
        }

        // If last_reply_user is null (professor/admin), populate it using getUserDetails
        if (
          !discussion.last_reply_user &&
          discussion.last_reply &&
          discussion.last_reply.created_by &&
          discussion.last_reply.created_by_role
        ) {
          this.logger.debug(
            `Populating last reply user details for discussion ${discussion._id}`,
          );
          discussion.last_reply_user = await this.getUserDetails(
            discussion.last_reply.created_by.toString(),
            discussion.last_reply.created_by_role,
            tenantConnection,
          );
        }

        // Decrypt email in created_by_user
        if (discussion.created_by_user && discussion.created_by_user.email) {
          discussion.created_by_user.email =
            this.emailEncryptionService.decryptEmail(
              discussion.created_by_user.email,
            );
        }

        // Decrypt email in last_reply_user if it exists
        if (discussion.last_reply_user && discussion.last_reply_user.email) {
          discussion.last_reply_user.email =
            this.emailEncryptionService.decryptEmail(
              discussion.last_reply_user.email,
            );
        }

        // Process attachments and populate professor details
        if (discussion.attachments && Array.isArray(discussion.attachments)) {
          for (const attachment of discussion.attachments) {
            // If uploaded_by_user is null (professor/admin), populate it using getUserDetails
            if (
              !attachment.uploaded_by_user &&
              attachment.uploaded_by &&
              attachment.uploaded_by_role
            ) {
              this.logger.debug(
                `Populating uploaded_by_user for attachment ${attachment._id}`,
              );
              attachment.uploaded_by_user = await this.getUserDetails(
                attachment.uploaded_by.toString(),
                attachment.uploaded_by_role,
                tenantConnection,
              );
            }

            // Decrypt email in uploaded_by_user if it exists
            if (
              attachment.uploaded_by_user &&
              attachment.uploaded_by_user.email
            ) {
              attachment.uploaded_by_user.email =
                this.emailEncryptionService.decryptEmail(
                  attachment.uploaded_by_user.email,
                );
            }
          }
        }
      }

      const result = createPaginationResult(discussions, total, options);

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'COMMUNITY',
          'DISCUSSIONS_RETRIEVED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        ...result,
      };
    } catch (error) {
      this.logger.error('Error finding discussions', error?.stack || error);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'RETRIEVE_DISCUSSIONS_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Get a single discussion by ID
   */
  async findDiscussionById(discussionId: string, user: JWTUserPayload) {
    this.logger.log(`Finding discussion: ${discussionId}`);

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const DiscussionModel = tenantConnection.model(
      ForumDiscussion.name,
      ForumDiscussionSchema,
    );

    try {
      const discussion = await DiscussionModel.findOne({
        _id: discussionId,
        deleted_at: null,
      }).lean();

      if (!discussion) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'DISCUSSION_NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Increment view count
      await DiscussionModel.updateOne(
        { _id: discussionId },
        { $inc: { view_count: 1 } },
      );

      // Mark discussion as viewed by this user
      await this.markContentAsViewed(
        new Types.ObjectId(user.id),
        discussionId,
        tenantConnection,
      );

      // Check if current user has liked this discussion
      const LikeModel = tenantConnection.model(ForumLike.name, ForumLikeSchema);
      const userLike = await LikeModel.findOne({
        entity_type: LikeEntityTypeEnum.DISCUSSION,
        entity_id: new Types.ObjectId(discussionId),
        liked_by: new Types.ObjectId(user.id),
      }).lean();

      // Attach user details
      const userDetails = await this.getUserDetails(
        discussion.created_by.toString(),
        discussion.created_by_role,
        tenantConnection,
      );

      // Get attachments for this discussion
      const AttachmentModel = tenantConnection.model(
        ForumAttachment.name,
        ForumAttachmentSchema,
      );
      const attachments = await AttachmentModel.find({
        discussion_id: new Types.ObjectId(discussionId),
        reply_id: null, // Only discussion attachments
        status: AttachmentStatusEnum.ACTIVE,
        deleted_at: null,
      })
        .sort({ created_at: 1 })
        .lean();

      // Get mentions for this discussion
      const MentionModel = tenantConnection.model(
        ForumMention.name,
        ForumMentionSchema,
      );
      const mentions = await MentionModel.find({
        discussion_id: new Types.ObjectId(discussionId),
        reply_id: null, // Only discussion-level mentions
      })
        .populate(
          'mentioned_user',
          'first_name last_name email role profile_pic',
        )
        .populate('mentioned_by', 'first_name last_name email role profile_pic')
        .sort({ created_at: 1 })
        .lean();

      // Format mentions
      const formattedMentions = mentions.map((mention) => {
        const mentionedUser = mention.mentioned_user as any;
        const mentionedBy = mention.mentioned_by as any;

        return {
          _id: mention._id,
          mentioned_user: mentionedUser
            ? {
                _id: mentionedUser._id,
                first_name: mentionedUser.first_name,
                last_name: mentionedUser.last_name,
                email: this.emailEncryptionService.decryptEmail(
                  mentionedUser.email,
                ),
                role: mentionedUser.role,
                image:
                  mentionedUser.role === RoleEnum.STUDENT
                    ? mentionedUser.image
                    : mentionedUser.profile_pic,
              }
            : null,
          mentioned_by: mentionedBy
            ? {
                _id: mentionedBy._id,
                first_name: mentionedBy.first_name,
                last_name: mentionedBy.last_name,
                email: this.emailEncryptionService.decryptEmail(
                  mentionedBy.email,
                ),
                role: mentionedBy.role,
                image:
                  mentionedBy.role === RoleEnum.STUDENT
                    ? mentionedBy.image
                    : mentionedBy.profile_pic,
              }
            : null,
          mention_text: mention.mention_text,
          created_at: mention.created_at,
        };
      });

      const formattedAttachments = await Promise.all(
        attachments.map(async (attachment) => {
          // Get user details for the uploader using getUserDetails
          let uploadedByUser: any = null;
          if (attachment.uploaded_by) {
            // Use the actual role from the attachment schema
            uploadedByUser = await this.getUserDetails(
              attachment.uploaded_by.toString(),
              attachment.uploaded_by_role,
              tenantConnection,
            );
          }

          return {
            ...attachment,
            uploaded_by_user: uploadedByUser,
          };
        }),
      );

      const discussionWithUser = {
        ...discussion,
        created_by_user: userDetails || null,
        attachments: formattedAttachments,
        mentions: formattedMentions,
        has_liked: !!userLike,
        liked_at: userLike?.created_at || null,
      };

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'COMMUNITY',
          'DISCUSSION_RETRIEVED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: discussionWithUser,
      };
    } catch (error) {
      this.logger.error('Error finding discussion', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'RETRIEVE_DISCUSSION_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Create a reply to a discussion
   */
  async createReply(
    createReplyDto: CreateReplyDto | any,
    user: JWTUserPayload,
  ) {
    const {
      school_id,
      discussion_id,
      content,
      parent_reply_id,
      mentions,
      attachments,
    } = createReplyDto;

    this.logger.log(
      `Creating reply to discussion: ${discussion_id} by user: ${user.id}`,
    );

    const resolvedSchoolId = this.resolveSchoolId(user, school_id);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const DiscussionModel = tenantConnection.model(
      ForumDiscussion.name,
      ForumDiscussionSchema,
    );
    const ReplyModel = tenantConnection.model(
      ForumReply.name,
      ForumReplySchema,
    );
    const MentionModel = tenantConnection.model(
      ForumMention.name,
      ForumMentionSchema,
    );

    try {
      // Validate discussion exists
      const discussion = await DiscussionModel.findOne({
        _id: discussion_id,
        deleted_at: null,
        status: DiscussionStatusEnum.ACTIVE,
      });

      if (!discussion) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'DISCUSSION_NOT_FOUND_OR_NOT_ACTIVE',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Validate parent reply if provided
      if (parent_reply_id) {
        const parentReply = await ReplyModel.findOne({
          _id: parent_reply_id,
          discussion_id: new Types.ObjectId(discussion_id),
          deleted_at: null,
          status: ReplyStatusEnum.ACTIVE,
        });

        if (!parentReply) {
          throw new NotFoundException(
            this.errorMessageService.getMessageWithLanguage(
              'COMMUNITY',
              'PARENT_REPLY_NOT_FOUND_OR_NOT_ACTIVE',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }
      }

      // Extract mentions from content if not provided
      const extractedMentions = mentions || extractMentions(content);

      // Resolve mentions to user IDs
      const resolvedMentions = await resolveMentions(
        extractedMentions,
        tenantConnection,
        this.userModel,
      );

      // Format content with mention links
      const formattedContent = formatMentionsInContent(
        content,
        resolvedMentions,
      );

      // Create reply
      const newReply = new ReplyModel({
        discussion_id: new Types.ObjectId(discussion_id),
        content: formattedContent,
        created_by: new Types.ObjectId(user.id),
        created_by_role: user.role.name as RoleEnum,
        ...(parent_reply_id && {
          parent_reply_id: new Types.ObjectId(parent_reply_id),
        }),
      });

      const savedReply = await newReply.save();

      // If there are attachments, create them
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          await this.createForumAttachment(
            {
              ...attachment,
              discussion_id,
              reply_id: savedReply._id,
              entity_type: AttachmentEntityTypeEnum.REPLY,
            },
            user,
          );
        }
      }

      // Create mention records
      const mentionPromises = resolvedMentions.map(async (mention) => {
        if (mention.userId) {
          const mentionRecord = new MentionModel({
            reply_id: savedReply._id,
            discussion_id: new Types.ObjectId(discussion_id),
            mentioned_by: new Types.ObjectId(user.id),
            mentioned_user: mention.userId,
            mention_text: mention.mentionText,
          });
          return mentionRecord.save();
        }
      });

      await Promise.all(mentionPromises.filter(Boolean));

      // Increment reply count on discussion
      await DiscussionModel.updateOne(
        { _id: discussion_id },
        {
          $inc: { reply_count: 1 },
          $set: { last_reply_at: new Date() },
        },
      );

      // If this is a sub-reply, increment sub_reply_count on parent reply
      if (parent_reply_id) {
        await ReplyModel.updateOne(
          { _id: parent_reply_id },
          { $inc: { sub_reply_count: 1 } },
        );
      }

      // Send notifications
      const replyCreator = await this.getUserDetails(
        user.id.toString(),
        user.role.name,
        tenantConnection,
      );
      const discussionCreator = await this.getUserDetails(
        discussion.created_by.toString(),
        discussion.created_by_role,
        tenantConnection,
      );

      if (parent_reply_id) {
        // This is a sub-reply, notify parent reply creator
        const parentReply = await ReplyModel.findById(parent_reply_id).lean();
        if (parentReply) {
          const parentReplyCreator = await this.getUserDetails(
            parentReply.created_by.toString(),
            parentReply.created_by_role,
            tenantConnection,
          );
          await this.notifyNewSubReply(
            savedReply,
            replyCreator,
            parentReply,
            parentReplyCreator,
            discussion,
            resolvedSchoolId,
          );
        }
      } else {
        // This is a top-level reply, notify discussion creator
        await this.notifyNewReply(
          savedReply,
          replyCreator,
          discussion,
          discussionCreator,
          resolvedSchoolId,
        );
      }

      // Send notifications to mentioned users
      await this.notifyMentionedUsers(
        savedReply,
        replyCreator,
        discussion,
        resolvedMentions,
        resolvedSchoolId,
      );

      // Attach user details to the response
      const userDetails = await this.getUserDetails(
        user.id.toString(),
        user.role.name,
        tenantConnection,
      );
      const replyWithUser = {
        ...savedReply.toObject(),
        created_by_user: userDetails || null,
        mentions: resolvedMentions,
      };

      this.logger.log(`Reply created: ${savedReply._id}`);

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'COMMUNITY',
          'REPLY_CREATED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: replyWithUser,
      };
    } catch (error) {
      this.logger.error('Error creating reply', error?.stack || error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'CREATE_REPLY_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Get replies for a discussion
   */
  async findRepliesByDiscussionId(
    discussionId: string,
    user: JWTUserPayload,
    paginationDto?: PaginationDto,
  ) {
    this.logger.log(`Finding replies for discussion: ${discussionId}`);

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const DiscussionModel = tenantConnection.model(
      ForumDiscussion.name,
      ForumDiscussionSchema,
    );
    const ReplyModel = tenantConnection.model(
      ForumReply.name,
      ForumReplySchema,
    );
    const MentionModel = tenantConnection.model(
      ForumMention.name,
      ForumMentionSchema,
    );

    try {
      // Validate discussion exists
      const discussion = await DiscussionModel.findOne({
        _id: discussionId,
        deleted_at: null,
      });

      if (!discussion) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'DISCUSSION_NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      const options = getPaginationOptions(paginationDto || {});

      // Use aggregation pipeline for better performance
      const aggregationPipeline: any[] = [
        {
          $match: {
            discussion_id: new Types.ObjectId(discussionId),
            parent_reply_id: null, // Only top-level replies
            deleted_at: null,
            status: ReplyStatusEnum.ACTIVE,
          },
        },
        {
          $lookup: {
            from: 'forum_mentions',
            let: { replyId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$reply_id', '$$replyId'] },
                },
              },
              {
                $lookup: {
                  from: 'students',
                  localField: 'mentioned_user',
                  foreignField: '_id',
                  as: 'mentionedStudent',
                },
              },
              {
                $addFields: {
                  mentioned_user_details: {
                    $cond: {
                      if: { $gt: [{ $size: '$mentionedStudent' }, 0] },
                      then: {
                        _id: { $arrayElemAt: ['$mentionedStudent._id', 0] },
                        first_name: {
                          $arrayElemAt: ['$mentionedStudent.first_name', 0],
                        },
                        last_name: {
                          $arrayElemAt: ['$mentionedStudent.last_name', 0],
                        },
                        email: { $arrayElemAt: ['$mentionedStudent.email', 0] },
                        image: { $arrayElemAt: ['$mentionedStudent.image', 0] },
                        role: 'STUDENT',
                      },
                      else: null, // Will be populated later for professors/admins
                    },
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  mention_text: 1,
                  created_at: 1,
                  mentioned_user_details: 1,
                },
              },
            ],
            as: 'mentions',
          },
        },
        {
          $lookup: {
            from: 'students',
            localField: 'created_by',
            foreignField: '_id',
            as: 'createdByStudent',
          },
        },
        {
          $addFields: {
            created_by_user: {
              $cond: {
                if: { $gt: [{ $size: '$createdByStudent' }, 0] },
                then: {
                  _id: { $arrayElemAt: ['$createdByStudent._id', 0] },
                  first_name: {
                    $arrayElemAt: ['$createdByStudent.first_name', 0],
                  },
                  last_name: {
                    $arrayElemAt: ['$createdByStudent.last_name', 0],
                  },
                  email: { $arrayElemAt: ['$createdByStudent.email', 0] },
                  image: { $arrayElemAt: ['$createdByStudent.image', 0] },
                  profile_pic: {
                    $arrayElemAt: ['$createdByStudent.profile_pic', 0],
                  },
                  role: 'STUDENT',
                },
                else: null, // Will be populated later for professors/admins
              },
            },
          },
        },
        {
          $lookup: {
            from: 'forum_views',
            let: {
              discussionId: new Types.ObjectId(discussionId),
              userId: new Types.ObjectId(user.id),
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$discussion_id', '$$discussionId'] },
                      { $eq: ['$user_id', '$$userId'] },
                    ],
                  },
                },
              },
            ],
            as: 'userView',
          },
        },
        {
          $addFields: {
            is_unread: {
              $cond: {
                if: { $eq: [{ $size: '$userView' }, 0] },
                then: true,
                else: {
                  $gt: [
                    '$created_at',
                    { $arrayElemAt: ['$userView.viewed_at', 0] },
                  ],
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: 'forum_likes',
            let: { replyId: '$_id', userId: new Types.ObjectId(user.id) },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$entity_id', '$$replyId'] },
                      { $eq: ['$entity_type', 'REPLY'] },
                      { $eq: ['$liked_by', '$$userId'] },
                    ],
                  },
                },
              },
            ],
            as: 'userLike',
          },
        },
        {
          $addFields: {
            has_liked: { $gt: [{ $size: '$userLike' }, 0] },
            liked_at: { $arrayElemAt: ['$userLike.created_at', 0] },
          },
        },
        {
          $addFields: {
            last_reply_date: {
              $ifNull: ['$last_reply.created_at', '$created_at'],
            },
          },
        },
        {
          $sort: { created_at: 1 },
        },
        { $skip: options.skip },
        { $limit: options.limit },
        {
          $project: {
            userPin: 0,
            createdByStudent: 0,
            createdByUser: 0,
            userView: 0,
            last_reply_date: 0,
            lastReply: 0,
          },
        },
      ];

      // Execute aggregation pipeline
      const [replies, total] = await Promise.all([
        ReplyModel.aggregate(aggregationPipeline),
        ReplyModel.countDocuments({
          discussion_id: new Types.ObjectId(discussionId),
          parent_reply_id: null,
          deleted_at: null,
          status: ReplyStatusEnum.ACTIVE,
        }),
      ]);

      this.logger.debug(`Found ${replies.length} replies`);

      // Process replies and populate user details
      for (const reply of replies) {
        // If created_by_user is null (professor/admin), populate it using getUserDetails
        if (
          !reply.created_by_user &&
          reply.created_by &&
          reply.created_by_role
        ) {
          this.logger.debug(
            `Populating user details for reply ${reply._id} created by ${reply.created_by}`,
          );
          reply.created_by_user = await this.getUserDetails(
            reply.created_by.toString(),
            reply.created_by_role,
            tenantConnection,
          );
        }

        // Decrypt email in created_by_user
        if (reply.created_by_user && reply.created_by_user.email) {
          reply.created_by_user.email =
            this.emailEncryptionService.decryptEmail(
              reply.created_by_user.email,
            );
        }

        // Decrypt emails in mentions
        if (reply.mentions && Array.isArray(reply.mentions)) {
          for (const mention of reply.mentions) {
            if (
              mention.mentioned_user_details &&
              mention.mentioned_user_details.email
            ) {
              mention.mentioned_user_details.email =
                this.emailEncryptionService.decryptEmail(
                  mention.mentioned_user_details.email,
                );
            }
          }
        }
      }

      // Get attachments for each reply
      const AttachmentModel = tenantConnection.model(
        ForumAttachment.name,
        ForumAttachmentSchema,
      );

      for (const reply of replies) {
        const attachments = await AttachmentModel.find({
          reply_id: reply._id,
          status: AttachmentStatusEnum.ACTIVE,
          deleted_at: null,
        })
          .populate(
            'uploaded_by',
            'first_name last_name email role profile_pic',
          )
          .sort({ created_at: 1 })
          .lean();

        // Format attachment user details
        const formattedAttachments = await Promise.all(
          attachments.map(async (attachment) => {
            // Get user details for the uploader using getUserDetails
            let uploadedByUser: any = null;
            if (attachment.uploaded_by) {
              // Use the actual role from the attachment schema
              uploadedByUser = await this.getUserDetails(
                attachment.uploaded_by.toString(),
                attachment.uploaded_by_role,
                tenantConnection,
              );
            }

            return {
              ...attachment,
              uploaded_by_user: uploadedByUser,
            };
          }),
        );

        reply.attachments = formattedAttachments;
      }

      // Mark forum as viewed by this user
      await this.markContentAsViewed(
        new Types.ObjectId(user.id),
        discussionId,
        tenantConnection,
      );

      const result = createPaginationResult(replies, total, options);

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'COMMUNITY',
          'REPLIES_RETRIEVED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        ...result,
      };
    } catch (error) {
      this.logger.error('Error finding replies', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'RETRIEVE_REPLIES_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Get sub-replies for a specific reply
   */
  async findSubRepliesByReplyId(
    replyId: string,
    user: JWTUserPayload,
    paginationDto?: PaginationDto,
  ) {
    this.logger.log(`Finding sub-replies for reply: ${replyId}`);

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ReplyModel = tenantConnection.model(
      ForumReply.name,
      ForumReplySchema,
    );
    const MentionModel = tenantConnection.model(
      ForumMention.name,
      ForumMentionSchema,
    );

    try {
      // Validate parent reply exists
      const parentReply = await ReplyModel.findOne({
        _id: replyId,
        deleted_at: null,
        status: ReplyStatusEnum.ACTIVE,
      });

      if (!parentReply) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'PARENT_REPLY_NOT_FOUND_OR_NOT_ACTIVE',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      const options = getPaginationOptions(paginationDto || {});

      // Use aggregation pipeline for better performance
      const aggregationPipeline: any[] = [
        {
          $match: {
            parent_reply_id: new Types.ObjectId(replyId),
            deleted_at: null,
            status: ReplyStatusEnum.ACTIVE,
          },
        },
        {
          $lookup: {
            from: 'forum_mentions',
            let: { replyId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$reply_id', '$$replyId'] },
                },
              },
              {
                $lookup: {
                  from: 'students',
                  localField: 'mentioned_user',
                  foreignField: '_id',
                  as: 'mentionedStudent',
                },
              },
              {
                $addFields: {
                  mentioned_user_details: {
                    $cond: {
                      if: { $gt: [{ $size: '$mentionedStudent' }, 0] },
                      then: {
                        _id: { $arrayElemAt: ['$mentionedStudent._id', 0] },
                        first_name: {
                          $arrayElemAt: ['$mentionedStudent.first_name', 0],
                        },
                        last_name: {
                          $arrayElemAt: ['$mentionedStudent.last_name', 0],
                        },
                        email: { $arrayElemAt: ['$mentionedStudent.email', 0] },
                        image: { $arrayElemAt: ['$mentionedStudent.image', 0] },
                        role: 'STUDENT',
                      },
                      else: null, // Will be populated later for professors/admins
                    },
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  mention_text: 1,
                  created_at: 1,
                  mentioned_user_details: 1,
                },
              },
            ],
            as: 'mentions',
          },
        },
        {
          $lookup: {
            from: 'students',
            localField: 'created_by',
            foreignField: '_id',
            as: 'createdByStudent',
          },
        },
        {
          $addFields: {
            created_by_user: {
              $cond: {
                if: { $gt: [{ $size: '$createdByStudent' }, 0] },
                then: {
                  _id: { $arrayElemAt: ['$createdByStudent._id', 0] },
                  first_name: {
                    $arrayElemAt: ['$createdByStudent.first_name', 0],
                  },
                  last_name: {
                    $arrayElemAt: ['$createdByStudent.last_name', 0],
                  },
                  email: { $arrayElemAt: ['$createdByStudent.email', 0] },
                  image: { $arrayElemAt: ['$createdByStudent.image', 0] },
                  profile_pic: {
                    $arrayElemAt: ['$createdByStudent.profile_pic', 0],
                  },
                  role: 'STUDENT',
                },
                else: null, // Will be populated later for professors/admins
              },
            },
          },
        },
        {
          $lookup: {
            from: 'forum_likes',
            let: { replyId: '$_id', userId: new Types.ObjectId(user.id) },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$entity_id', '$$replyId'] },
                      { $eq: ['$entity_type', 'REPLY'] },
                      { $eq: ['$liked_by', '$$userId'] },
                    ],
                  },
                },
              },
            ],
            as: 'userLike',
          },
        },
        {
          $addFields: {
            has_liked: { $gt: [{ $size: '$userLike' }, 0] },
            liked_at: { $arrayElemAt: ['$userLike.created_at', 0] },
          },
        },
        {
          $addFields: {
            last_reply_date: {
              $ifNull: ['$last_reply.created_at', '$created_at'],
            },
          },
        },
        {
          $sort: { created_at: 1 },
        },
        { $skip: options.skip },
        { $limit: options.limit },
        {
          $project: {
            userPin: 0,
            createdByStudent: 0,
            createdByUser: 0,
            userView: 0,
            last_reply_date: 0,
            lastReply: 0,
          },
        },
      ];

      // Execute aggregation pipeline
      const [subReplies, total] = await Promise.all([
        ReplyModel.aggregate(aggregationPipeline),
        ReplyModel.countDocuments({
          parent_reply_id: new Types.ObjectId(replyId),
          deleted_at: null,
          status: ReplyStatusEnum.ACTIVE,
        }),
      ]);

      this.logger.debug(`Found ${subReplies.length} sub-replies`);

      // Decrypt emails in the aggregation results
      for (const subReply of subReplies) {
        // Decrypt email in created_by_user
        if (subReply.created_by_user && subReply.created_by_user.email) {
          subReply.created_by_user.email =
            this.emailEncryptionService.decryptEmail(
              subReply.created_by_user.email,
            );
        }

        // Decrypt emails in mentions
        if (subReply.mentions && Array.isArray(subReply.mentions)) {
          for (const mention of subReply.mentions) {
            if (
              mention.mentioned_user_details &&
              mention.mentioned_user_details.email
            ) {
              mention.mentioned_user_details.email =
                this.emailEncryptionService.decryptEmail(
                  mention.mentioned_user_details.email,
                );
            }
          }
        }
      }

      // Get attachments for each sub-reply
      const AttachmentModel = tenantConnection.model(
        ForumAttachment.name,
        ForumAttachmentSchema,
      );

      for (const subReply of subReplies) {
        const attachments = await AttachmentModel.find({
          reply_id: subReply._id,
          status: AttachmentStatusEnum.ACTIVE,
          deleted_at: null,
        })
          .populate(
            'uploaded_by',
            'first_name last_name email role profile_pic',
          )
          .sort({ created_at: 1 })
          .lean();

        // Format attachment user details
        const formattedAttachments = await Promise.all(
          attachments.map(async (attachment) => {
            // Get user details for the uploader using getUserDetails
            let uploadedByUser: any = null;
            if (attachment.uploaded_by) {
              // Use the actual role from the attachment schema
              uploadedByUser = await this.getUserDetails(
                attachment.uploaded_by.toString(),
                attachment.uploaded_by_role,
                tenantConnection,
              );
            }

            return {
              ...attachment,
              uploaded_by_user: uploadedByUser,
            };
          }),
        );

        subReply.attachments = formattedAttachments;
      }

      const result = createPaginationResult(subReplies, total, options);
      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'COMMUNITY',
          'SUB_REPLIES_RETRIEVED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        ...result,
      };
    } catch (error) {
      this.logger.error('Error finding sub-replies', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'RETRIEVE_SUBREPLIES_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Like or unlike a discussion or reply
   */
  async toggleLike(
    entityType: LikeEntityTypeEnum,
    entityId: string,
    user: JWTUserPayload,
  ) {
    this.logger.log(
      `Toggling like for ${entityType}: ${entityId} by user: ${user.id}`,
    );

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const LikeModel = tenantConnection.model(ForumLike.name, ForumLikeSchema);

    try {
      // Check if user already liked this entity
      const existingLike = await LikeModel.findOne({
        entity_type: entityType,
        entity_id: new Types.ObjectId(entityId),
        liked_by: new Types.ObjectId(user.id),
      });

      if (existingLike) {
        // Unlike
        await LikeModel.deleteOne({ _id: existingLike._id });
        await this.updateLikeCount(entityType, entityId, -1, tenantConnection);

        // Get updated like count
        const updatedLikeCount = await this.getLikeCount(
          entityType,
          entityId,
          tenantConnection,
        );

        // Get user details for response
        const userDetails = await this.getUserDetails(
          user.id.toString(),
          user.role.name,
          tenantConnection,
        );

        return {
          message: this.errorMessageService.getSuccessMessageWithLanguage(
            'COMMUNITY',
            'UNLIKED_SUCCESSFULLY',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
          data: {
            liked: false,
            has_liked: false,
            like_count: updatedLikeCount,
            liked_by_user: userDetails || null,
            action: 'unliked',
          },
        };
      } else {
        // Like
        const newLike = new LikeModel({
          entity_type: entityType,
          entity_id: new Types.ObjectId(entityId),
          liked_by: new Types.ObjectId(user.id),
        });

        await newLike.save();
        await this.updateLikeCount(entityType, entityId, 1, tenantConnection);

        // Get updated like count
        const updatedLikeCount = await this.getLikeCount(
          entityType,
          entityId,
          tenantConnection,
        );

        // Send notification for new like
        const liker = await this.getUserDetails(
          user.id.toString(),
          user.role.name,
          tenantConnection,
        );

        if (entityType === LikeEntityTypeEnum.DISCUSSION) {
          const DiscussionModel = tenantConnection.model(
            ForumDiscussion.name,
            ForumDiscussionSchema,
          );
          const discussion = await DiscussionModel.findById(entityId).lean();
          if (discussion) {
            const discussionCreator = await this.getUserDetails(
              discussion.created_by.toString(),
              discussion.created_by_role,
              tenantConnection,
            );
            await this.notifyNewLike(
              newLike,
              liker,
              'discussion',
              discussion,
              discussionCreator,
              resolvedSchoolId,
            );
          }
        } else if (entityType === LikeEntityTypeEnum.REPLY) {
          const ReplyModel = tenantConnection.model(
            ForumReply.name,
            ForumReplySchema,
          );
          const reply = await ReplyModel.findById(entityId).lean();
          if (reply) {
            const replyCreator = await this.getUserDetails(
              reply.created_by.toString(),
              reply.created_by_role,
              tenantConnection,
            );
            await this.notifyNewLike(
              newLike,
              liker,
              'reply',
              reply,
              replyCreator,
              resolvedSchoolId,
            );
          }
        }

        // Get user details for response
        const userDetails = await this.getUserDetails(
          user.id.toString(),
          user.role.name,
          tenantConnection,
        );

        return {
          message: this.errorMessageService.getSuccessMessageWithLanguage(
            'COMMUNITY',
            'LIKED_SUCCESSFULLY',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
          liked: true,
          liked_by_user: userDetails || null,
        };
      }
    } catch (error) {
      this.logger.error('Error toggling like', error?.stack || error);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'TOGGLE_LIKE_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Helper method to update like count
   */
  private async updateLikeCount(
    entityType: LikeEntityTypeEnum,
    entityId: string,
    increment: number,
    tenantConnection: any,
  ) {
    if (entityType === LikeEntityTypeEnum.DISCUSSION) {
      const DiscussionModel = tenantConnection.model(
        ForumDiscussion.name,
        ForumDiscussionSchema,
      );
      await DiscussionModel.updateOne(
        { _id: entityId },
        { $inc: { like_count: increment } },
      );
    } else if (entityType === LikeEntityTypeEnum.REPLY) {
      const ReplyModel = tenantConnection.model(
        ForumReply.name,
        ForumReplySchema,
      );
      await ReplyModel.updateOne(
        { _id: entityId },
        { $inc: { like_count: increment } },
      );
    }
  }

  /**
   * Helper method to get current like count
   */
  private async getLikeCount(
    entityType: LikeEntityTypeEnum,
    entityId: string,
    tenantConnection: any,
  ): Promise<number> {
    if (entityType === LikeEntityTypeEnum.DISCUSSION) {
      const DiscussionModel = tenantConnection.model(
        ForumDiscussion.name,
        ForumDiscussionSchema,
      );
      const discussion = await DiscussionModel.findById(entityId)
        .select('like_count')
        .lean();
      return discussion?.like_count || 0;
    } else if (entityType === LikeEntityTypeEnum.REPLY) {
      const ReplyModel = tenantConnection.model(
        ForumReply.name,
        ForumReplySchema,
      );
      const reply = await ReplyModel.findById(entityId)
        .select('like_count')
        .lean();
      return reply?.like_count || 0;
    }
    return 0;
  }

  /**
   * Report content
   */
  async reportContent(
    reportContentDto: ReportContentDto,
    user: JWTUserPayload,
  ) {
    const { school_id, entity_type, entity_id, report_type, reason } =
      reportContentDto;

    this.logger.log(
      `Reporting ${entity_type}: ${entity_id} by user: ${user.id}`,
    );

    const resolvedSchoolId = this.resolveSchoolId(user, school_id);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ReportModel = tenantConnection.model(
      ForumReport.name,
      ForumReportSchema,
    );

    try {
      // Check if user already reported this entity
      const existingReport = await ReportModel.findOne({
        entity_type,
        entity_id: new Types.ObjectId(entity_id.toString()),
        reported_by: new Types.ObjectId(user.id),
        status: { $in: [ReportStatusEnum.PENDING, ReportStatusEnum.REVIEWED] },
      });

      if (existingReport) {
        throw new ConflictException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'ALREADY_REPORTED',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Create report
      const newReport = new ReportModel({
        entity_type,
        entity_id: new Types.ObjectId(entity_id.toString()),
        report_type,
        reason,
        reported_by: new Types.ObjectId(user.id),
        reported_by_role: user.role.name as RoleEnum,
      });

      const savedReport = await newReport.save();

      // Update entity status to reported if it's a discussion or reply
      await this.updateEntityStatus(
        entity_type,
        entity_id.toString(),
        tenantConnection,
      );

      // Send notification to admins about new report
      const reporter = await this.getUserDetails(
        user.id.toString(),
        user.role.name,
        tenantConnection,
      );

      if (entity_type === ReportEntityTypeEnum.DISCUSSION) {
        const DiscussionModel = tenantConnection.model(
          ForumDiscussion.name,
          ForumDiscussionSchema,
        );
        const discussion = await DiscussionModel.findById(entity_id).lean();
        if (discussion) {
          const discussionCreator = await this.getUserDetails(
            discussion.created_by.toString(),
            discussion.created_by_role,
            tenantConnection,
          );
          await this.notifyNewReport(
            savedReport,
            reporter,
            discussion,
            discussionCreator,
            resolvedSchoolId,
          );
        }
      } else if (entity_type === ReportEntityTypeEnum.REPLY) {
        const ReplyModel = tenantConnection.model(
          ForumReply.name,
          ForumReplySchema,
        );
        const reply = await ReplyModel.findById(entity_id).lean();
        if (reply) {
          const replyCreator = await this.getUserDetails(
            reply.created_by.toString(),
            reply.created_by_role,
            tenantConnection,
          );
          await this.notifyNewReport(
            savedReport,
            reporter,
            reply,
            replyCreator,
            resolvedSchoolId,
          );
        }
      }

      // Attach user details to the response
      const userDetails = await this.getUserDetails(
        user.id.toString(),
        user.role.name,
        tenantConnection,
      );
      const reportWithUser = {
        ...savedReport.toObject(),
        reported_by_user: userDetails || null,
      };

      this.logger.log(`Report created: ${savedReport._id}`);

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'COMMUNITY',
          'CONTENT_REPORTED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: reportWithUser,
      };
    } catch (error) {
      this.logger.error('Error reporting content', error?.stack || error);
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'REPORT_CONTENT_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Helper method to update entity status to reported
   */
  private async updateEntityStatus(
    entityType: ReportEntityTypeEnum,
    entityId: string,
    tenantConnection: any,
  ) {
    if (entityType === ReportEntityTypeEnum.DISCUSSION) {
      const DiscussionModel = tenantConnection.model(
        ForumDiscussion.name,
        ForumDiscussionSchema,
      );
      await DiscussionModel.updateOne(
        { _id: entityId },
        { status: DiscussionStatusEnum.REPORTED },
      );
    } else if (entityType === ReportEntityTypeEnum.REPLY) {
      const ReplyModel = tenantConnection.model(
        ForumReply.name,
        ForumReplySchema,
      );
      await ReplyModel.updateOne(
        { _id: entityId },
        { status: ReplyStatusEnum.REPORTED },
      );
    }
  }

  /**
   * Get reports (admin only)
   */
  async getReports(user: JWTUserPayload, paginationDto?: PaginationDto) {
    // Only school admins and super admins can view reports
    if (
      ![RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN].includes(
        user.role.name as RoleEnum,
      )
    ) {
      throw new ForbiddenException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'ACCESS_DENIED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    this.logger.log(`Getting reports for user: ${user.id}`);

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ReportModel = tenantConnection.model(
      ForumReport.name,
      ForumReportSchema,
    );

    try {
      const options = getPaginationOptions(paginationDto || {});

      // Get reports
      const [reports, total] = await Promise.all([
        ReportModel.find({})
          .sort({ created_at: -1 })
          .skip(options.skip)
          .limit(options.limit)
          .lean(),
        ReportModel.countDocuments({}),
      ]);

      // Attach detailed user information for reporters
      const reportsWithUsers = await Promise.all(
        reports.map(async (report) => {
          const reporter = await this.getUserDetails(
            report.reported_by.toString(),
            report.reported_by_role,
            tenantConnection,
          );

          // Get the reported content creator details
          let reportedContentCreator: any = null;
          if (report.entity_type === ReportEntityTypeEnum.DISCUSSION) {
            const DiscussionModel = tenantConnection.model(
              ForumDiscussion.name,
              ForumDiscussionSchema,
            );
            const discussion = await DiscussionModel.findById(report.entity_id)
              .select('created_by created_by_role')
              .lean();

            if (discussion) {
              reportedContentCreator = await this.getUserDetails(
                discussion.created_by.toString(),
                discussion.created_by_role,
                tenantConnection,
              );
            }
          } else if (report.entity_type === ReportEntityTypeEnum.REPLY) {
            const ReplyModel = tenantConnection.model(
              ForumReply.name,
              ForumReplySchema,
            );
            const reply = await ReplyModel.findById(report.entity_id)
              .select('created_by created_by_role')
              .lean();

            if (reply) {
              reportedContentCreator = await this.getUserDetails(
                reply.created_by.toString(),
                reply.created_by_role,
                tenantConnection,
              );
            }
          }

          return {
            ...report,
            reported_by_user: reporter || null,
            reported_content_creator: reportedContentCreator || null,
          };
        }),
      );

      const result = createPaginationResult(reportsWithUsers, total, options);

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'COMMUNITY',
          'REPORTS_RETRIEVED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        ...result,
      };
    } catch (error) {
      this.logger.error('Error getting reports', error?.stack || error);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'GET_REPORTS_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Archive discussion (admin only)
   */
  async archiveDiscussion(discussionId: string, user: JWTUserPayload) {
    // Only school admins and super admins can archive discussions
    if (
      ![
        RoleEnum.SCHOOL_ADMIN,
        RoleEnum.SUPER_ADMIN,
        RoleEnum.PROFESSOR,
      ].includes(user.role.name as RoleEnum)
    ) {
      throw new ForbiddenException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'ACCESS_DENIED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    this.logger.log(
      `Archiving discussion: ${discussionId} by user: ${user.id}`,
    );

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const DiscussionModel = tenantConnection.model(
      ForumDiscussion.name,
      ForumDiscussionSchema,
    );

    try {
      const discussion = await DiscussionModel.findOne({
        _id: discussionId,
        deleted_at: null,
      });

      if (!discussion) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'DISCUSSION_NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      await DiscussionModel.updateOne(
        { _id: discussionId },
        {
          status: DiscussionStatusEnum.ARCHIVED,
          archived_at: new Date(),
          archived_by: new Types.ObjectId(user.id),
        },
      );

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'COMMUNITY',
          'DISCUSSION_ARCHIVED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      };
    } catch (error) {
      this.logger.error('Error archiving discussion', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'ARCHIVE_DISCUSSION_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Delete discussion (admin only)
   */
  async deleteDiscussion(discussionId: string, user: JWTUserPayload) {
    // Only school admins and super admins can delete discussions
    // if (
    //   ![RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN].includes(
    //     user.role.name as RoleEnum,
    //   )
    // ) {
    //   throw new ForbiddenException(
    //     this.errorMessageService.getMessageWithLanguage(
    //       'COMMUNITY',
    //       'ACCESS_DENIED',
    //       user?.preferred_language || DEFAULT_LANGUAGE,
    //     ),
    //   );
    // }

    this.logger.log(`Deleting discussion: ${discussionId} by user: ${user.id}`);

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const DiscussionModel = tenantConnection.model(
      ForumDiscussion.name,
      ForumDiscussionSchema,
    );
    const ReplyModel = tenantConnection.model(
      ForumReply.name,
      ForumReplySchema,
    );
    const LikeModel = tenantConnection.model(ForumLike.name, ForumLikeSchema);
    const PinModel = tenantConnection.model(ForumPin.name, ForumPinSchema);
    const MentionModel = tenantConnection.model(
      ForumMention.name,
      ForumMentionSchema,
    );
    const AttachmentModel = tenantConnection.model(
      ForumAttachment.name,
      ForumAttachmentSchema,
    );
    const ReportModel = tenantConnection.model(
      ForumReport.name,
      ForumReportSchema,
    );
    const ViewModel = tenantConnection.model(ForumView.name, ForumViewSchema);

    try {
      const discussion = await DiscussionModel.findOne({
        _id: discussionId,
        deleted_at: null,
      });

      if (!discussion) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'DISCUSSION_NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Soft delete the discussion
      await DiscussionModel.updateOne(
        { _id: discussionId },
        {
          deleted_at: new Date(),
          deleted_by: new Types.ObjectId(user.id),
        },
      );

      // Soft delete all related replies
      await ReplyModel.updateMany(
        { discussion_id: new Types.ObjectId(discussionId) },
        {
          deleted_at: new Date(),
          deleted_by: new Types.ObjectId(user.id),
        },
      );

      // Delete all related likes
      await LikeModel.deleteMany({
        entity_type: LikeEntityTypeEnum.DISCUSSION,
        entity_id: new Types.ObjectId(discussionId),
      });

      // Delete all related pins
      await PinModel.deleteMany({
        discussion_id: new Types.ObjectId(discussionId),
      });

      // Delete all related mentions
      await MentionModel.deleteMany({
        discussion_id: new Types.ObjectId(discussionId),
      });

      // Soft delete all related attachments
      await AttachmentModel.updateMany(
        { discussion_id: new Types.ObjectId(discussionId) },
        {
          deleted_at: new Date(),
          deleted_by: new Types.ObjectId(user.id),
        },
      );

      // Delete all related reports
      await ReportModel.deleteMany({
        entity_type: ReportEntityTypeEnum.DISCUSSION,
        entity_id: new Types.ObjectId(discussionId),
      });

      // Delete all related views
      await ViewModel.deleteMany({
        discussion_id: new Types.ObjectId(discussionId),
      });

      this.logger.log(`Discussion deleted: ${discussionId}`);

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'COMMUNITY',
          'DISCUSSION_DELETED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: {
          discussion_id: discussionId,
          deleted_at: new Date(),
          deleted_by: user.id,
        },
      };
    } catch (error) {
      this.logger.error('Error deleting discussion', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'DELETE_DISCUSSION_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Helper method to get last reply information for a discussion
   */
  private async getLastReplyInfo(discussionId: string, tenantConnection: any) {
    try {
      const ReplyModel = tenantConnection.model(
        ForumReply.name,
        ForumReplySchema,
      );

      const lastReply = await ReplyModel.findOne({
        discussion_id: new Types.ObjectId(discussionId),
        deleted_at: null,
        status: ReplyStatusEnum.ACTIVE,
      })
        .sort({ created_at: -1 })
        .lean();

      if (lastReply) {
        const lastReplyUser = await this.getUserDetails(
          lastReply.created_by.toString(),
          lastReply.created_by_role,
          tenantConnection,
        );

        return {
          reply_id: lastReply._id,
          content: lastReply.content,
          created_by_user: lastReplyUser || null,
          created_at: lastReply.created_at,
        };
      }

      return null;
    } catch (error) {
      this.logger.error('Error getting last reply info', error);
      return null;
    }
  }

  /**
   * Helper method to get user details based on role
   */
  private async getUserDetails(
    userId: string,
    userRole: string,
    tenantConnection?: any,
  ) {
    try {
      this.logger.debug(
        `Getting user details for userId: ${userId}, userRole: ${userRole}`,
      );

      // Normalize role comparison - handle both string and enum values
      const normalizedRole = userRole?.toString()?.toUpperCase();
      this.logger.debug(`Normalized role: ${normalizedRole}`);

      if (normalizedRole === RoleEnum.STUDENT && tenantConnection) {
        // Students are stored in tenant database - use the tenant connection
        this.logger.debug(`Fetching student details from tenant database`);
        const StudentModel = tenantConnection.model(
          Student.name,
          StudentSchema,
        );
        const student = await StudentModel.findById(userId)
          .select('first_name last_name email image profile_pic')
          .lean();

        if (student) {
          this.logger.debug(
            `Student found: ${student.first_name} ${student.last_name}`,
          );
          return {
            _id: student._id,
            first_name: student.first_name,
            last_name: student.last_name,
            email: this.emailEncryptionService.decryptEmail(student.email),
            image: student.image || student.profile_pic || null,
            profile_pic: student.profile_pic || student.image || null,
            role: RoleEnum.STUDENT,
          };
        } else {
          this.logger.warn(`Student not found in tenant database: ${userId}`);
        }
      } else {
        // Professors, admins, etc. are stored in central database
        this.logger.debug(
          `Fetching user details from central database for role: ${userRole}`,
        );
        this.logger.debug(`Converting userId to ObjectId: ${userId}`);

        const objectId = new Types.ObjectId(userId);
        this.logger.debug(`ObjectId created: ${objectId}`);

        const user = await this.userModel
          .findById(objectId)
          .select('first_name last_name email role profile_pic')
          .populate('role', 'name')
          .lean();

        // Try without population as fallback if populated query fails
        let userWithoutPopulate: any = null;
        if (!user) {
          this.logger.debug(
            `User not found with population, trying without population`,
          );
          userWithoutPopulate = await this.userModel
            .findById(objectId)
            .select('first_name last_name email role profile_pic')
            .lean();
        }

        // Use either populated or non-populated user data
        const userData = user || userWithoutPopulate;

        if (userData) {
          this.logger.debug(
            `User found: ${userData.first_name} ${userData.last_name}`,
          );
          this.logger.debug(
            `User role field: ${JSON.stringify(userData.role)}`,
          );

          // Handle both populated role object and ObjectId
          let roleName = userRole;
          if (
            userData.role &&
            typeof userData.role === 'object' &&
            'name' in userData.role
          ) {
            roleName = (userData.role as any).name;
            this.logger.debug(`Using populated role name: ${roleName}`);
          } else {
            this.logger.debug(`Using passed role name: ${roleName}`);
          }

          // Handle email decryption safely
          let decryptedEmail = '';
          try {
            decryptedEmail = this.emailEncryptionService.decryptEmail(
              userData.email,
            );
            this.logger.debug(`Email decrypted successfully`);
          } catch (emailError) {
            this.logger.error(`Error decrypting email: ${emailError}`);
            decryptedEmail = userData.email; // Fallback to encrypted email
          }

          return {
            _id: userData._id,
            first_name: userData.first_name,
            last_name: userData.last_name,
            email: decryptedEmail,
            image: userData.profile_pic || null,
            profile_pic: userData.profile_pic || null,
            role: roleName,
          };
        } else {
          this.logger.warn(`User not found in central database: ${userId}`);
        }
      }

      this.logger.warn(
        `No user details found for userId: ${userId}, userRole: ${userRole}`,
      );
      return null;
    } catch (error) {
      this.logger.error(
        `Error fetching user details for userId: ${userId}, userRole: ${userRole}`,
        error?.stack || error,
      );
      return null;
    }
  }

  /**
   * Helper method to create forum notifications
   */
  private async createForumNotification(
    recipientId: Types.ObjectId,
    recipientType: RecipientTypeEnum,
    titleEn: string,
    titleFr: string,
    messageEn: string,
    messageFr: string,
    type: NotificationTypeEnum,
    metadata: Record<string, any> = {},
    schoolId: string,
  ) {
    try {
      await this.notificationsService.createMultiLanguageNotification(
        recipientId,
        recipientType,
        titleEn,
        titleFr,
        messageEn,
        messageFr,
        type,
        metadata,
        new Types.ObjectId(schoolId),
      );
    } catch (error) {
      this.logger.error('Error creating forum notification', error);
      // Don't throw error to avoid breaking the main functionality
    }
  }

  /**
   * Helper method to notify all school members about new discussion
   */
  private async notifyNewDiscussion(
    discussion: any,
    creator: any,
    schoolId: string,
    tenantConnection: any,
  ) {
    try {
      // Get all students and professors in the school
      const StudentModel = tenantConnection.model('Student', 'students');
      const students = await StudentModel.find({
        school_id: new Types.ObjectId(schoolId),
        deleted_at: null,
      }).lean();

      const professors = await this.userModel
        .find({
          school_id: new Types.ObjectId(schoolId),
          role: RoleEnum.PROFESSOR,
          deleted_at: null,
        })
        .lean();

      const titleEn = 'New Forum Discussion';
      const titleFr = 'Nouvelle Discussion sur le Forum';
      const messageEn = `${creator.first_name} ${creator.last_name} started a new discussion: "${discussion.title}"`;
      const messageFr = `${creator.first_name} ${creator.last_name} a commencé une nouvelle discussion: "${discussion.title}"`;
      const metadata = {
        discussion_id: discussion._id,
        discussion_title: discussion.title,
        creator_id: discussion.created_by,
        creator_name: `${creator.first_name} ${creator.last_name}`,
        creator_role: discussion.created_by_role,
      };

      // Notify all students
      for (const student of students) {
        if (student._id.toString() !== discussion.created_by.toString()) {
          await this.createForumNotification(
            student._id,
            RecipientTypeEnum.STUDENT,
            titleEn,
            titleFr,
            messageEn,
            messageFr,
            NotificationTypeEnum.FORUM_NEW_DISCUSSION,
            metadata,
            schoolId,
          );
        }
      }

      // Notify all professors
      for (const professor of professors) {
        if (professor._id.toString() !== discussion.created_by.toString()) {
          await this.createForumNotification(
            professor._id,
            RecipientTypeEnum.PROFESSOR,
            titleEn,
            titleFr,
            messageEn,
            messageFr,
            NotificationTypeEnum.FORUM_NEW_DISCUSSION,
            metadata,
            schoolId,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error notifying about new discussion', error);
    }
  }

  /**
   * Helper method to notify discussion creator about new reply
   */
  private async notifyNewReply(
    reply: any,
    replyCreator: any,
    discussion: any,
    discussionCreator: any,
    schoolId: string,
  ) {
    try {
      // Don't notify if the reply is by the same person who created the discussion
      if (reply.created_by.toString() === discussion.created_by.toString()) {
        return;
      }

      const titleEn = 'New Reply to Your Discussion';
      const titleFr = 'Nouvelle Réponse à Votre Discussion';
      const messageEn = `${replyCreator.first_name} ${replyCreator.last_name} replied to your discussion: "${discussion.title}"`;
      const messageFr = `${replyCreator.first_name} ${replyCreator.last_name} a répondu à votre discussion: "${discussion.title}"`;
      const metadata = {
        discussion_id: discussion._id,
        discussion_title: discussion.title,
        reply_id: reply._id,
        reply_creator_id: reply.created_by,
        reply_creator_name: `${replyCreator.first_name} ${replyCreator.last_name}`,
        reply_creator_role: reply.created_by_role,
      };

      const recipientType =
        discussion.created_by_role === RoleEnum.STUDENT
          ? RecipientTypeEnum.STUDENT
          : RecipientTypeEnum.PROFESSOR;

      await this.createForumNotification(
        new Types.ObjectId(discussion.created_by),
        recipientType,
        titleEn,
        titleFr,
        messageEn,
        messageFr,
        NotificationTypeEnum.FORUM_NEW_REPLY,
        metadata,
        schoolId,
      );
    } catch (error) {
      this.logger.error('Error notifying about new reply', error);
    }
  }

  /**
   * Helper method to notify parent reply creator about new sub-reply
   */
  private async notifyNewSubReply(
    subReply: any,
    subReplyCreator: any,
    parentReply: any,
    parentReplyCreator: any,
    discussion: any,
    schoolId: string,
  ) {
    try {
      // Don't notify if the sub-reply is by the same person who created the parent reply
      if (
        subReply.created_by.toString() === parentReply.created_by.toString()
      ) {
        return;
      }

      const titleEn = 'New Reply to Your Comment';
      const titleFr = 'Nouvelle Réponse à Votre Commentaire';
      const messageEn = `${subReplyCreator.first_name} ${subReplyCreator.last_name} replied to your comment in: "${discussion.title}"`;
      const messageFr = `${subReplyCreator.first_name} ${subReplyCreator.last_name} a répondu à votre commentaire dans: "${discussion.title}"`;
      const metadata = {
        discussion_id: discussion._id,
        discussion_title: discussion.title,
        parent_reply_id: parentReply._id,
        sub_reply_id: subReply._id,
        sub_reply_creator_id: subReply.created_by,
        sub_reply_creator_name: `${subReplyCreator.first_name} ${subReplyCreator.last_name}`,
        sub_reply_creator_role: subReply.created_by_role,
      };

      const recipientType =
        parentReply.created_by_role === RoleEnum.STUDENT
          ? RecipientTypeEnum.STUDENT
          : RecipientTypeEnum.PROFESSOR;

      await this.createForumNotification(
        new Types.ObjectId(parentReply.created_by),
        recipientType,
        titleEn,
        titleFr,
        messageEn,
        messageFr,
        NotificationTypeEnum.FORUM_NEW_SUB_REPLY,
        metadata,
        schoolId,
      );
    } catch (error) {
      this.logger.error('Error notifying about new sub-reply', error);
    }
  }

  /**
   * Helper method to notify content creator about new like
   */
  private async notifyNewLike(
    like: any,
    liker: any,
    entityType: string,
    entity: any,
    entityCreator: any,
    schoolId: string,
  ) {
    try {
      // Don't notify if the like is by the same person who created the content
      if (like.liked_by.toString() === entity.created_by.toString()) {
        return;
      }

      const entityTitle =
        entityType === 'discussion' ? entity.title : 'your comment';
      const titleEn = 'New Like on Your Content';
      const titleFr = 'Nouveau Like sur Votre Contenu';
      const messageEn = `${liker.first_name} ${liker.last_name} liked your ${entityType}: "${entityTitle}"`;
      const messageFr = `${liker.first_name} ${liker.last_name} a aimé votre ${entityType}: "${entityTitle}"`;

      // Base metadata
      const metadata: any = {
        entity_type: entityType,
        entity_id: entity._id,
        entity_title: entityTitle,
        liker_id: like.liked_by,
        liker_name: `${liker.first_name} ${liker.last_name}`,
        liker_role: liker.role,
      };

      // Add discussion_id to metadata if entity type is reply
      if (entityType === 'reply' && entity.discussion_id) {
        metadata.discussion_id = new Types.ObjectId(entity.discussion_id);
      }

      const recipientType =
        entity.created_by_role === RoleEnum.STUDENT
          ? RecipientTypeEnum.STUDENT
          : RecipientTypeEnum.PROFESSOR;

      await this.createForumNotification(
        new Types.ObjectId(entity.created_by),
        recipientType,
        titleEn,
        titleFr,
        messageEn,
        messageFr,
        NotificationTypeEnum.FORUM_LIKE,
        metadata,
        schoolId,
      );
    } catch (error) {
      this.logger.error('Error notifying about new like', error);
    }
  }

  /**
   * Helper method to notify admins about new report
   */
  private async notifyNewReport(
    report: any,
    reporter: any,
    reportedContent: any,
    reportedContentCreator: any,
    schoolId: string,
  ) {
    try {
      // Get all admins in the school
      const admins = await this.userModel
        .find({
          school_id: new Types.ObjectId(schoolId),
          role: { $in: [RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN] },
          deleted_at: null,
        })
        .lean();

      const titleEn = 'New Content Report';
      const titleFr = 'Nouveau Rapport de Contenu';
      const messageEn = `${reporter.first_name} ${reporter.last_name} reported ${report.entity_type} by ${reportedContentCreator.first_name} ${reportedContentCreator.last_name}`;
      const messageFr = `${reporter.first_name} ${reporter.last_name} a signalé ${report.entity_type} par ${reportedContentCreator.first_name} ${reportedContentCreator.last_name}`;
      const metadata = {
        report_id: report._id,
        entity_type: report.entity_type,
        entity_id: report.entity_id,
        reporter_id: report.reported_by,
        reporter_name: `${reporter.first_name} ${reporter.last_name}`,
        reporter_role: report.reported_by_role,
        reported_content_creator_id: reportedContent.created_by,
        reported_content_creator_name: `${reportedContentCreator.first_name} ${reportedContentCreator.last_name}`,
        reported_content_creator_role: reportedContent.created_by_role,
        report_reason: report.reason,
      };

      // Notify all admins
      for (const admin of admins) {
        await this.createForumNotification(
          admin._id,
          RecipientTypeEnum.PROFESSOR, // Admins are treated as professors for notifications
          titleEn,
          titleFr,
          messageEn,
          messageFr,
          NotificationTypeEnum.FORUM_REPORT,
          metadata,
          schoolId,
        );
      }
    } catch (error) {
      this.logger.error('Error notifying about new report', error);
    }
  }

  /**
   * Notify users mentioned in a reply
   */
  private async notifyMentionedUsers(
    reply: any,
    replyCreator: any,
    discussion: any,
    mentionedUsers: MentionInfo[],
    schoolId: string,
  ) {
    try {
      const tenantConnection =
        await this.tenantConnectionService.getTenantConnection(schoolId);
      const MentionModel = tenantConnection.model(
        ForumMention.name,
        ForumMentionSchema,
      );

      const mentionPromises = mentionedUsers.map(async (mention) => {
        if (mention.userId) {
          const mentionedUser = await this.getUserDetails(
            mention.userId.toString(),
            mention.userRole || 'STUDENT',
            tenantConnection,
          );

          if (mentionedUser) {
            const titleEn = 'New Mention in Discussion';
            const titleFr = 'Nouvelle Mention dans la Discussion';
            const messageEn = `${replyCreator.first_name} ${replyCreator.last_name} mentioned you in "${discussion.title}": "${mention.mentionText}"`;
            const messageFr = `${replyCreator.first_name} ${replyCreator.last_name} vous a mentionné dans "${discussion.title}": "${mention.mentionText}"`;
            const metadata = {
              discussion_id: discussion._id,
              discussion_title: discussion.title,
              reply_id: reply._id,
              reply_creator_id: reply.created_by,
              reply_creator_name: `${replyCreator.first_name} ${replyCreator.last_name}`,
              reply_creator_role: reply.created_by_role,
              mention_text: mention.mentionText,
            };

            const recipientType =
              mention.userRole === 'STUDENT'
                ? RecipientTypeEnum.STUDENT
                : RecipientTypeEnum.PROFESSOR;

            await this.createForumNotification(
              new Types.ObjectId(mention.userId),
              recipientType,
              titleEn,
              titleFr,
              messageEn,
              messageFr,
              NotificationTypeEnum.FORUM_MENTION,
              metadata,
              schoolId,
            );
          }
        }
      });

      await Promise.all(mentionPromises);
    } catch (error) {
      this.logger.error('Error notifying mentioned users', error);
    }
  }

  /**
   * Notify users mentioned in a discussion
   */
  private async notifyMentionedUsersInDiscussion(
    discussion: any,
    discussionCreator: any,
    mentionedUsers: MentionInfo[],
    schoolId: string,
  ) {
    try {
      const tenantConnection =
        await this.tenantConnectionService.getTenantConnection(schoolId);
      const MentionModel = tenantConnection.model(
        ForumMention.name,
        ForumMentionSchema,
      );

      const mentionPromises = mentionedUsers.map(async (mention) => {
        if (mention.userId) {
          const mentionedUser = await this.getUserDetails(
            mention.userId.toString(),
            mention.userRole || 'STUDENT',
            tenantConnection,
          );

          if (mentionedUser) {
            const titleEn = 'New Mention in Discussion';
            const titleFr = 'Nouvelle Mention dans la Discussion';
            const messageEn = `${discussionCreator.first_name} ${discussionCreator.last_name} mentioned you in "${discussion.title}": "${mention.mentionText}"`;
            const messageFr = `${discussionCreator.first_name} ${discussionCreator.last_name} vous a mentionné dans "${discussion.title}": "${mention.mentionText}"`;
            const metadata = {
              discussion_id: discussion._id,
              discussion_title: discussion.title,
              discussion_creator_id: discussion.created_by,
              discussion_creator_name: `${discussionCreator.first_name} ${discussionCreator.last_name}`,
              discussion_creator_role: discussion.created_by_role,
              mention_text: mention.mentionText,
            };

            const recipientType =
              mention.userRole === 'STUDENT'
                ? RecipientTypeEnum.STUDENT
                : RecipientTypeEnum.PROFESSOR;

            await this.createForumNotification(
              new Types.ObjectId(mention.userId),
              recipientType,
              titleEn,
              titleFr,
              messageEn,
              messageFr,
              NotificationTypeEnum.FORUM_MENTION,
              metadata,
              schoolId,
            );
          }
        }
      });

      await Promise.all(mentionPromises);
    } catch (error) {
      this.logger.error('Error notifying mentioned users in discussion', error);
    }
  }

  /**
   * Helper method to check if content is unread for user
   */
  private async isContentUnread(
    userId: Types.ObjectId,
    discussionId: string,
    contentCreatedAt: Date,
    tenantConnection: any,
  ): Promise<boolean> {
    try {
      const ViewModel = tenantConnection.model(ForumView.name, ForumViewSchema);

      const lastViewed = await ViewModel.findOne({
        user_id: userId,
        discussion_id: new Types.ObjectId(discussionId),
      });

      // If user has never viewed this discussion, it's unread
      if (!lastViewed) {
        return true;
      }

      // If content was created after user's last view, it's unread
      return contentCreatedAt > lastViewed.viewed_at;
    } catch (error) {
      this.logger.error('Error checking if content is unread', error);
      return true; // Default to unread if error
    }
  }

  /**
   * Helper method to mark content as viewed by user (per discussion)
   */
  private async markContentAsViewed(
    userId: Types.ObjectId,
    discussionId: string,
    tenantConnection: any,
  ) {
    try {
      const ViewModel = tenantConnection.model(ForumView.name, ForumViewSchema);

      // Create or update the latest view timestamp for this user and discussion
      await ViewModel.findOneAndUpdate(
        {
          user_id: userId,
          discussion_id: new Types.ObjectId(discussionId),
        },
        {
          viewed_at: new Date(),
        },
        {
          upsert: true,
          new: true,
        },
      );
    } catch (error) {
      this.logger.error('Error marking content as viewed', error);
      // Don't throw error to avoid breaking main functionality
    }
  }

  /**
   * Helper method to get unread count for discussions
   */
  private async getUnreadDiscussionsCount(
    userId: Types.ObjectId,
    tenantConnection: any,
  ): Promise<number> {
    try {
      const DiscussionModel = tenantConnection.model(
        ForumDiscussion.name,
        ForumDiscussionSchema,
      );
      const ViewModel = tenantConnection.model(ForumView.name, ForumViewSchema);

      // Get all discussions
      const discussions = await DiscussionModel.find({
        deleted_at: null,
        status: DiscussionStatusEnum.ACTIVE,
      }).lean();

      let unreadCount = 0;

      // Check each discussion individually
      for (const discussion of discussions) {
        const lastViewed = await ViewModel.findOne({
          user_id: userId,
          discussion_id: discussion._id,
        });

        // If user has never viewed this discussion or it's newer than last view
        if (!lastViewed || discussion.created_at > lastViewed.viewed_at) {
          unreadCount++;
        }
      }

      return unreadCount;
    } catch (error) {
      this.logger.error('Error getting unread discussions count', error);
      return 0;
    }
  }

  /**
   * Helper method to get unread count for replies
   */
  private async getUnreadRepliesCount(
    userId: Types.ObjectId,
    tenantConnection: any,
  ): Promise<number> {
    try {
      const ReplyModel = tenantConnection.model(
        ForumReply.name,
        ForumReplySchema,
      );
      const ViewModel = tenantConnection.model(ForumView.name, ForumViewSchema);

      // Get all replies
      const replies = await ReplyModel.find({
        deleted_at: null,
        status: ReplyStatusEnum.ACTIVE,
      }).lean();

      let unreadCount = 0;

      // Check each reply's discussion individually
      for (const reply of replies) {
        const lastViewed = await ViewModel.findOne({
          user_id: userId,
          discussion_id: reply.discussion_id.toString(),
        });

        // If user has never viewed this discussion or reply is newer than last view
        if (!lastViewed || reply.created_at > lastViewed.viewed_at) {
          unreadCount++;
        }
      }

      return unreadCount;
    } catch (error) {
      this.logger.error('Error getting unread replies count', error);
      return 0;
    }
  }

  /**
   * Get unread counts for forum content
   */
  async getUnreadCounts(user: JWTUserPayload) {
    this.logger.log(`Getting unread counts for user: ${user.id}`);

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);

    try {
      const [unreadDiscussions, unreadReplies] = await Promise.all([
        this.getUnreadDiscussionsCount(
          new Types.ObjectId(user.id),
          tenantConnection,
        ),
        this.getUnreadRepliesCount(
          new Types.ObjectId(user.id),
          tenantConnection,
        ),
      ]);

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'COMMUNITY',
          'UNREAD_COUNTS_RETRIEVED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: {
          unread_discussions: unreadDiscussions,
          unread_replies: unreadReplies,
          total_unread: unreadDiscussions + unreadReplies,
        },
      };
    } catch (error) {
      this.logger.error('Error getting unread counts', error?.stack || error);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'RETRIEVE_UNREAD_COUNTS_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Toggle pin status for a discussion
   */
  async togglePin(pinDiscussionDto: PinDiscussionDto, user: JWTUserPayload) {
    const { discussion_id } = pinDiscussionDto;

    this.logger.log(
      `Toggling pin for discussion: ${discussion_id} by user: ${user.id}`,
    );

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const DiscussionModel = tenantConnection.model(
      ForumDiscussion.name,
      ForumDiscussionSchema,
    );
    const PinModel = tenantConnection.model(ForumPin.name, ForumPinSchema);

    try {
      // Validate discussion exists and is active
      const discussion = await DiscussionModel.findOne({
        _id: discussion_id,
        deleted_at: null,
        status: DiscussionStatusEnum.ACTIVE,
      }).lean();

      if (!discussion) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'DISCUSSION_NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Check if already pinned
      const existingPin = await PinModel.findOne({
        discussion_id: new Types.ObjectId(discussion_id.toString()),
        pinned_by: new Types.ObjectId(user.id),
      });

      if (existingPin) {
        // Unpin the discussion
        await PinModel.deleteOne({ _id: existingPin._id });

        return {
          message: this.errorMessageService.getSuccessMessageWithLanguage(
            'COMMUNITY',
            'UNPINNED_SUCCESSFULLY',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
          data: { pinned: false },
        };
      } else {
        // Pin the discussion
        const newPin = new PinModel({
          discussion_id: new Types.ObjectId(discussion_id.toString()),
          pinned_by: new Types.ObjectId(user.id),
        });

        await newPin.save();
        this.logger.log(`Pinned discussion: ${discussion_id}`);
        return {
          message: this.errorMessageService.getSuccessMessageWithLanguage(
            'COMMUNITY',
            'PINNED_SUCCESSFULLY',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
          data: {
            discussion_id,
            is_pinned: true,
            action: 'pinned',
            pinned_at: newPin.created_at,
          },
        };
      }
    } catch (error) {
      this.logger.error('Error toggling pin', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'TOGGLE_PIN_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Get pinned discussions for a user
   */
  async getPinnedDiscussions(
    user: JWTUserPayload,
    paginationDto?: PaginationDto,
  ) {
    this.logger.log(`Getting pinned discussions for user: ${user.id}`);

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const DiscussionModel = tenantConnection.model(
      ForumDiscussion.name,
      ForumDiscussionSchema,
    );

    try {
      const options = getPaginationOptions(paginationDto || {});

      // Use aggregation pipeline for better performance
      const aggregationPipeline: any[] = [
        {
          $match: {
            pinned_by: new Types.ObjectId(user.id),
          },
        },
        {
          $lookup: {
            from: 'forum_discussions',
            localField: 'discussion_id',
            foreignField: '_id',
            as: 'discussion',
          },
        },
        {
          $unwind: '$discussion',
        },
        {
          $match: {
            'discussion.deleted_at': null,
          },
        },
        {
          $lookup: {
            from: 'students',
            localField: 'discussion.created_by',
            foreignField: '_id',
            as: 'createdByStudent',
          },
        },
        {
          $addFields: {
            created_by_details: {
              $cond: {
                if: { $gt: [{ $size: '$createdByStudent' }, 0] },
                then: {
                  _id: { $arrayElemAt: ['$createdByStudent._id', 0] },
                  first_name: {
                    $arrayElemAt: ['$createdByStudent.first_name', 0],
                  },
                  last_name: {
                    $arrayElemAt: ['$createdByStudent.last_name', 0],
                  },
                  email: { $arrayElemAt: ['$createdByStudent.email', 0] },
                  image: { $arrayElemAt: ['$createdByStudent.image', 0] },
                  role: 'STUDENT',
                },
                else: null, // Will be populated later for professors/admins
              },
            },
            is_pinned: true,
            pinned_at: '$created_at',
          },
        },
        {
          $lookup: {
            from: 'forum_attachments',
            let: { discussionId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$discussion_id', '$$discussionId'] },
                  reply_id: null, // Only discussion attachments
                  status: AttachmentStatusEnum.ACTIVE,
                  deleted_at: null,
                },
              },
              { $sort: { created_at: 1 } },
              {
                $lookup: {
                  from: 'students',
                  localField: 'uploaded_by',
                  foreignField: '_id',
                  as: 'uploadedByStudent',
                },
              },
              {
                $addFields: {
                  uploaded_by_user: {
                    $cond: {
                      if: { $gt: [{ $size: '$uploadedByStudent' }, 0] },
                      then: {
                        _id: { $arrayElemAt: ['$uploadedByStudent._id', 0] },
                        first_name: {
                          $arrayElemAt: ['$uploadedByStudent.first_name', 0],
                        },
                        last_name: {
                          $arrayElemAt: ['$uploadedByStudent.last_name', 0],
                        },
                        email: {
                          $arrayElemAt: ['$uploadedByStudent.email', 0],
                        },
                        image: {
                          $arrayElemAt: ['$uploadedByStudent.image', 0],
                        },
                        role: 'STUDENT',
                      },
                      else: null, // Will be populated later for professors/admins
                    },
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  original_filename: 1,
                  stored_filename: 1,
                  file_url: 1,
                  mime_type: 1,
                  file_size: 1,
                  created_at: 1,
                  uploaded_by_user: 1,
                },
              },
            ],
            as: 'attachments',
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                '$discussion',
                {
                  created_by_details: '$created_by_details',
                  is_pinned: '$is_pinned',
                  pinned_at: '$pinned_at',
                  attachments: '$attachments',
                },
              ],
            },
          },
        },
        {
          $sort: { pinned_at: -1 },
        },
        { $skip: options.skip },
        { $limit: options.limit },
        {
          $project: {
            createdByStudent: 0,
            createdByUser: 0,
          },
        },
      ];

      // Execute aggregation pipeline
      const [discussions, total] = await Promise.all([
        tenantConnection
          .model(ForumPin.name, ForumPinSchema)
          .aggregate(aggregationPipeline),
        tenantConnection.model(ForumPin.name, ForumPinSchema).countDocuments({
          pinned_by: new Types.ObjectId(user.id),
        }),
      ]);

      // Decrypt emails in the aggregation results
      for (const discussion of discussions) {
        // If created_by_details is null (professor/admin), populate it using getUserDetails
        if (
          !discussion.created_by_details &&
          discussion.created_by &&
          discussion.created_by_role
        ) {
          this.logger.debug(
            `Populating created_by_details for pinned discussion ${discussion._id}`,
          );
          discussion.created_by_details = await this.getUserDetails(
            discussion.created_by.toString(),
            discussion.created_by_role,
            tenantConnection,
          );
        }

        // Decrypt email in created_by_details
        if (
          discussion.created_by_details &&
          discussion.created_by_details.email
        ) {
          discussion.created_by_details.email =
            this.emailEncryptionService.decryptEmail(
              discussion.created_by_details.email,
            );
        }

        // Process attachments and populate professor details
        if (discussion.attachments && Array.isArray(discussion.attachments)) {
          for (const attachment of discussion.attachments) {
            // If uploaded_by_user is null (professor/admin), populate it using getUserDetails
            if (
              !attachment.uploaded_by_user &&
              attachment.uploaded_by &&
              attachment.uploaded_by_role
            ) {
              this.logger.debug(
                `Populating uploaded_by_user for attachment ${attachment._id}`,
              );
              attachment.uploaded_by_user = await this.getUserDetails(
                attachment.uploaded_by.toString(),
                attachment.uploaded_by_role,
                tenantConnection,
              );
            }

            // Decrypt email in uploaded_by_user if it exists
            if (
              attachment.uploaded_by_user &&
              attachment.uploaded_by_user.email
            ) {
              attachment.uploaded_by_user.email =
                this.emailEncryptionService.decryptEmail(
                  attachment.uploaded_by_user.email,
                );
            }
          }
        }
      }

      return createPaginationResult(discussions, total, options);
    } catch (error) {
      this.logger.error(
        'Error getting pinned discussions',
        error?.stack || error,
      );
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'GET_PINNED_DISCUSSIONS_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Check if a discussion is pinned by the user
   */
  async isDiscussionPinned(discussionId: string, user: JWTUserPayload) {
    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const PinModel = tenantConnection.model(ForumPin.name, ForumPinSchema);

    try {
      // Use projection for better performance - only get the fields we need
      const pin = await PinModel.findOne(
        {
          discussion_id: new Types.ObjectId(discussionId),
          pinned_by: new Types.ObjectId(user.id),
        },
        {
          created_at: 1,
          _id: 1,
        },
      ).lean();

      const isPinned = !!pin;

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'COMMUNITY',
          'PIN_STATUS_RETRIEVED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: {
          discussion_id: discussionId,
          is_pinned: isPinned,
          pinned_at: pin?.created_at || null,
        },
      };
    } catch (error) {
      this.logger.error('Error checking pin status', error?.stack || error);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'CHECK_PIN_STATUS_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Get mentions for a user
   */
  async getMentions(user: JWTUserPayload, paginationDto?: PaginationDto) {
    this.logger.log(`Getting mentions for user: ${user.id}`);

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const MentionModel = tenantConnection.model(
      ForumMention.name,
      ForumMentionSchema,
    );

    try {
      const options = getPaginationOptions(paginationDto || {});

      // Use aggregation pipeline for better performance
      const aggregationPipeline: any[] = [
        {
          $match: {
            mentioned_user: new Types.ObjectId(user.id),
          },
        },
        {
          $lookup: {
            from: 'forum_replies',
            localField: 'reply_id',
            foreignField: '_id',
            as: 'reply',
          },
        },
        {
          $unwind: '$reply',
        },
        {
          $match: {
            'reply.deleted_at': null,
            'reply.status': ReplyStatusEnum.ACTIVE,
          },
        },
        {
          $lookup: {
            from: 'forum_discussions',
            localField: 'discussion_id',
            foreignField: '_id',
            as: 'discussion',
          },
        },
        {
          $unwind: '$discussion',
        },
        {
          $match: {
            'discussion.deleted_at': null,
          },
        },
        {
          $lookup: {
            from: 'students',
            localField: 'mentioned_by',
            foreignField: '_id',
            as: 'mentionedByStudent',
          },
        },
        {
          $addFields: {
            mentioned_by_user: {
              $cond: {
                if: { $gt: [{ $size: '$mentionedByStudent' }, 0] },
                then: {
                  _id: { $arrayElemAt: ['$mentionedByStudent._id', 0] },
                  first_name: {
                    $arrayElemAt: ['$mentionedByStudent.first_name', 0],
                  },
                  last_name: {
                    $arrayElemAt: ['$mentionedByStudent.last_name', 0],
                  },
                  email: { $arrayElemAt: ['$mentionedByStudent.email', 0] },
                  image: { $arrayElemAt: ['$mentionedByStudent.image', 0] },
                  role: 'STUDENT',
                },
                else: {
                  _id: { $arrayElemAt: ['$mentionedByUser._id', 0] },
                  first_name: {
                    $arrayElemAt: ['$mentionedByUser.first_name', 0],
                  },
                  last_name: {
                    $arrayElemAt: ['$mentionedByUser.last_name', 0],
                  },
                  email: { $arrayElemAt: ['$mentionedByUser.email', 0] },
                  image: { $arrayElemAt: ['$mentionedByUser.profile_pic', 0] },
                  role: { $arrayElemAt: ['$mentionedByUser.role', 0] },
                },
              },
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                {
                  _id: '$_id',
                  mention_text: '$mention_text',
                  created_at: '$created_at',
                  mentioned_by_user: '$mentioned_by_user',
                  reply: '$reply',
                  discussion: '$discussion',
                },
              ],
            },
          },
        },
        {
          $sort: { created_at: -1 },
        },
        { $skip: options.skip },
        { $limit: options.limit },
        {
          $project: {
            mentionedByStudent: 0,
            mentionedByUser: 0,
          },
        },
      ];

      // Execute aggregation pipeline
      const [mentions, total] = await Promise.all([
        MentionModel.aggregate(aggregationPipeline),
        MentionModel.countDocuments({
          mentioned_user: new Types.ObjectId(user.id),
        }),
      ]);

      // Decrypt emails in the aggregation results
      for (const mention of mentions) {
        // If mentioned_by_user is null (professor/admin), populate it using getUserDetails
        if (
          !mention.mentioned_by_user &&
          mention.mentioned_by &&
          mention.mentioned_by_role
        ) {
          this.logger.debug(
            `Populating mentioned_by_user for mention ${mention._id}`,
          );
          mention.mentioned_by_user = await this.getUserDetails(
            mention.mentioned_by.toString(),
            mention.mentioned_by_role,
            tenantConnection,
          );
        }

        // Decrypt email in mentioned_by_user
        if (mention.mentioned_by_user && mention.mentioned_by_user.email) {
          mention.mentioned_by_user.email =
            this.emailEncryptionService.decryptEmail(
              mention.mentioned_by_user.email,
            );
        }
      }

      return createPaginationResult(mentions, total, options);
    } catch (error) {
      this.logger.error('Error getting mentions', error?.stack || error);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'GET_MENTIONS_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Get all school members for mention autocomplete
   */
  async getSchoolMembersForMentions(
    user: JWTUserPayload,
    filterDto?: SchoolMembersFilterDto,
  ) {
    this.logger.log(`Getting school members for mentions for user: ${user.id}`);

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);

    try {
      // Build student filter
      const studentFilter: any = {
        school_id: new Types.ObjectId(resolvedSchoolId),
        deleted_at: null,
      };

      // Build professor filter
      const professorFilter: any = {
        school_id: new Types.ObjectId(resolvedSchoolId),
        role: { $in: [RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN] },
        deleted_at: null,
      };

      // If search term is provided, apply filtering
      if (filterDto?.search && filterDto.search.trim() !== '') {
        const searchRegex = new RegExp(filterDto.search, 'i');
        studentFilter.$or = [
          { first_name: searchRegex },
          { last_name: searchRegex },
          { email: searchRegex },
        ];
        professorFilter.$or = [
          { first_name: searchRegex },
          { last_name: searchRegex },
          { email: searchRegex },
        ];
      }

      // Apply role filter
      if (filterDto?.role) {
        if (filterDto.role === MemberRoleEnum.STUDENT) {
          // Only get students
          const students = await this.getFilteredStudents(
            tenantConnection,
            studentFilter,
            filterDto,
          );
          return {
            message: this.errorMessageService.getSuccessMessageWithLanguage(
              'COMMUNITY',
              'SCHOOL_MEMBERS_RETRIEVED_SUCCESSFULLY',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
            data: {
              members: students,
              total: students.length,
              search_term: filterDto.search || '',
            },
          };
        } else {
          // Only get professors/admins
          const professors = await this.getFilteredProfessors(
            tenantConnection,
            professorFilter,
            filterDto,
          );
          return {
            message: this.errorMessageService.getSuccessMessageWithLanguage(
              'COMMUNITY',
              'SCHOOL_MEMBERS_RETRIEVED_SUCCESSFULLY',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
            data: {
              members: professors,
              total: professors.length,
              search_term: filterDto.search || '',
            },
          };
        }
      }

      // Get all students in the school
      const students = await this.getFilteredStudents(
        tenantConnection,
        studentFilter,
        filterDto,
      );

      // Get all professors and admins in the school
      const professors = await this.getFilteredProfessors(
        tenantConnection,
        professorFilter,
        filterDto,
      );

      // Combine and sort by name
      const allMembers = [...students, ...professors]
        .filter((member) => member.name && member.email) // Filter out invalid entries
        .sort((a, b) => a.name.localeCompare(b.name));

      // Apply limit if specified
      const limit = filterDto?.limit ? parseInt(filterDto.limit) : 50;
      const limitedMembers = allMembers.slice(0, Math.min(limit, 100));

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'COMMUNITY',
          'SCHOOL_MEMBERS_RETRIEVED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: {
          members: limitedMembers,
          total: allMembers.length,
          filtered_total: limitedMembers.length,
          search_term: filterDto?.search || '',
        },
      };
    } catch (error) {
      this.logger.error('Error getting school members', error?.stack || error);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'GET_SCHOOL_MEMBERS_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Helper method to get filtered students
   */
  private async getFilteredStudents(
    tenantConnection: any,
    baseFilter: any,
    filterDto?: SchoolMembersFilterDto,
  ) {
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);

    const students = await StudentModel.find(baseFilter)
      .select('first_name last_name email image')
      .lean();

    return students.map((student: any) => {
      // Decrypt the email before returning
      const decryptedEmail = this.emailEncryptionService.decryptEmail(
        student.email || '',
      );

      return {
        id: student._id?.toString() || '',
        name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
        email: decryptedEmail,
        image: student.image || null,
        role: 'STUDENT',
        mention_text: `@${decryptedEmail}`,
        display_name:
          `${student.first_name || ''} ${student.last_name || ''} (@${decryptedEmail})`.trim(),
        search_text:
          `${student.first_name || ''} ${student.last_name || ''} ${decryptedEmail}`.toLowerCase(),
      };
    });
  }

  /**
   * Helper method to get filtered professors
   */
  private async getFilteredProfessors(
    tenantConnection: any,
    baseFilter: any,
    filterDto?: SchoolMembersFilterDto,
  ) {
    const professors = await this.userModel
      .find(baseFilter)
      .select('first_name last_name email profile_pic role')
      .lean();

    return professors.map((professor: any) => {
      // Decrypt the email before returning
      const decryptedEmail = this.emailEncryptionService.decryptEmail(
        professor.email || '',
      );

      return {
        id: professor._id?.toString() || '',
        name: `${professor.first_name || ''} ${professor.last_name || ''}`.trim(),
        email: decryptedEmail,
        image: professor.profile_pic || null,
        role: professor.role || 'PROFESSOR',
        mention_text: `@${decryptedEmail}`,
        display_name:
          `${professor.first_name || ''} ${professor.last_name || ''} (@${decryptedEmail})`.trim(),
        search_text:
          `${professor.first_name || ''} ${professor.last_name || ''} ${decryptedEmail}`.toLowerCase(),
      };
    });
  }

  /**
   * Export discussions to CSV format
   * Students cannot access this functionality
   */
  async exportDiscussions(
    user: JWTUserPayload,
    exportDto: ExportDiscussionsDto,
  ): Promise<ExportDiscussionsResponseDto> {
    this.logger.log(`Exporting discussions for user: ${user.id} in CSV format`);

    // Check if user is a student - students cannot export discussions
    if (user.role.name === RoleEnum.STUDENT) {
      throw new ForbiddenException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'STUDENTS_CANNOT_EXPORT_DISCUSSIONS',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    try {
      const resolvedSchoolId = this.resolveSchoolId(user);

      // Validate school exists
      const school = await this.schoolModel.findById(resolvedSchoolId);
      if (!school) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'SCHOOL',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Get tenant connection
      const tenantConnection =
        await this.tenantConnectionService.getTenantConnection(school.db_name);
      const DiscussionModel = tenantConnection.model(
        ForumDiscussion.name,
        ForumDiscussionSchema,
      );

      // Build filter based on role and export options
      const filter: any = {
        deleted_at: null,
      };

      // Role-based filtering
      if (user.role.name === RoleEnum.PROFESSOR) {
        filter.status = {
          $in: [DiscussionStatusEnum.ACTIVE, DiscussionStatusEnum.ARCHIVED],
        };
      }
      // Admins can see all content

      // Apply export filters
      if (exportDto.type) {
        filter.type = exportDto.type;
      }

      if (
        exportDto.status &&
        [RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN].includes(
          user.role.name as RoleEnum,
        )
      ) {
        filter.status = exportDto.status;
      }

      if (exportDto.search) {
        filter.$or = [
          { title: { $regex: exportDto.search, $options: 'i' } },
          { content: { $regex: exportDto.search, $options: 'i' } },
        ];
      }

      if (exportDto.tags && exportDto.tags.trim() !== '') {
        // Parse tags string (comma-separated or pipe-separated)
        const tagArray = exportDto.tags
          .split(/[,|]/) // Split by comma or pipe
          .map((tag) => tag.trim()) // Trim whitespace
          .filter((tag) => tag !== ''); // Remove empty tags

        if (tagArray.length > 0) {
          filter.tags = { $in: tagArray };
        }
      }

      if (exportDto.author_id) {
        filter.created_by = new Types.ObjectId(exportDto.author_id);
      }

      if (exportDto.start_date || exportDto.end_date) {
        filter.created_at = {};
        if (exportDto.start_date) {
          filter.created_at.$gte = new Date(exportDto.start_date);
        }
        if (exportDto.end_date) {
          filter.created_at.$lte = new Date(
            exportDto.end_date + 'T23:59:59.999Z',
          );
        }
      }

      // Get discussions with user details
      const discussions = await DiscussionModel.find(filter)
        .populate('created_by', 'first_name last_name email profile_pic')
        .sort({ created_at: -1 })
        .lean();

      if (discussions.length === 0) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'NO_DISCUSSIONS_FOUND_FOR_EXPORT',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      return this.exportToCSV(discussions, exportDto);
    } catch (error) {
      this.logger.error('Error exporting discussions', error?.stack || error);
      throw error;
    }
  }

  /**
   * Export discussions to CSV format
   */
  private async exportToCSV(
    discussions: any[],
    exportDto: ExportDiscussionsDto,
  ): Promise<ExportDiscussionsResponseDto> {
    // Transform data for CSV export
    const csvData = discussions.map((discussion: any) => ({
      'Discussion ID': discussion._id?.toString() || 'N/A',
      Title: discussion.title || 'N/A',
      Content: discussion.content || 'N/A',
      Type: discussion.type || 'N/A',
      Tags: Array.isArray(discussion.tags) ? discussion.tags.join('; ') : 'N/A',
      'Author Name': discussion.created_by
        ? `${discussion.created_by.first_name || ''} ${discussion.created_by.last_name || ''}`.trim()
        : 'N/A',
      'Author Email': discussion.created_by?.email || 'N/A',
      'Author Role': discussion.created_by_role || 'N/A',
      'Reply Count': discussion.reply_count || 0,
      'View Count': discussion.view_count || 0,
      'Like Count': discussion.like_count || 0,
      Status: discussion.status || 'N/A',
      'Meeting Link': discussion.meeting_link || 'N/A',
      'Meeting Platform': discussion.meeting_platform || 'N/A',
      'Meeting Scheduled At': discussion.meeting_scheduled_at
        ? new Date(discussion.meeting_scheduled_at).toISOString()
        : 'N/A',
      'Meeting Duration (minutes)':
        discussion.meeting_duration_minutes || 'N/A',
      'Created At': discussion.created_at
        ? new Date(discussion.created_at).toISOString()
        : 'N/A',
      'Updated At': discussion.updated_at
        ? new Date(discussion.updated_at).toISOString()
        : 'N/A',
      'Archived At': discussion.archived_at
        ? new Date(discussion.archived_at).toISOString()
        : 'N/A',
    }));

    // Define CSV headers
    const headers = [
      'Discussion ID',
      'Title',
      'Content',
      'Type',
      'Tags',
      'Author Name',
      'Author Email',
      'Author Role',
      'Reply Count',
      'View Count',
      'Like Count',
      'Status',
      'Meeting Link',
      'Meeting Platform',
      'Meeting Scheduled At',
      'Meeting Duration (minutes)',
      'Created At',
      'Updated At',
      'Archived At',
    ];

    // Generate CSV file with timestamp
    const filePath = await this.csvUtil.generateCSVFile({
      filename: 'discussions-export',
      headers,
      data: csvData,
      includeTimestamp: true,
    });

    // Get file info
    const filename = filePath.split('/').pop() || 'discussions-export.csv';
    const fileSize = this.csvUtil.getFileSize(filePath);
    const downloadUrl = `/api/community/download/${filename}`;

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
      applied_filters: {
        type: exportDto.type,
        status: exportDto.status,
        search: exportDto.search,
        tags: exportDto.tags,
        author_id: exportDto.author_id,
        start_date: exportDto.start_date,
        end_date: exportDto.end_date,
      },
    };
  }

  /**
   * Export discussions to CSV format and return as stream
   * Students cannot access this functionality
   */
  async exportDiscussionsDirect(
    user: JWTUserPayload,
    exportDto: ExportDiscussionsDto,
  ): Promise<{ content: string; filename: string; contentType: string }> {
    this.logger.log(
      `Exporting discussions for user: ${user.id} in CSV format (direct download)`,
    );

    // Check if user is a student - students cannot export discussions
    if (user.role.name === RoleEnum.STUDENT) {
      throw new ForbiddenException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'STUDENTS_CANNOT_EXPORT_DISCUSSIONS',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    try {
      const resolvedSchoolId = this.resolveSchoolId(user);

      // Validate school exists
      const school = await this.schoolModel.findById(resolvedSchoolId);
      if (!school) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'SCHOOL',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Get tenant connection
      const tenantConnection =
        await this.tenantConnectionService.getTenantConnection(school.db_name);
      const DiscussionModel = tenantConnection.model(
        ForumDiscussion.name,
        ForumDiscussionSchema,
      );

      // Build filter based on role and export options
      const filter: any = {
        deleted_at: null,
      };

      // Role-based filtering
      if (user.role.name === RoleEnum.PROFESSOR) {
        filter.status = {
          $in: [DiscussionStatusEnum.ACTIVE, DiscussionStatusEnum.ARCHIVED],
        };
      }
      // Admins can see all content

      // Apply export filters
      if (exportDto.type) {
        filter.type = exportDto.type;
      }

      if (
        exportDto.status &&
        [RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN].includes(
          user.role.name as RoleEnum,
        )
      ) {
        filter.status = exportDto.status;
      }

      if (exportDto.search) {
        filter.$or = [
          { title: { $regex: exportDto.search, $options: 'i' } },
          { content: { $regex: exportDto.search, $options: 'i' } },
        ];
      }

      if (exportDto.tags && exportDto.tags.trim() !== '') {
        // Parse tags string (comma-separated or pipe-separated)
        const tagArray = exportDto.tags
          .split(/[,|]/) // Split by comma or pipe
          .map((tag) => tag.trim()) // Trim whitespace
          .filter((tag) => tag !== ''); // Remove empty tags

        if (tagArray.length > 0) {
          filter.tags = { $in: tagArray };
        }
      }

      if (exportDto.author_id) {
        filter.created_by = new Types.ObjectId(exportDto.author_id);
      }

      if (exportDto.start_date || exportDto.end_date) {
        filter.created_at = {};
        if (exportDto.start_date) {
          filter.created_at.$gte = new Date(exportDto.start_date);
        }
        if (exportDto.end_date) {
          filter.created_at.$lte = new Date(
            exportDto.end_date + 'T23:59:59.999Z',
          );
        }
      }

      // Get discussions with user details
      const discussions = await DiscussionModel.find(filter)
        .populate('created_by', 'first_name last_name email profile_pic')
        .sort({ created_at: -1 })
        .lean();

      if (discussions.length === 0) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'NO_DISCUSSIONS_FOUND_FOR_EXPORT',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      return this.generateCSVContent(discussions, exportDto);
    } catch (error) {
      this.logger.error('Error exporting discussions', error?.stack || error);
      throw error;
    }
  }

  /**
   * Generate CSV content without saving to file
   */
  private generateCSVContent(
    discussions: any[],
    exportDto: ExportDiscussionsDto,
  ): { content: string; filename: string; contentType: string } {
    // Transform data for CSV export
    const csvData = discussions.map((discussion: any) => ({
      'Discussion ID': discussion._id?.toString() || 'N/A',
      Title: discussion.title || 'N/A',
      Content: discussion.content || 'N/A',
      Type: discussion.type || 'N/A',
      Tags: Array.isArray(discussion.tags) ? discussion.tags.join('; ') : 'N/A',
      'Author Name': discussion.created_by
        ? `${discussion.created_by.first_name || ''} ${discussion.created_by.last_name || ''}`.trim()
        : 'N/A',
      'Author Email': discussion.created_by?.email || 'N/A',
      'Author Role': discussion.created_by_role || 'N/A',
      'Reply Count': discussion.reply_count || 0,
      'View Count': discussion.view_count || 0,
      'Like Count': discussion.like_count || 0,
      Status: discussion.status || 'N/A',
      'Meeting Link': discussion.meeting_link || 'N/A',
      'Meeting Platform': discussion.meeting_platform || 'N/A',
      'Meeting Scheduled At': discussion.meeting_scheduled_at
        ? new Date(discussion.meeting_scheduled_at).toISOString()
        : 'N/A',
      'Meeting Duration (minutes)':
        discussion.meeting_duration_minutes || 'N/A',
      'Created At': discussion.created_at
        ? new Date(discussion.created_at).toISOString()
        : 'N/A',
      'Updated At': discussion.updated_at
        ? new Date(discussion.updated_at).toISOString()
        : 'N/A',
      'Archived At': discussion.archived_at
        ? new Date(discussion.archived_at).toISOString()
        : 'N/A',
    }));

    // Define CSV headers
    const headers = [
      'Discussion ID',
      'Title',
      'Content',
      'Type',
      'Tags',
      'Author Name',
      'Author Email',
      'Author Role',
      'Reply Count',
      'View Count',
      'Like Count',
      'Status',
      'Meeting Link',
      'Meeting Platform',
      'Meeting Scheduled At',
      'Meeting Duration (minutes)',
      'Created At',
      'Updated At',
      'Archived At',
    ];

    // Generate CSV content
    const csvContent = this.convertToCSV(csvData, headers);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `discussions-export_${timestamp}.csv`;

    this.logger.log(
      `CSV content generated: ${csvContent.length} bytes, Records: ${csvData.length}`,
    );

    return {
      content: csvContent,
      filename,
      contentType: 'text/csv',
    };
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: Record<string, any>[], headers: string[]): string {
    // Escape and format CSV values
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) {
        return '';
      }

      const stringValue = String(value);

      // If the value contains comma, quote, or newline, wrap it in quotes
      if (
        stringValue.includes(',') ||
        stringValue.includes('"') ||
        stringValue.includes('\n')
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    };

    // Create CSV header row
    const headerRow = headers.map((header) => escapeCSV(header)).join(',');

    // Create CSV data rows
    const dataRows = data.map((row) => {
      return headers.map((header) => escapeCSV(row[header])).join(',');
    });

    return [headerRow, ...dataRows].join('\n');
  }

  /**
   * Export discussions to CSV format and return as base64 encoded string
   * Students cannot access this functionality
   */
  async exportDiscussionsBase64(
    user: JWTUserPayload,
    exportDto: ExportDiscussionsDto,
  ): Promise<{ base64Content: string; filename: string; recordCount: number }> {
    this.logger.log(
      `Exporting discussions for user: ${user.id} in CSV format (base64)`,
    );

    // Check if user is a student - students cannot export discussions
    if (user.role.name === RoleEnum.STUDENT) {
      throw new ForbiddenException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'STUDENTS_CANNOT_EXPORT_DISCUSSIONS',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    try {
      const resolvedSchoolId = this.resolveSchoolId(user);

      // Validate school exists
      const school = await this.schoolModel.findById(resolvedSchoolId);
      if (!school) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'SCHOOL',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Get tenant connection
      const tenantConnection =
        await this.tenantConnectionService.getTenantConnection(school.db_name);
      const DiscussionModel = tenantConnection.model(
        ForumDiscussion.name,
        ForumDiscussionSchema,
      );

      // Build filter based on role and export options
      const filter: any = {
        deleted_at: null,
      };

      // Role-based filtering
      if (user.role.name === RoleEnum.PROFESSOR) {
        filter.status = {
          $in: [DiscussionStatusEnum.ACTIVE, DiscussionStatusEnum.ARCHIVED],
        };
      }
      // Admins can see all content

      // Apply export filters
      if (exportDto.type) {
        filter.type = exportDto.type;
      }

      if (
        exportDto.status &&
        [RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN].includes(
          user.role.name as RoleEnum,
        )
      ) {
        filter.status = exportDto.status;
      }

      if (exportDto.search) {
        filter.$or = [
          { title: { $regex: exportDto.search, $options: 'i' } },
          { content: { $regex: exportDto.search, $options: 'i' } },
        ];
      }

      if (exportDto.tags && exportDto.tags.trim() !== '') {
        // Parse tags string (comma-separated or pipe-separated)
        const tagArray = exportDto.tags
          .split(/[,|]/) // Split by comma or pipe
          .map((tag) => tag.trim()) // Trim whitespace
          .filter((tag) => tag !== ''); // Remove empty tags

        if (tagArray.length > 0) {
          filter.tags = { $in: tagArray };
        }
      }

      if (exportDto.author_id) {
        filter.created_by = new Types.ObjectId(exportDto.author_id);
      }

      if (exportDto.start_date || exportDto.end_date) {
        filter.created_at = {};
        if (exportDto.start_date) {
          filter.created_at.$gte = new Date(exportDto.start_date);
        }
        if (exportDto.end_date) {
          filter.created_at.$lte = new Date(
            exportDto.end_date + 'T23:59:59.999Z',
          );
        }
      }

      // Get discussions with user details
      const discussions = await DiscussionModel.find(filter)
        .populate('created_by', 'first_name last_name email profile_pic')
        .sort({ created_at: -1 })
        .lean();

      if (discussions.length === 0) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'NO_DISCUSSIONS_FOUND_FOR_EXPORT',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      const csvData = this.generateCSVContent(discussions, exportDto);
      const base64Content = Buffer.from(csvData.content, 'utf-8').toString(
        'base64',
      );

      return {
        base64Content,
        filename: csvData.filename,
        recordCount: discussions.length,
      };
    } catch (error) {
      this.logger.error('Error exporting discussions', error?.stack || error);
      throw error;
    }
  }

  /**
   * Create a forum attachment
   */
  async createForumAttachment(
    createAttachmentDto: CreateForumAttachmentDto,
    user: JWTUserPayload,
  ) {
    const {
      discussion_id,
      reply_id,
      entity_type,
      original_filename,
      stored_filename,
      file_url,
      mime_type,
      file_size,
    } = createAttachmentDto;

    this.logger.log(
      `Creating forum attachment: ${original_filename} by user: ${user.id}`,
    );

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const DiscussionModel = tenantConnection.model(
      ForumDiscussion.name,
      ForumDiscussionSchema,
    );
    const ReplyModel = tenantConnection.model(
      ForumReply.name,
      ForumReplySchema,
    );
    const AttachmentModel = tenantConnection.model(
      ForumAttachment.name,
      ForumAttachmentSchema,
    );

    try {
      // Validate discussion exists
      const discussion = await DiscussionModel.findOne({
        _id: discussion_id,
        deleted_at: null,
        status: DiscussionStatusEnum.ACTIVE,
      });

      if (!discussion) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'DISCUSSION_NOT_FOUND_OR_NOT_ACTIVE',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Validate reply if provided
      if (reply_id && entity_type === AttachmentEntityTypeEnum.REPLY) {
        const reply = await ReplyModel.findOne({
          _id: reply_id,
          discussion_id: new Types.ObjectId(discussion_id),
          deleted_at: null,
          status: ReplyStatusEnum.ACTIVE,
        });

        if (!reply) {
          throw new NotFoundException(
            this.errorMessageService.getMessageWithLanguage(
              'COMMUNITY',
              'REPLY_NOT_FOUND_OR_NOT_ACTIVE',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }
      }

      // Create attachment
      const newAttachment = new AttachmentModel({
        discussion_id: new Types.ObjectId(discussion_id),
        reply_id: reply_id ? new Types.ObjectId(reply_id) : null,
        entity_type,
        original_filename,
        stored_filename,
        file_url,
        mime_type,
        file_size,
        uploaded_by: new Types.ObjectId(user.id),
        uploaded_by_role: user.role.name as RoleEnum,
      });

      const savedAttachment = await newAttachment.save();

      // Attach user details to the response
      const userDetails = await this.getUserDetails(
        user.id.toString(),
        user.role.name,
        tenantConnection,
      );
      const attachmentWithUser = {
        ...savedAttachment.toObject(),
        uploaded_by_user: userDetails || null,
      };

      this.logger.log(`Forum attachment created: ${savedAttachment._id}`);

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'COMMUNITY',
          'FORUM_ATTACHMENT_CREATED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: attachmentWithUser,
      };
    } catch (error) {
      this.logger.error(
        'Error creating forum attachment',
        error?.stack || error,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'CREATE_FORUM_ATTACHMENT_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Get attachments for a discussion
   */
  async getDiscussionAttachments(discussionId: string, user: JWTUserPayload) {
    this.logger.log(`Getting attachments for discussion: ${discussionId}`);

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const AttachmentModel = tenantConnection.model(
      ForumAttachment.name,
      ForumAttachmentSchema,
    );

    try {
      const attachments = await AttachmentModel.find({
        discussion_id: new Types.ObjectId(discussionId),
        status: AttachmentStatusEnum.ACTIVE,
        deleted_at: null,
      })
        .populate('uploaded_by', 'first_name last_name email role profile_pic')
        .sort({ created_at: 1 })
        .lean();

      // Format user details
      const formattedAttachments = await Promise.all(
        attachments.map(async (attachment) => {
          // Get user details for the uploader using getUserDetails
          let uploadedByUser: any = null;
          if (attachment.uploaded_by) {
            // Use the actual role from the attachment schema
            uploadedByUser = await this.getUserDetails(
              attachment.uploaded_by.toString(),
              attachment.uploaded_by_role,
              tenantConnection,
            );
          }

          return {
            ...attachment,
            uploaded_by_user: uploadedByUser,
          };
        }),
      );

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'COMMUNITY',
          'FORUM_ATTACHMENTS_RETRIEVED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: formattedAttachments,
      };
    } catch (error) {
      this.logger.error(
        'Error getting discussion attachments',
        error?.stack || error,
      );
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'GET_FORUM_ATTACHMENTS_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Get attachments for a reply
   */
  async getReplyAttachments(replyId: string, user: JWTUserPayload) {
    this.logger.log(`Getting attachments for reply: ${replyId}`);

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const AttachmentModel = tenantConnection.model(
      ForumAttachment.name,
      ForumAttachmentSchema,
    );

    try {
      const attachments = await AttachmentModel.find({
        reply_id: new Types.ObjectId(replyId),
        status: AttachmentStatusEnum.ACTIVE,
        deleted_at: null,
      })
        .populate('uploaded_by', 'first_name last_name email role profile_pic')
        .sort({ created_at: 1 })
        .lean();

      // Format user details
      const formattedAttachments = await Promise.all(
        attachments.map(async (attachment) => {
          // Get user details for the uploader using getUserDetails
          let uploadedByUser: any = null;
          if (attachment.uploaded_by) {
            // Use the actual role from the attachment schema
            uploadedByUser = await this.getUserDetails(
              attachment.uploaded_by.toString(),
              attachment.uploaded_by_role,
              tenantConnection,
            );
          }

          return {
            ...attachment,
            uploaded_by_user: uploadedByUser,
          };
        }),
      );

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'COMMUNITY',
          'FORUM_ATTACHMENTS_RETRIEVED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: formattedAttachments,
      };
    } catch (error) {
      this.logger.error(
        'Error getting reply attachments',
        error?.stack || error,
      );
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'GET_FORUM_ATTACHMENTS_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Delete a forum attachment
   */
  async deleteForumAttachment(
    deleteAttachmentDto: DeleteForumAttachmentDto,
    user: JWTUserPayload,
  ) {
    const { attachment_id } = deleteAttachmentDto;

    this.logger.log(
      `Deleting forum attachment: ${attachment_id} by user: ${user.id}`,
    );

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const AttachmentModel = tenantConnection.model(
      ForumAttachment.name,
      ForumAttachmentSchema,
    );

    try {
      // Find attachment
      const attachment = await AttachmentModel.findOne({
        _id: attachment_id,
        deleted_at: null,
        status: AttachmentStatusEnum.ACTIVE,
      });

      if (!attachment) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'FORUM_ATTACHMENT_NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Check if user can delete this attachment (only uploader or admin)
      if (
        attachment.uploaded_by.toString() !== user.id &&
        ![RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN].includes(
          user.role.name as RoleEnum,
        )
      ) {
        throw new ForbiddenException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'CANNOT_DELETE_FORUM_ATTACHMENT',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Soft delete attachment
      await AttachmentModel.updateOne(
        { _id: attachment_id },
        {
          status: AttachmentStatusEnum.DELETED,
          deleted_at: new Date(),
          deleted_by: new Types.ObjectId(user.id),
        },
      );

      this.logger.log(`Forum attachment deleted: ${attachment_id}`);

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'COMMUNITY',
          'FORUM_ATTACHMENT_DELETED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      };
    } catch (error) {
      this.logger.error(
        'Error deleting forum attachment',
        error?.stack || error,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'DELETE_FORUM_ATTACHMENT_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Check if current user has liked a specific entity
   */
  async hasUserLiked(
    entityType: LikeEntityTypeEnum,
    entityId: string,
    user: JWTUserPayload,
  ) {
    this.logger.log(
      `Checking if user ${user.id} liked ${entityType}: ${entityId}`,
    );

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const LikeModel = tenantConnection.model(ForumLike.name, ForumLikeSchema);

    try {
      const like = await LikeModel.findOne({
        entity_type: entityType,
        entity_id: new Types.ObjectId(entityId),
        liked_by: new Types.ObjectId(user.id),
      }).lean();

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'COMMUNITY',
          'LIKE_STATUS_RETRIEVED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: {
          entity_type: entityType,
          entity_id: entityId,
          has_liked: !!like,
          liked_at: like?.created_at || null,
        },
      };
    } catch (error) {
      this.logger.error('Error checking like status', error?.stack || error);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'CHECK_LIKE_STATUS_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Get list of users who liked a specific entity
   */
  async getLikedByUsers(
    entityType: LikeEntityTypeEnum,
    entityId: string,
    user: JWTUserPayload,
    paginationDto?: PaginationDto,
  ) {
    this.logger.log(`Getting users who liked ${entityType}: ${entityId}`);

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const LikeModel = tenantConnection.model(ForumLike.name, ForumLikeSchema);

    try {
      const options = getPaginationOptions(paginationDto || {});

      // Use aggregation pipeline for better performance
      const aggregationPipeline: any[] = [
        {
          $match: {
            entity_type: entityType,
            entity_id: new Types.ObjectId(entityId),
          },
        },
        {
          $lookup: {
            from: 'students',
            localField: 'liked_by',
            foreignField: '_id',
            as: 'likedByStudent',
          },
        },
        {
          $addFields: {
            liked_by_user: {
              $cond: {
                if: { $gt: [{ $size: '$likedByStudent' }, 0] },
                then: {
                  _id: { $arrayElemAt: ['$likedByStudent._id', 0] },
                  first_name: {
                    $arrayElemAt: ['$likedByStudent.first_name', 0],
                  },
                  last_name: {
                    $arrayElemAt: ['$likedByStudent.last_name', 0],
                  },
                  email: { $arrayElemAt: ['$likedByStudent.email', 0] },
                  image: { $arrayElemAt: ['$likedByStudent.image', 0] },
                  role: 'STUDENT',
                },
                else: null, // Will be populated later for professors/admins
              },
            },
          },
        },
        {
          $sort: { created_at: -1 },
        },
        { $skip: options.skip },
        { $limit: options.limit },
        {
          $project: {
            likedByStudent: 0,
          },
        },
      ];

      // Execute aggregation pipeline
      const [likes, total] = await Promise.all([
        LikeModel.aggregate(aggregationPipeline),
        LikeModel.countDocuments({
          entity_type: entityType,
          entity_id: new Types.ObjectId(entityId),
        }),
      ]);

      // Decrypt emails in the aggregation results
      for (const like of likes) {
        // If liked_by_user is null (professor/admin), populate it using getUserDetails
        if (!like.liked_by_user && like.liked_by && like.liked_by_role) {
          this.logger.debug(`Populating liked_by_user for like ${like._id}`);
          like.liked_by_user = await this.getUserDetails(
            like.liked_by.toString(),
            like.liked_by_role,
            tenantConnection,
          );
        }

        // Decrypt email in liked_by_user
        if (like.liked_by_user && like.liked_by_user.email) {
          like.liked_by_user.email = this.emailEncryptionService.decryptEmail(
            like.liked_by_user.email,
          );
        }
      }

      const result = createPaginationResult(likes, total, options);

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'COMMUNITY',
          'LIKED_BY_USERS_RETRIEVED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        ...result,
      };
    } catch (error) {
      this.logger.error('Error getting liked by users', error?.stack || error);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'GET_LIKED_BY_USERS_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Update a forum discussion
   */
  async updateDiscussion(
    discussionId: string,
    updateDiscussionDto: any,
    user: JWTUserPayload,
  ) {
    const {
      title,
      content,
      tags,
      mentions,
      meeting_link,
      meeting_platform,
      meeting_scheduled_at,
      meeting_duration_minutes,
    } = updateDiscussionDto;

    this.logger.log(`Updating discussion: ${discussionId} by user: ${user.id}`);

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const DiscussionModel = tenantConnection.model(
      ForumDiscussion.name,
      ForumDiscussionSchema,
    );
    const MentionModel = tenantConnection.model(
      ForumMention.name,
      ForumMentionSchema,
    );

    try {
      // Find the discussion and check permissions
      const discussion = await DiscussionModel.findOne({
        _id: discussionId,
        deleted_at: null,
      });

      if (!discussion) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'DISCUSSION_NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Check if user can edit this discussion (only creator or admins)
      const canEdit =
        discussion.created_by.toString() === user.id ||
        [RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN].includes(
          user.role.name as RoleEnum,
        );

      if (!canEdit) {
        throw new ForbiddenException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'CANNOT_EDIT_DISCUSSION',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Prepare update data
      const updateData: any = {};

      if (title !== undefined) updateData.title = title;
      if (tags !== undefined) updateData.tags = tags || [];

      // Handle content and mentions
      if (content !== undefined) {
        const extractedMentions = mentions || extractMentions(content);

        // Resolve mentions to user IDs
        const resolvedMentions = await resolveMentions(
          extractedMentions,
          tenantConnection,
          this.userModel,
        );

        // Format content with mention links
        const formattedContent = formatMentionsInContent(
          content,
          resolvedMentions,
        );
        updateData.content = formattedContent;

        // Update mention records for this discussion
        await MentionModel.deleteMany({
          discussion_id: new Types.ObjectId(discussionId),
          reply_id: null, // Only discussion mentions, not reply mentions
        });

        // Create new mention records
        const mentionPromises = resolvedMentions.map(async (mention) => {
          if (mention.userId) {
            const mentionRecord = new MentionModel({
              discussion_id: new Types.ObjectId(discussionId),
              mentioned_by: new Types.ObjectId(user.id),
              mentioned_user: mention.userId,
              mention_text: mention.mentionText,
            });
            return mentionRecord.save();
          }
        });

        await Promise.all(mentionPromises.filter(Boolean));
      }

      // Handle meeting fields for meeting type discussions
      if (discussion.type === DiscussionTypeEnum.MEETING) {
        if (meeting_link !== undefined) updateData.meeting_link = meeting_link;
        if (meeting_platform !== undefined)
          updateData.meeting_platform = meeting_platform;
        if (meeting_scheduled_at !== undefined) {
          updateData.meeting_scheduled_at = meeting_scheduled_at
            ? new Date(meeting_scheduled_at)
            : null;
        }
        if (meeting_duration_minutes !== undefined) {
          updateData.meeting_duration_minutes = meeting_duration_minutes;
        }
      }

      // Update the discussion
      const updatedDiscussion = await DiscussionModel.findOneAndUpdate(
        { _id: discussionId },
        { $set: updateData },
        { new: true, lean: true },
      );

      this.logger.log(`Discussion updated successfully: ${discussionId}`);

      return {
        message: this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'DISCUSSION_UPDATED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: updatedDiscussion,
      };
    } catch (error) {
      this.logger.error(`Error updating discussion: ${discussionId}`, error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'UPDATE_DISCUSSION_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Update a forum reply
   */
  async updateReply(
    replyId: string,
    updateReplyDto: any,
    user: JWTUserPayload,
  ) {
    const { content, mentions } = updateReplyDto;

    this.logger.log(`Updating reply: ${replyId} by user: ${user.id}`);

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ReplyModel = tenantConnection.model(
      ForumReply.name,
      ForumReplySchema,
    );
    const MentionModel = tenantConnection.model(
      ForumMention.name,
      ForumMentionSchema,
    );

    try {
      // Find the reply and check permissions
      const reply = await ReplyModel.findOne({
        _id: replyId,
        deleted_at: null,
      });

      if (!reply) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'REPLY_NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Check if user can edit this reply (only creator or admins)
      const canEdit =
        reply.created_by.toString() === user.id ||
        [RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN].includes(
          user.role.name as RoleEnum,
        );

      if (!canEdit) {
        throw new ForbiddenException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'CANNOT_EDIT_REPLY',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Prepare update data
      const updateData: any = {};

      // Handle content and mentions
      if (content !== undefined) {
        const extractedMentions = mentions || extractMentions(content);

        // Resolve mentions to user IDs
        const resolvedMentions = await resolveMentions(
          extractedMentions,
          tenantConnection,
          this.userModel,
        );

        // Format content with mention links
        const formattedContent = formatMentionsInContent(
          content,
          resolvedMentions,
        );
        updateData.content = formattedContent;

        // Update mention records for this reply
        await MentionModel.deleteMany({
          reply_id: new Types.ObjectId(replyId),
        });

        // Create new mention records
        const mentionPromises = resolvedMentions.map(async (mention) => {
          if (mention.userId) {
            const mentionRecord = new MentionModel({
              reply_id: new Types.ObjectId(replyId),
              discussion_id: reply.discussion_id,
              mentioned_by: new Types.ObjectId(user.id),
              mentioned_user: mention.userId,
              mention_text: mention.mentionText,
            });
            return mentionRecord.save();
          }
        });

        await Promise.all(mentionPromises.filter(Boolean));
      }

      // Update the reply
      const updatedReply = await ReplyModel.findOneAndUpdate(
        { _id: replyId },
        { $set: updateData },
        { new: true, lean: true },
      );

      this.logger.log(`Reply updated successfully: ${replyId}`);

      return {
        message: this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'REPLY_UPDATED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: updatedReply,
      };
    } catch (error) {
      this.logger.error(`Error updating reply: ${replyId}`, error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'UPDATE_REPLY_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Get a single reply by ID
   */
  async findReplyById(replyId: string, user: JWTUserPayload) {
    this.logger.log(`Finding reply: ${replyId}`);

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ReplyModel = tenantConnection.model(
      ForumReply.name,
      ForumReplySchema,
    );
    const LikeModel = tenantConnection.model(ForumLike.name, ForumLikeSchema);
    const AttachmentModel = tenantConnection.model(
      ForumAttachment.name,
      ForumAttachmentSchema,
    );
    const MentionModel = tenantConnection.model(
      ForumMention.name,
      ForumMentionSchema,
    );

    try {
      const reply = await ReplyModel.findOne({
        _id: replyId,
        deleted_at: null,
      }).lean();

      if (!reply) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'REPLY_NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Check if current user has liked this reply
      const userLike = await LikeModel.findOne({
        entity_type: LikeEntityTypeEnum.REPLY,
        entity_id: new Types.ObjectId(replyId),
        liked_by: new Types.ObjectId(user.id),
      }).lean();

      // Attach user details
      const userDetails = await this.getUserDetails(
        reply.created_by.toString(),
        reply.created_by_role,
        tenantConnection,
      );

      // Get attachments for this reply
      const attachments = await AttachmentModel.find({
        reply_id: new Types.ObjectId(replyId),
        status: AttachmentStatusEnum.ACTIVE,
        deleted_at: null,
      })
        .sort({ created_at: 1 })
        .lean();

      // Get mentions for this reply
      const mentions = await MentionModel.find({
        reply_id: new Types.ObjectId(replyId),
      })
        .sort({ created_at: 1 })
        .lean();

      // Populate mention users
      const populatedMentions = await Promise.all(
        mentions.map(async (mention) => {
          const mentionedUser = await this.getUserDetails(
            mention.mentioned_user.toString(),
            'UNKNOWN', // We'll determine the role from the user data
            tenantConnection,
          );
          return {
            ...mention,
            mentioned_user_details: mentionedUser,
          };
        }),
      );

      return {
        message: this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'REPLY_RETRIEVED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: {
          ...reply,
          created_by_user: userDetails,
          has_liked: !!userLike,
          attachments,
          mentions: populatedMentions,
        },
      };
    } catch (error) {
      this.logger.error(`Error finding reply: ${replyId}`, error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'GET_REPLY_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Delete a forum reply (soft delete)
   */
  async deleteReply(replyId: string, user: JWTUserPayload) {
    this.logger.log(`Deleting reply: ${replyId} by user: ${user.id}`);

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ReplyModel = tenantConnection.model(
      ForumReply.name,
      ForumReplySchema,
    );
    const LikeModel = tenantConnection.model(ForumLike.name, ForumLikeSchema);
    const MentionModel = tenantConnection.model(
      ForumMention.name,
      ForumMentionSchema,
    );
    const AttachmentModel = tenantConnection.model(
      ForumAttachment.name,
      ForumAttachmentSchema,
    );
    const ReportModel = tenantConnection.model(
      ForumReport.name,
      ForumReportSchema,
    );

    try {
      // Find the reply to delete
      const reply = await ReplyModel.findOne({
        _id: replyId,
        deleted_at: null,
      });

      if (!reply) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'REPLY_NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Check if user has permission to delete this reply
      const isAdmin = [RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN].includes(
        user.role.name as RoleEnum,
      );
      const isOwner = reply.created_by.toString() === user.id;

      if (!isAdmin && !isOwner) {
        throw new ForbiddenException(
          this.errorMessageService.getMessageWithLanguage(
            'COMMUNITY',
            'ONLY_CREATOR_OR_ADMIN_CAN_DELETE',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Get all sub-replies (recursively) to delete them too
      const subReplies = await this.getSubRepliesRecursively(
        ReplyModel,
        replyId,
      );
      const allReplyIds = [replyId, ...subReplies.map((r) => r._id.toString())];

      // Soft delete the reply and all its sub-replies
      await ReplyModel.updateMany(
        { _id: { $in: allReplyIds } },
        {
          deleted_at: new Date(),
          deleted_by: new Types.ObjectId(user.id),
        },
      );

      // If this reply has a parent, decrease the parent's sub_reply_count
      if (reply.parent_reply_id) {
        await ReplyModel.updateOne(
          { _id: reply.parent_reply_id },
          { $inc: { sub_reply_count: -1 } },
        );
      }

      // For each deleted sub-reply, decrease their parent's sub_reply_count
      for (const subReply of subReplies) {
        if (subReply.parent_reply_id) {
          await ReplyModel.updateOne(
            { _id: subReply.parent_reply_id },
            { $inc: { sub_reply_count: -1 } },
          );
        }
      }

      // Delete all related likes for all affected replies
      await LikeModel.deleteMany({
        entity_type: LikeEntityTypeEnum.REPLY,
        entity_id: { $in: allReplyIds.map((id) => new Types.ObjectId(id)) },
      });

      // Delete all related mentions for all affected replies
      await MentionModel.deleteMany({
        reply_id: { $in: allReplyIds.map((id) => new Types.ObjectId(id)) },
      });

      // Soft delete all related attachments for all affected replies
      await AttachmentModel.updateMany(
        { reply_id: { $in: allReplyIds.map((id) => new Types.ObjectId(id)) } },
        {
          deleted_at: new Date(),
          deleted_by: new Types.ObjectId(user.id),
        },
      );

      // Delete all related reports for all affected replies
      await ReportModel.deleteMany({
        entity_type: ReportEntityTypeEnum.REPLY,
        entity_id: { $in: allReplyIds.map((id) => new Types.ObjectId(id)) },
      });

      this.logger.log(
        `Reply and ${subReplies.length} sub-replies deleted: ${replyId}`,
      );

      return {
        message: this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'REPLY_DELETED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: {
          deleted_reply_id: replyId,
          deleted_sub_replies_count: subReplies.length,
        },
      };
    } catch (error) {
      this.logger.error(`Error deleting reply: ${replyId}`, error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'ERROR_DELETING_REPLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  /**
   * Recursively get all sub-replies for a given reply
   */
  private async getSubRepliesRecursively(
    ReplyModel: any,
    parentReplyId: string,
  ): Promise<any[]> {
    const subReplies = await ReplyModel.find({
      parent_reply_id: new Types.ObjectId(parentReplyId),
      deleted_at: null,
    }).lean();

    const allSubReplies = [...subReplies];

    // Recursively get sub-replies of sub-replies
    for (const subReply of subReplies) {
      const nestedSubReplies = await this.getSubRepliesRecursively(
        ReplyModel,
        subReply._id.toString(),
      );
      allSubReplies.push(...nestedSubReplies);
    }

    return allSubReplies;
  }

  /**
   * Get all available tags for forum discussions
   */
  async getAllTags(user: JWTUserPayload) {
    this.logger.log(`Getting all tags for user: ${user.id}`);

    try {
      const resolvedSchoolId = this.resolveSchoolId(user);

      // Validate school exists
      const school = await this.schoolModel.findById(resolvedSchoolId);
      if (!school) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'SCHOOL',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Get tenant connection
      const tenantConnection =
        await this.tenantConnectionService.getTenantConnection(school.db_name);
      const DiscussionModel = tenantConnection.model(
        ForumDiscussion.name,
        ForumDiscussionSchema,
      );

      // Get all unique tags from active discussions
      const discussions = await DiscussionModel.find(
        {
          deleted_at: null,
          status: DiscussionStatusEnum.ACTIVE,
        },
        { tags: 1 },
      ).lean();

      // Extract all tags and flatten the array
      const allTags = discussions
        .map((discussion) => discussion.tags || [])
        .flat()
        .filter((tag) => tag && tag.trim() !== ''); // Filter out empty tags

      // Get unique tags and sort them alphabetically
      const uniqueTags = [...new Set(allTags)].sort();

      this.logger.log(`Retrieved ${uniqueTags.length} unique tags`);

      return {
        message: this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'TAGS_RETRIEVED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: uniqueTags,
        total: uniqueTags.length,
      };
    } catch (error) {
      this.logger.error('Error getting all tags', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'COMMUNITY',
          'ERROR_GETTING_TAGS',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }
}
