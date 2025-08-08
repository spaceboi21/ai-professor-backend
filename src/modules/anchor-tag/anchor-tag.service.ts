import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import {
  createPaginationResult,
  getPaginationOptions,
} from 'src/common/utils/pagination.util';
import { School } from 'src/database/schemas/central/school.schema';
import { User } from 'src/database/schemas/central/user.schema';
import {
  Chapter,
  ChapterSchema,
} from 'src/database/schemas/tenant/chapter.schema';
import {
  Module,
  ModuleSchema,
} from 'src/database/schemas/tenant/module.schema';
import {
  Bibliography,
  BibliographySchema,
} from 'src/database/schemas/tenant/bibliography.schema';
import {
  QuizGroup,
  QuizGroupSchema,
} from 'src/database/schemas/tenant/quiz-group.schema';
import { Quiz, QuizSchema } from 'src/database/schemas/tenant/quiz.schema';
import {
  AnchorTag,
  AnchorTagSchema,
} from 'src/database/schemas/tenant/anchor-tag.schema';
import {
  StudentAnchorTagAttempt,
  StudentAnchorTagAttemptSchema,
} from 'src/database/schemas/tenant/student-anchor-tag-attempt.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { CreateAnchorTagDto } from './dto/create-anchor-tag.dto';
import { UpdateAnchorTagDto } from './dto/update-anchor-tag.dto';
import { AnchorTagFilterDto } from './dto/anchor-tag-filter.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { DEFAULT_LANGUAGE } from 'src/common/constants/language.constant';
import {
  AnchorTagStatusEnum,
  AnchorTagTypeEnum,
} from 'src/common/constants/anchor-tag.constant';
import { NotificationsService } from '../notifications/notifications.service';
import { RecipientTypeEnum } from 'src/database/schemas/tenant/notification.schema';
import { NotificationTypeEnum } from 'src/common/constants/notification.constant';

@Injectable()
export class AnchorTagService {
  private readonly logger = new Logger(AnchorTagService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly errorMessageService: ErrorMessageService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createAnchorTag(
    createAnchorTagDto: CreateAnchorTagDto,
    user: JWTUserPayload,
  ) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'SCHOOL_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const AnchorTagModel = connection.model(AnchorTag.name, AnchorTagSchema);
    const ModuleModel = connection.model(Module.name, ModuleSchema);
    const ChapterModel = connection.model(Chapter.name, ChapterSchema);
    const BibliographyModel = connection.model(
      Bibliography.name,
      BibliographySchema,
    );
    const QuizGroupModel = connection.model(QuizGroup.name, QuizGroupSchema);
    const QuizModel = connection.model(Quiz.name, QuizSchema);

    const {
      module_id,
      chapter_id,
      bibliography_id,
      quiz_group_id,
      content_type,
      content_reference,
      timestamp_seconds,
      page_number,
      slide_number,
    } = createAnchorTagDto;

    // Validate module exists
    const module = await ModuleModel.findById(module_id);
    if (!module) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'MODULE_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Validate chapter exists
    const chapter = await ChapterModel.findById(chapter_id);
    if (!chapter) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'CHAPTER_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Validate bibliography exists
    const bibliography = await BibliographyModel.findById(bibliography_id);
    if (!bibliography) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'BIBLIOGRAPHY_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Validate quiz group exists
    const quizGroup = await QuizGroupModel.findById(quiz_group_id);
    if (!quizGroup) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'QUIZ_GROUP_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Validate content-specific fields
    this.validateContentSpecificFields(
      content_type,
      content_reference,
      timestamp_seconds,
      page_number,
      slide_number,
      user,
    );

    // Create anchor tag
    const anchorTag = new AnchorTagModel({
      module_id: new Types.ObjectId(createAnchorTagDto.module_id),
      chapter_id: new Types.ObjectId(createAnchorTagDto.chapter_id),
      bibliography_id: new Types.ObjectId(createAnchorTagDto.bibliography_id),
      title: createAnchorTagDto.title,
      description: createAnchorTagDto.description ?? null,
      content_type: createAnchorTagDto.content_type,
      content_reference: createAnchorTagDto.content_reference,
      timestamp_seconds: createAnchorTagDto.timestamp_seconds ?? null,
      page_number: createAnchorTagDto.page_number ?? null,
      slide_number: createAnchorTagDto.slide_number ?? null,
      status: createAnchorTagDto.status ?? AnchorTagStatusEnum.ACTIVE,
      is_mandatory: createAnchorTagDto.is_mandatory ?? false,
      quiz_group_id: new Types.ObjectId(createAnchorTagDto.quiz_group_id),
      tags: createAnchorTagDto.tags ?? [],
      created_by: new Types.ObjectId(user.id),
      created_by_role: user.role.name,
    });

    const savedAnchorTag = await anchorTag.save();

    return savedAnchorTag;
  }

