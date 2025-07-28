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

import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { ReportContentDto } from './dto/report-content.dto';
import { DiscussionFilterDto } from './dto/discussion-filter.dto';
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

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
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
          'School ID is required in request body for super admin',
        );
      }
      return bodySchoolId.toString();
    } else {
      if (!user.school_id) {
        throw new BadRequestException('User school ID not found');
      }
      return user.school_id.toString();
    }
  }

  /**
   * Create a new forum discussion
   */
  async createDiscussion(
    createDiscussionDto: CreateDiscussionDto,
    user: JWTUserPayload,
  ) {
    const {
      school_id,
      title,
      content,
      type,
      tags,
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
          'Only professors and admins can create meeting discussions',
        );
      }
    }

    const resolvedSchoolId = this.resolveSchoolId(user, school_id);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException('School not found');
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
            'Meeting link, platform, and scheduled time are required for meeting type discussions',
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
        message: 'Discussion created successfully',
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
      throw new BadRequestException('Failed to create discussion');
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
        throw new NotFoundException('School not found');
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

      // Get discussions with pagination
      const discussions = await DiscussionModel.find(filter)
        .sort({ created_at: -1 })
        .skip(options.skip)
        .limit(options.limit)
        .lean();

      const total = await DiscussionModel.countDocuments(filter);

      this.logger.debug(`Found ${discussions.length} discussions`);

      // Attach user details for each discussion
      const discussionsWithUsers = await Promise.all(
        discussions.map(async (discussion) => {
          const userDetails = await this.getUserDetails(
            discussion.created_by.toString(),
            discussion.created_by_role,
            tenantConnection,
          );
          return {
            ...discussion,
            created_by_user: userDetails || null,
          };
        }),
      );

      const result = createPaginationResult(
        discussionsWithUsers,
        total,
        options,
      );

      return {
        message: 'Discussions retrieved successfully',
        ...result,
      };
    } catch (error) {
      this.logger.error('Error finding discussions', error?.stack || error);
      throw new BadRequestException('Failed to retrieve discussions');
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
      throw new NotFoundException('School not found');
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
        throw new NotFoundException('Discussion not found');
      }

      // Increment view count
      await DiscussionModel.updateOne(
        { _id: discussionId },
        { $inc: { view_count: 1 } },
      );

      // Attach user details
      const userDetails = await this.getUserDetails(
        discussion.created_by.toString(),
        discussion.created_by_role,
        tenantConnection,
      );
      const discussionWithUser = {
        ...discussion,
        created_by_user: userDetails || null,
      };

      return {
        message: 'Discussion retrieved successfully',
        data: discussionWithUser,
      };
    } catch (error) {
      this.logger.error('Error finding discussion', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve discussion');
    }
  }

  /**
   * Create a reply to a discussion
   */
  async createReply(createReplyDto: CreateReplyDto, user: JWTUserPayload) {
    const { school_id, discussion_id, content, parent_reply_id } =
      createReplyDto;

    this.logger.log(
      `Creating reply to discussion: ${discussion_id} by user: ${user.id}`,
    );

    const resolvedSchoolId = this.resolveSchoolId(user, school_id);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException('School not found');
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

    try {
      // Validate discussion exists
      const discussion = await DiscussionModel.findOne({
        _id: discussion_id,
        deleted_at: null,
        status: DiscussionStatusEnum.ACTIVE,
      });

      if (!discussion) {
        throw new NotFoundException('Discussion not found or not active');
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
          throw new NotFoundException('Parent reply not found or not active');
        }
      }

      // Create reply
      const newReply = new ReplyModel({
        discussion_id: new Types.ObjectId(discussion_id),
        content,
        created_by: new Types.ObjectId(user.id),
        created_by_role: user.role.name as RoleEnum,
        ...(parent_reply_id && {
          parent_reply_id: new Types.ObjectId(parent_reply_id),
        }),
      });

      const savedReply = await newReply.save();

      // Increment reply count on discussion
      await DiscussionModel.updateOne(
        { _id: discussion_id },
        { $inc: { reply_count: 1 } },
      );

      // If this is a sub-reply, increment sub_reply_count on parent reply
      if (parent_reply_id) {
        await ReplyModel.updateOne(
          { _id: parent_reply_id },
          { $inc: { sub_reply_count: 1 } },
        );
      }

      // Attach user details to the response
      const userDetails = await this.getUserDetails(
        user.id.toString(),
        user.role.name,
        tenantConnection,
      );
      const replyWithUser = {
        ...savedReply.toObject(),
        created_by_user: userDetails || null,
      };

      this.logger.log(`Reply created: ${savedReply._id}`);

      return {
        message: 'Reply created successfully',
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
      throw new BadRequestException('Failed to create reply');
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
      throw new NotFoundException('School not found');
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

    try {
      // Validate discussion exists
      const discussion = await DiscussionModel.findOne({
        _id: discussionId,
        deleted_at: null,
      });

      if (!discussion) {
        throw new NotFoundException('Discussion not found');
      }

      const options = getPaginationOptions(paginationDto || {});

      // Get replies (only top-level replies, not sub-replies)
      const [replies, total] = await Promise.all([
        ReplyModel.find({
          discussion_id: new Types.ObjectId(discussionId),
          parent_reply_id: null, // Only top-level replies
          deleted_at: null,
          status: ReplyStatusEnum.ACTIVE,
        })
          .sort({ created_at: 1 })
          .skip(options.skip)
          .limit(options.limit)
          .lean(),
        ReplyModel.countDocuments({
          discussion_id: new Types.ObjectId(discussionId),
          parent_reply_id: null, // Only top-level replies
          deleted_at: null,
          status: ReplyStatusEnum.ACTIVE,
        }),
      ]);

      this.logger.debug(`Found ${replies.length} replies`);

      // Attach user details for each reply
      const repliesWithUsers = await Promise.all(
        replies.map(async (reply) => {
          const userDetails = await this.getUserDetails(
            reply.created_by.toString(),
            reply.created_by_role,
            tenantConnection,
          );
          return {
            ...reply,
            created_by_user: userDetails || null,
            has_sub_replies: reply.sub_reply_count > 0,
            sub_reply_count: reply.sub_reply_count || 0,
          };
        }),
      );

      const result = createPaginationResult(repliesWithUsers, total, options);

      return {
        message: 'Replies retrieved successfully',
        ...result,
      };
    } catch (error) {
      this.logger.error('Error finding replies', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve replies');
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
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const ReplyModel = tenantConnection.model(
      ForumReply.name,
      ForumReplySchema,
    );

    try {
      // Validate parent reply exists
      const parentReply = await ReplyModel.findOne({
        _id: replyId,
        deleted_at: null,
        status: ReplyStatusEnum.ACTIVE,
      });

      if (!parentReply) {
        throw new NotFoundException('Parent reply not found or not active');
      }

      const options = getPaginationOptions(paginationDto || {});

      // Get sub-replies
      const [subReplies, total] = await Promise.all([
        ReplyModel.find({
          parent_reply_id: new Types.ObjectId(replyId),
          deleted_at: null,
          status: ReplyStatusEnum.ACTIVE,
        })
          .sort({ created_at: 1 })
          .skip(options.skip)
          .limit(options.limit)
          .lean(),
        ReplyModel.countDocuments({
          parent_reply_id: new Types.ObjectId(replyId),
          deleted_at: null,
          status: ReplyStatusEnum.ACTIVE,
        }),
      ]);

      this.logger.debug(`Found ${subReplies.length} sub-replies`);

      // Attach user details for each sub-reply
      const subRepliesWithUsers = await Promise.all(
        subReplies.map(async (reply) => {
          const userDetails = await this.getUserDetails(
            reply.created_by.toString(),
            reply.created_by_role,
            tenantConnection,
          );
          return {
            ...reply,
            created_by_user: userDetails || null,
          };
        }),
      );

      const result = createPaginationResult(
        subRepliesWithUsers,
        total,
        options,
      );

      return {
        message: 'Sub-replies retrieved successfully',
        ...result,
      };
    } catch (error) {
      this.logger.error('Error finding sub-replies', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve sub-replies');
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
      throw new NotFoundException('School not found');
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
          message: 'Like removed successfully',
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

        // Get user details for response
        const userDetails = await this.getUserDetails(
          user.id.toString(),
          user.role.name,
          tenantConnection,
        );

        return {
          message: 'Like added successfully',
          liked: true,
          liked_by_user: userDetails || null,
        };
      }
    } catch (error) {
      this.logger.error('Error toggling like', error?.stack || error);
      throw new BadRequestException('Failed to toggle like');
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
      throw new NotFoundException('School not found');
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
        throw new ConflictException('You have already reported this content');
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
        message: 'Content reported successfully',
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
      throw new BadRequestException('Failed to report content');
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
      throw new ForbiddenException('Access denied');
    }

    this.logger.log(`Getting reports for user: ${user.id}`);

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException('School not found');
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
        message: 'Reports retrieved successfully',
        ...result,
      };
    } catch (error) {
      this.logger.error('Error getting reports', error?.stack || error);
      throw new BadRequestException('Failed to retrieve reports');
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
      throw new ForbiddenException('Access denied');
    }

    this.logger.log(
      `Archiving discussion: ${discussionId} by user: ${user.id}`,
    );

    const resolvedSchoolId = this.resolveSchoolId(user);

    // Validate school exists
    const school = await this.schoolModel.findById(resolvedSchoolId);
    if (!school) {
      throw new NotFoundException('School not found');
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
        throw new NotFoundException('Discussion not found');
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
        message: 'Discussion archived successfully',
      };
    } catch (error) {
      this.logger.error('Error archiving discussion', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to archive discussion');
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
        // Students are stored in tenant database
        const StudentModel = tenantConnection.model('Student', 'students');
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
          .select('first_name last_name email role image')
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
}
