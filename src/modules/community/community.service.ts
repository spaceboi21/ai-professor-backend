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

      // Create discussion
      const newDiscussion = new DiscussionModel({
        title,
        content,
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
              ...attachment,
              discussion_id: savedDiscussion._id,
              entity_type: AttachmentEntityTypeEnum.DISCUSSION,
            },
            user,
          );
        }
      }

      // Send notifications to all school members about new discussion
      await this.notifyNewDiscussion(
        savedDiscussion,
        user,
        resolvedSchoolId,
        tenantConnection,
      );

      // Attach user details to the response
      const userDetails = await this.getUserDetails(
        user.id.toString(),
        user.role.name,
        tenantConnection,
      );
      const discussionWithUser = {
        ...savedDiscussion.toObject(),
        created_by_user: userDetails || null,
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

      // Simple role-based filtering
      if (user.role.name === RoleEnum.STUDENT) {
        filter.status = DiscussionStatusEnum.ACTIVE;
      } else if (user.role.name === RoleEnum.PROFESSOR) {
        filter.status = {
          $in: [DiscussionStatusEnum.ACTIVE, DiscussionStatusEnum.ARCHIVED],
        };
      }
      // Admins can see all content

      // Apply additional filters
      if (filterDto?.type) {
        filter.type = filterDto.type;
      }

      if (
        filterDto?.status &&
        [RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN].includes(
          user.role.name as RoleEnum,
        )
      ) {
        filter.status = filterDto.status;
      }

      if (filterDto?.search) {
        filter.$or = [
          { title: { $regex: filterDto.search, $options: 'i' } },
          { content: { $regex: filterDto.search, $options: 'i' } },
        ];
      }

      if (filterDto?.tags && filterDto.tags.length > 0) {
        filter.tags = { $in: filterDto.tags };
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
                $lookup: {
                  from: 'users',
                  localField: 'created_by',
                  foreignField: '_id',
                  as: 'lastReplyUserCentral',
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
                      else: {
                        _id: { $arrayElemAt: ['$lastReplyUserCentral._id', 0] },
                        first_name: {
                          $arrayElemAt: ['$lastReplyUserCentral.first_name', 0],
                        },
                        last_name: {
                          $arrayElemAt: ['$lastReplyUserCentral.last_name', 0],
                        },
                        email: {
                          $arrayElemAt: ['$lastReplyUserCentral.email', 0],
                        },
                        image: {
                          $arrayElemAt: [
                            '$lastReplyUserCentral.profile_pic',
                            0,
                          ],
                        },
                        role: {
                          $arrayElemAt: ['$lastReplyUserCentral.role', 0],
                        },
                      },
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
            last_reply: { $arrayElemAt: ['$lastReply', 0] },
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
          $lookup: {
            from: 'users',
            localField: 'created_by',
            foreignField: '_id',
            as: 'createdByUser',
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
                  role: 'STUDENT',
                },
                else: {
                  _id: { $arrayElemAt: ['$createdByUser._id', 0] },
                  first_name: {
                    $arrayElemAt: ['$createdByUser.first_name', 0],
                  },
                  last_name: { $arrayElemAt: ['$createdByUser.last_name', 0] },
                  email: { $arrayElemAt: ['$createdByUser.email', 0] },
                  image: { $arrayElemAt: ['$createdByUser.profile_pic', 0] },
                  role: { $arrayElemAt: ['$createdByUser.role', 0] },
                },
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
          $addFields: {
            last_reply_date: {
              $ifNull: ['$last_reply.created_at', '$created_at'],
            },
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
            userPin: 0,
            createdByStudent: 0,
            createdByUser: 0,
            userView: 0,
            last_reply_date: 0,
            lastReply: 0, // Remove the array version
          },
        },
      ];

      // Execute aggregation pipeline
      const [discussions, total] = await Promise.all([
        DiscussionModel.aggregate(aggregationPipeline),
        DiscussionModel.countDocuments(filter),
      ]);

      this.logger.debug(`Found ${discussions.length} discussions`);

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
        .populate('uploaded_by', 'first_name last_name email role profile_pic')
        .sort({ created_at: 1 })
        .lean();

      // Format attachment user details
      const formattedAttachments = attachments.map((attachment) => {
        if (attachment.uploaded_by) {
          const user = attachment.uploaded_by as any;
          if (user.role === RoleEnum.STUDENT) {
            return {
              ...attachment,
              uploaded_by_user: {
                _id: user._id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: RoleEnum.STUDENT,
                image: user.image,
              },
            };
          } else {
            return {
              ...attachment,
              uploaded_by_user: {
                _id: user._id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role,
                image: user.profile_pic,
              },
            };
          }
        }
        return attachment;
      });

      const discussionWithUser = {
        ...discussion.toObject(),
        created_by_user: userDetails || null,
        attachments: formattedAttachments,
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
                $lookup: {
                  from: 'users',
                  localField: 'mentioned_user',
                  foreignField: '_id',
                  as: 'mentionedUser',
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
                      else: {
                        _id: { $arrayElemAt: ['$mentionedUser._id', 0] },
                        first_name: {
                          $arrayElemAt: ['$mentionedUser.first_name', 0],
                        },
                        last_name: {
                          $arrayElemAt: ['$mentionedUser.last_name', 0],
                        },
                        email: { $arrayElemAt: ['$mentionedUser.email', 0] },
                        image: {
                          $arrayElemAt: ['$mentionedUser.profile_pic', 0],
                        },
                        role: { $arrayElemAt: ['$mentionedUser.role', 0] },
                      },
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
          $lookup: {
            from: 'users',
            localField: 'created_by',
            foreignField: '_id',
            as: 'createdByUser',
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
                  role: 'STUDENT',
                },
                else: {
                  _id: { $arrayElemAt: ['$createdByUser._id', 0] },
                  first_name: {
                    $arrayElemAt: ['$createdByUser.first_name', 0],
                  },
                  last_name: { $arrayElemAt: ['$createdByUser.last_name', 0] },
                  email: { $arrayElemAt: ['$createdByUser.email', 0] },
                  image: { $arrayElemAt: ['$createdByUser.profile_pic', 0] },
                  role: { $arrayElemAt: ['$createdByUser.role', 0] },
                },
              },
            },
            has_sub_replies: { $gt: ['$sub_reply_count', 0] },
            sub_reply_count: { $ifNull: ['$sub_reply_count', 0] },
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
          $sort: { created_at: 1 },
        },
        { $skip: options.skip },
        { $limit: options.limit },
        {
          $project: {
            createdByStudent: 0,
            createdByUser: 0,
            userView: 0,
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
        const formattedAttachments = attachments.map((attachment) => {
          if (attachment.uploaded_by) {
            const user = attachment.uploaded_by as any;
            if (user.role === RoleEnum.STUDENT) {
              return {
                ...attachment,
                uploaded_by_user: {
                  _id: user._id,
                  first_name: user.first_name,
                  last_name: user.last_name,
                  email: user.email,
                  role: RoleEnum.STUDENT,
                  image: user.image,
                },
              };
            } else {
              return {
                ...attachment,
                uploaded_by_user: {
                  _id: user._id,
                  first_name: user.first_name,
                  last_name: user.last_name,
                  email: user.email,
                  role: user.role,
                  image: user.profile_pic,
                },
              };
            }
          }
          return attachment;
        });

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
                $lookup: {
                  from: 'users',
                  localField: 'mentioned_user',
                  foreignField: '_id',
                  as: 'mentionedUser',
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
                      else: {
                        _id: { $arrayElemAt: ['$mentionedUser._id', 0] },
                        first_name: {
                          $arrayElemAt: ['$mentionedUser.first_name', 0],
                        },
                        last_name: {
                          $arrayElemAt: ['$mentionedUser.last_name', 0],
                        },
                        email: { $arrayElemAt: ['$mentionedUser.email', 0] },
                        image: {
                          $arrayElemAt: ['$mentionedUser.profile_pic', 0],
                        },
                        role: { $arrayElemAt: ['$mentionedUser.role', 0] },
                      },
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
          $lookup: {
            from: 'users',
            localField: 'created_by',
            foreignField: '_id',
            as: 'createdByUser',
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
                  role: 'STUDENT',
                },
                else: {
                  _id: { $arrayElemAt: ['$createdByUser._id', 0] },
                  first_name: {
                    $arrayElemAt: ['$createdByUser.first_name', 0],
                  },
                  last_name: { $arrayElemAt: ['$createdByUser.last_name', 0] },
                  email: { $arrayElemAt: ['$createdByUser.email', 0] },
                  image: { $arrayElemAt: ['$createdByUser.profile_pic', 0] },
                  role: { $arrayElemAt: ['$createdByUser.role', 0] },
                },
              },
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
            createdByStudent: 0,
            createdByUser: 0,
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
        const formattedAttachments = attachments.map((attachment) => {
          if (attachment.uploaded_by) {
            const user = attachment.uploaded_by as any;
            if (user.role === RoleEnum.STUDENT) {
              return {
                ...attachment,
                uploaded_by_user: {
                  _id: user._id,
                  first_name: user.first_name,
                  last_name: user.last_name,
                  email: user.email,
                  role: RoleEnum.STUDENT,
                  image: user.image,
                },
              };
            } else {
              return {
                ...attachment,
                uploaded_by_user: {
                  _id: user._id,
                  first_name: user.first_name,
                  last_name: user.last_name,
                  email: user.email,
                  role: user.role,
                  image: user.profile_pic,
                },
              };
            }
          }
          return attachment;
        });

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
          liked: false,
          liked_by_user: userDetails || null,
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
      if (userRole === RoleEnum.STUDENT && tenantConnection) {
        // Students are stored in tenant database - use the tenant connection
        const StudentModel = tenantConnection.model(
          Student.name,
          StudentSchema,
        );
        const student = await StudentModel.findById(userId)
          .select('first_name last_name email image')
          .lean();

        if (student) {
          return {
            _id: student._id,
            first_name: student.first_name,
            last_name: student.last_name,
            email: student.email,
            image: student.image || null,
            role: RoleEnum.STUDENT,
          };
        }
      } else {
        // Professors, admins, etc. are stored in central database
        const user = await this.userModel
          .findById(userId)
          .select('first_name last_name email role profile_pic')
          .lean();

        if (user) {
          return {
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            image: user.profile_pic || null,
            role: user.role,
          };
        }
      }

      return null;
    } catch (error) {
      this.logger.error('Error fetching user details', error);
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
      const metadata = {
        entity_type: entityType,
        entity_id: entity._id,
        entity_title: entityTitle,
        liker_id: like.liked_by,
        liker_name: `${liker.first_name} ${liker.last_name}`,
        liker_role: liker.role,
      };

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
   * Helper method to notify mentioned users about new reply
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
          $lookup: {
            from: 'users',
            localField: 'discussion.created_by',
            foreignField: '_id',
            as: 'createdByUser',
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
                else: {
                  _id: { $arrayElemAt: ['$createdByUser._id', 0] },
                  first_name: {
                    $arrayElemAt: ['$createdByUser.first_name', 0],
                  },
                  last_name: { $arrayElemAt: ['$createdByUser.last_name', 0] },
                  email: { $arrayElemAt: ['$createdByUser.email', 0] },
                  image: { $arrayElemAt: ['$createdByUser.profile_pic', 0] },
                  role: { $arrayElemAt: ['$createdByUser.role', 0] },
                },
              },
            },
            is_pinned: true,
            pinned_at: '$created_at',
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
          $lookup: {
            from: 'users',
            localField: 'mentioned_by',
            foreignField: '_id',
            as: 'mentionedByUser',
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

    return students.map((student: any) => ({
      id: student._id?.toString() || '',
      name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
      email: student.email || '',
      image: student.image || null,
      role: 'STUDENT',
      mention_text: `@${student.email || ''}`,
      display_name:
        `${student.first_name || ''} ${student.last_name || ''} (@${student.email || ''})`.trim(),
      search_text:
        `${student.first_name || ''} ${student.last_name || ''} ${student.email || ''}`.toLowerCase(),
    }));
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

    return professors.map((professor: any) => ({
      id: professor._id?.toString() || '',
      name: `${professor.first_name || ''} ${professor.last_name || ''}`.trim(),
      email: professor.email || '',
      image: professor.profile_pic || null,
      role: professor.role || 'PROFESSOR',
      mention_text: `@${professor.email || ''}`,
      display_name:
        `${professor.first_name || ''} ${professor.last_name || ''} (@${professor.email || ''})`.trim(),
      search_text:
        `${professor.first_name || ''} ${professor.last_name || ''} ${professor.email || ''}`.toLowerCase(),
    }));
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

      if (exportDto.tags && exportDto.tags.length > 0) {
        filter.tags = { $in: exportDto.tags };
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

      if (exportDto.tags && exportDto.tags.length > 0) {
        filter.tags = { $in: exportDto.tags };
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

      if (exportDto.tags && exportDto.tags.length > 0) {
        filter.tags = { $in: exportDto.tags };
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
      const formattedAttachments = attachments.map((attachment) => {
        if (attachment.uploaded_by) {
          const user = attachment.uploaded_by as any;
          if (user.role === RoleEnum.STUDENT) {
            // Get student details
            return {
              ...attachment,
              uploaded_by_user: {
                _id: user._id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: RoleEnum.STUDENT,
                image: user.image,
              },
            };
          } else {
            // Get professor/admin details
            return {
              ...attachment,
              uploaded_by_user: {
                _id: user._id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role,
                image: user.profile_pic,
              },
            };
          }
        }
        return attachment;
      });

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
      const formattedAttachments = attachments.map((attachment) => {
        if (attachment.uploaded_by) {
          const user = attachment.uploaded_by as any;
          if (user.role === RoleEnum.STUDENT) {
            // Get student details
            return {
              ...attachment,
              uploaded_by_user: {
                _id: user._id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: RoleEnum.STUDENT,
                image: user.image,
              },
            };
          } else {
            // Get professor/admin details
            return {
              ...attachment,
              uploaded_by_user: {
                _id: user._id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role,
                image: user.profile_pic,
              },
            };
          }
        }
        return attachment;
      });

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
}