  async findAllAnchorTags(
    user: JWTUserPayload,
    paginationDto?: PaginationDto,
    filterDto?: AnchorTagFilterDto,
  ) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'SCHOOL_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const AnchorTagModel = connection.model(AnchorTag.name, AnchorTagSchema);
    const QuizGroupModel = connection.model(QuizGroup.name, QuizGroupSchema);
    const QuizModel = connection.model(Quiz.name, QuizSchema);

    const paginationOptions = getPaginationOptions(paginationDto || {});

    // Build filter query
    const filterQuery: any = { deleted_at: null };

    if (filterDto) {
      const {
        module_id,
        chapter_id,
        bibliography_id,
        quiz_group_id,
        content_type,
        status,
        is_mandatory,
        search,
        tags,
      } = filterDto;

      if (module_id) filterQuery.module_id = new Types.ObjectId(module_id);
      if (chapter_id) filterQuery.chapter_id = new Types.ObjectId(chapter_id);
      if (bibliography_id)
        filterQuery.bibliography_id = new Types.ObjectId(bibliography_id);
      if (quiz_group_id)
        filterQuery.quiz_group_id = new Types.ObjectId(quiz_group_id);
      if (content_type) filterQuery.content_type = content_type;
      if (status) filterQuery.status = status;
      if (is_mandatory) filterQuery.is_mandatory = is_mandatory;
      if (tags && tags.length > 0) {
        filterQuery.tags = { $in: tags };
      }
      if (search) {
        filterQuery.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }
    }

    // Get total count
    const total = await AnchorTagModel.countDocuments(filterQuery);

    // Get anchor tags with pagination
    const anchorTags = await AnchorTagModel.find(filterQuery)
      .sort({ created_at: -1 })
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit)
      .populate('module_id', 'title')
      .populate('chapter_id', 'title')
      .populate('bibliography_id', 'title type')
      .populate('quiz_group_id', 'title subject category difficulty')
      .populate('created_by', 'first_name last_name email')
      .lean();

    // Fetch quizzes for each anchor tag's quiz group
    const anchorTagsWithQuizzes = await Promise.all(
      anchorTags.map(async (anchorTag) => {
        if (
          anchorTag.quiz_group_id &&
          typeof anchorTag.quiz_group_id === 'object' &&
          '_id' in anchorTag.quiz_group_id
        ) {
          const quizzes = await QuizModel.find({
            quiz_group_id: anchorTag.quiz_group_id._id,
            deleted_at: null,
          })
            .sort({ sequence: 1 })
            .lean();

          const quizGroupData = anchorTag.quiz_group_id as any;
          return {
            ...anchorTag,
            quiz_group: {
              ...quizGroupData,
              quizzes,
            },
          };
        }
        return anchorTag;
      }),
    );

    return createPaginationResult(
      anchorTagsWithQuizzes,
      total,
      paginationOptions,
    );
  }

  async findAnchorTagById(id: string | Types.ObjectId, user: JWTUserPayload) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'SCHOOL_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const AnchorTagModel = connection.model(AnchorTag.name, AnchorTagSchema);
    const QuizGroupModel = connection.model(QuizGroup.name, QuizGroupSchema);
    const QuizModel = connection.model(Quiz.name, QuizSchema);

    const anchorTag = await AnchorTagModel.findOne({
      _id: new Types.ObjectId(id),
      deleted_at: null,
    })
      .populate('module_id', 'title')
      .populate('chapter_id', 'title')
      .populate('bibliography_id', 'title type')
      .populate('quiz_group_id', 'title subject category difficulty')
      .populate('created_by', 'first_name last_name email')
      .lean();

    if (!anchorTag) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'ANCHOR_TAG_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Fetch quizzes for the anchor tag's quiz group
    if (
      anchorTag.quiz_group_id &&
      typeof anchorTag.quiz_group_id === 'object' &&
      '_id' in anchorTag.quiz_group_id
    ) {
      const quizzes = await QuizModel.find({
        quiz_group_id: anchorTag.quiz_group_id._id,
        deleted_at: null,
      })
        .sort({ sequence: 1 })
        .lean();

      const quizGroupData = anchorTag.quiz_group_id as any;
      return {
        ...anchorTag,
        quiz_group: {
          ...quizGroupData,
          quizzes,
        },
      };
    }

    return anchorTag;
  }

  async updateAnchorTag(
    id: string | Types.ObjectId,
    updateAnchorTagDto: UpdateAnchorTagDto,
    user: JWTUserPayload,
  ) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'SCHOOL_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const AnchorTagModel = connection.model(AnchorTag.name, AnchorTagSchema);
    const QuizGroupModel = connection.model(QuizGroup.name, QuizGroupSchema);
    const QuizModel = connection.model(Quiz.name, QuizSchema);

    // Check if anchor tag exists
    const existingAnchorTag = await AnchorTagModel.findOne({
      _id: new Types.ObjectId(id),
      deleted_at: null,
    });

    if (!existingAnchorTag) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'ANCHOR_TAG_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const {
      quiz_group_id,
      content_type,
      content_reference,
      timestamp_seconds,
      page_number,
      slide_number,
    } = updateAnchorTagDto;

    // Validate quiz group if provided
    if (quiz_group_id) {
      const quizGroup = await QuizGroupModel.findById(
        new Types.ObjectId(quiz_group_id),
      );
      if (!quizGroup) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'ANCHOR_TAG',
            'QUIZ_GROUP_NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    }

    // Validate content-specific fields if content type is being updated
    if (content_type || content_reference) {
      const finalContentType = content_type || existingAnchorTag.content_type;
      const finalContentReference =
        content_reference || existingAnchorTag.content_reference;
      this.validateContentSpecificFields(
        finalContentType,
        finalContentReference,
        timestamp_seconds,
        page_number,
        slide_number,
        user,
      );
    }

    // Prepare update data with proper ObjectId conversion
    const updateData: any = {
      updated_at: new Date(),
    };

    // Always include all fields, converting undefined to null
    updateData.title = updateAnchorTagDto.title;
    updateData.description = updateAnchorTagDto.description ?? null;
    updateData.content_type = updateAnchorTagDto.content_type;
    updateData.content_reference = updateAnchorTagDto.content_reference;
    updateData.timestamp_seconds = updateAnchorTagDto.timestamp_seconds ?? null;
    updateData.page_number = updateAnchorTagDto.page_number ?? null;
    updateData.slide_number = updateAnchorTagDto.slide_number ?? null;
    updateData.status = updateAnchorTagDto.status ?? null;
    updateData.is_mandatory = updateAnchorTagDto.is_mandatory ?? null;
    updateData.tags = updateAnchorTagDto.tags ?? null;

    // Convert ObjectIds if provided
    updateData.quiz_group_id = quiz_group_id
      ? new Types.ObjectId(quiz_group_id)
      : null;

    // Update anchor tag
    const updatedAnchorTag = await AnchorTagModel.findByIdAndUpdate(
      new Types.ObjectId(id),
      updateData,
      { new: true },
    )
      .populate('module_id', 'title')
      .populate('chapter_id', 'title')
      .populate('bibliography_id', 'title type')
      .populate('quiz_group_id', 'title')
      .populate({
        path: 'quiz_group_id',
        populate: {
          path: 'quizzes',
          model: 'Quiz',
          match: { deleted_at: null },
          options: { sort: { sequence: 1 } },
        },
      })
      .populate('created_by', 'first_name last_name email')
      .lean();

    if (!updatedAnchorTag) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'ANCHOR_TAG_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    return updatedAnchorTag;
  }

  async removeAnchorTag(id: string | Types.ObjectId, user: JWTUserPayload) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'SCHOOL_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const AnchorTagModel = connection.model(AnchorTag.name, AnchorTagSchema);

    // Check if anchor tag exists
    const existingAnchorTag = await AnchorTagModel.findOne({
      _id: new Types.ObjectId(id),
      deleted_at: null,
    });

    if (!existingAnchorTag) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'ANCHOR_TAG_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Soft delete anchor tag
    const deletedAnchorTag = await AnchorTagModel.findByIdAndUpdate(
      new Types.ObjectId(id),
      {
        deleted_at: new Date(),
        status: AnchorTagStatusEnum.ARCHIVED,
      },
      { new: true },
    );

    return { message: 'Anchor tag deleted successfully' };
  }

  async getAnchorTagsByBibliography(
    bibliography_id: string | Types.ObjectId,
    user: JWTUserPayload,
  ) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'SCHOOL_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const AnchorTagModel = connection.model(AnchorTag.name, AnchorTagSchema);
    const QuizGroupModel = connection.model(QuizGroup.name, QuizGroupSchema);
    const QuizModel = connection.model(Quiz.name, QuizSchema);

    const anchorTags = await AnchorTagModel.find({
      bibliography_id: new Types.ObjectId(bibliography_id),
      deleted_at: null,
      status: AnchorTagStatusEnum.ACTIVE,
    })
      .sort({ created_at: -1 })
      .populate('quiz_group_id', 'title subject category difficulty')
      .lean();

    // Fetch quizzes for each anchor tag's quiz group
    const anchorTagsWithQuizzes = await Promise.all(
      anchorTags.map(async (anchorTag) => {
        if (
          anchorTag.quiz_group_id &&
          typeof anchorTag.quiz_group_id === 'object' &&
          '_id' in anchorTag.quiz_group_id
        ) {
          const quizzes = await QuizModel.find({
            quiz_group_id: anchorTag.quiz_group_id._id,
            deleted_at: null,
          })
            .sort({ sequence: 1 })
            .lean();

          const quizGroupData = anchorTag.quiz_group_id as any;
          return {
            ...anchorTag,
            quiz_group: {
              ...quizGroupData,
              quizzes,
            },
          };
        }
        return anchorTag;
      }),
    );

    return anchorTagsWithQuizzes;
  }

  async getAnchorTagsByChapterAndModule(
    chapter_id: string | Types.ObjectId,
    module_id: string | Types.ObjectId,
    user: JWTUserPayload,
  ) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'SCHOOL_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const AnchorTagModel = connection.model(AnchorTag.name, AnchorTagSchema);
    const QuizGroupModel = connection.model(QuizGroup.name, QuizGroupSchema);
    const QuizModel = connection.model(Quiz.name, QuizSchema);

    this.logger.log(`Searching for anchor tags with chapter_id: ${chapter_id} and module_id: ${module_id}`);
    
    const anchorTags = await AnchorTagModel.find({
      chapter_id: new Types.ObjectId(chapter_id),
      module_id: new Types.ObjectId(module_id),
      deleted_at: null,
    })
      .sort({ sequence: 1 })
      .populate('quiz_group_id', 'title subject category difficulty')
      .lean();

    this.logger.log(`Found ${anchorTags.length} anchor tags in database`);

    // Fetch quizzes for each anchor tag's quiz group
    const anchorTagsWithQuizzes = await Promise.all(
      anchorTags.map(async (anchorTag) => {
        if (
          anchorTag.quiz_group_id &&
          typeof anchorTag.quiz_group_id === 'object' &&
          '_id' in anchorTag.quiz_group_id
        ) {
          const quizzes = await QuizModel.find({
            quiz_group_id: anchorTag.quiz_group_id._id,
            deleted_at: null,
          })
            .sort({ sequence: 1 })
            .lean();

          const quizGroupData = anchorTag.quiz_group_id as any;
          return {
            ...anchorTag,
            quiz_group: {
              ...quizGroupData,
              quizzes,
            },
          };
        }
        return anchorTag;
      }),
    );

    return anchorTagsWithQuizzes;
  }

  private validateContentSpecificFields(
    content_type: AnchorTagTypeEnum,
    content_reference: string,
    timestamp_seconds?: number,
    page_number?: number,
    slide_number?: number,
    user?: JWTUserPayload,
  ) {
    switch (content_type) {
      case AnchorTagTypeEnum.VIDEO:
        if (timestamp_seconds === undefined || timestamp_seconds < 0) {
          throw new BadRequestException(
            this.errorMessageService.getMessageWithLanguage(
              'ANCHOR_TAG',
              'TIMESTAMP_REQUIRED_FOR_VIDEO',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }
        break;
      case AnchorTagTypeEnum.PDF:
        if (page_number === undefined || page_number < 1) {
          throw new BadRequestException(
            this.errorMessageService.getMessageWithLanguage(
              'ANCHOR_TAG',
              'PAGE_NUMBER_REQUIRED_FOR_PDF',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }
        break;
      case AnchorTagTypeEnum.SLIDE:
        if (slide_number === undefined || slide_number < 1) {
          throw new BadRequestException(
            this.errorMessageService.getMessageWithLanguage(
              'ANCHOR_TAG',
              'SLIDE_NUMBER_REQUIRED_FOR_SLIDE',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }
        break;
    }
  }

  async sendMissedAnchorTagNotifications(
    bibliography_id: string | Types.ObjectId,
    user: JWTUserPayload,
  ) {
    this.logger.log(
      `Sending missed anchor tag notifications for bibliography: ${bibliography_id}, user: ${user.id}`,
    );

    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'SCHOOL_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );

    const AnchorTagModel = connection.model(AnchorTag.name, AnchorTagSchema);
    const StudentAnchorTagAttemptModel = connection.model(
      StudentAnchorTagAttempt.name,
      StudentAnchorTagAttemptSchema,
    );

    const mandatoryAnchorTags = await AnchorTagModel.find({
      bibliography_id: new Types.ObjectId(bibliography_id),
      is_mandatory: true,
      status: AnchorTagStatusEnum.ACTIVE,
      deleted_at: null,
    }).lean();

    if (mandatoryAnchorTags.length === 0) {
      return {
        message: this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'NO_MANDATORY_ANCHOR_TAGS_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: {
          bibliography_id,
          notifications_sent: 0,
          total_mandatory_tags: 0,
        },
      };
    }

    let totalNotificationsSent = 0;
    const missedAnchorTags: any[] = [];

    for (const anchorTag of mandatoryAnchorTags) {
      const attempt = await StudentAnchorTagAttemptModel.findOne({
        student_id: user.id,
        anchor_tag_id: anchorTag._id,
        status: { $in: ['COMPLETED', 'SKIPPED'] },
        deleted_at: null,
      }).lean();

      if (!attempt) {
        missedAnchorTags.push(anchorTag);
      }
    }

    for (const tag of missedAnchorTags) {
      try {
        const titleEn = 'Mandatory Anchor Point Pending';
        const titleFr = "Point d'Ancrage Obligatoire en Attente";

        const messageEn = `You have a pending mandatory anchor point titled "${tag.title}" in this bibliography. Please complete it to continue your learning.`;
        const messageFr = `Vous avez un point d'ancrage obligatoire en attente intitulé "${tag.title}" dans cette bibliographie. Veuillez le compléter pour poursuivre votre apprentissage.`;

        const metadata = {
          bibliography_id,
          anchor_tag_id: tag._id,
          title: tag.title,
          description: tag.description,
          content_type: tag.content_type,
          student_id: user.id,
          school_id: user.school_id,
          notification_type: 'MISSED_MANDATORY_ANCHOR_TAG',
          timestamp: new Date(),
        };
        const schoolId = user.school_id
          ? new Types.ObjectId(user.school_id)
          : null;
        await this.notificationsService.createMultiLanguageNotification(
          user.id as Types.ObjectId,
          RecipientTypeEnum.STUDENT,
          titleEn,
          titleFr,
          messageEn,
          messageFr,
          NotificationTypeEnum.ANCHOR_TAG_MISSED,
          metadata,
          schoolId as Types.ObjectId,
        );

        this.logger.log(
          `Notification sent to student ${user.id} for missed anchor tag: ${tag._id}`,
        );

        totalNotificationsSent++;
      } catch (error) {
        this.logger.error(
          `Error sending notification for anchor tag ${tag._id} to student ${user.id}:`,
          error,
        );
      }
    }

    return {
      message: this.errorMessageService.getMessageWithLanguage(
        'ANCHOR_TAG',
        'MISSED_ANCHOR_TAG_NOTIFICATIONS_PROCESSED',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: {
        bibliography_id,
        student_id: user.id,
        missed_anchor_tags: missedAnchorTags.length,
        total_notifications_sent: totalNotificationsSent,
      },
    };
  }
}
