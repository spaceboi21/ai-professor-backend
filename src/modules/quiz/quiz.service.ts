import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { QuizTypeEnum } from 'src/common/constants/quiz.constant';
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
  QuizGroup,
  QuizGroupSchema,
} from 'src/database/schemas/tenant/quiz-group.schema';
import { Quiz, QuizSchema } from 'src/database/schemas/tenant/quiz.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { CreateQuizGroupDto } from './dto/create-quiz-group.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { QuizFilterDto, QuizGroupFilterDto } from './dto/quiz-filter.dto';
import { UpdateQuizGroupDto } from './dto/update-quiz-group.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { ProgressService } from '../progress/progress.service';
import { RoleEnum } from 'src/common/constants/roles.constant';

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly progressService: ProgressService,
  ) {}

  // ========== QUIZ GROUP OPERATIONS ==========

  async createQuizGroup(
    createQuizGroupDto: CreateQuizGroupDto,
    user: JWTUserPayload,
  ) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }
    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const QuizGroupModel = connection.model(QuizGroup.name, QuizGroupSchema);
    const ModuleModel = connection.model(Module.name, ModuleSchema);
    const ChapterModel = connection.model(Chapter.name, ChapterSchema);

    const {
      type,
      module_id,
      chapter_id,
      subject,
      description,
      difficulty,
      time_left,
      category,
    } = createQuizGroupDto;

    // Validate that module_id or chapter_id is provided based on type
    if (type === QuizTypeEnum.MODULE && !module_id) {
      throw new BadRequestException(
        'Module ID is required when type is MODULE',
      );
    }
    if (type === QuizTypeEnum.CHAPTER && !chapter_id) {
      throw new BadRequestException(
        'Chapter ID is required when type is CHAPTER',
      );
    }

    // Validate that the module or chapter exists
    if (type === QuizTypeEnum.MODULE) {
      const moduleExists = await ModuleModel.findOne({
        _id: module_id,
        deleted_at: null,
      });
      if (!moduleExists) {
        throw new NotFoundException('Module not found');
      }
    }

    if (type === QuizTypeEnum.CHAPTER) {
      const chapterExists = await ChapterModel.findOne({
        _id: chapter_id,
        deleted_at: null,
      });
      if (!chapterExists) {
        throw new NotFoundException('Chapter not found');
      }
    }

    const quizGroupData = {
      subject,
      description,
      difficulty,
      time_left,
      category,
      type,
      module_id:
        type === QuizTypeEnum.CHAPTER || type === QuizTypeEnum.MODULE
          ? new Types.ObjectId(module_id)
          : null,
      chapter_id:
        type === QuizTypeEnum.CHAPTER ? new Types.ObjectId(chapter_id) : null,
      created_by: new Types.ObjectId(user.id),
      created_by_role: user.role.name,
    };

    const quizGroup = new QuizGroupModel(quizGroupData);
    await quizGroup.save();

    this.logger.log(
      `Quiz group created with ID: ${quizGroup._id} by user: ${user.id}`,
    );

    return quizGroup;
  }

  async findAllQuizGroups(
    user: JWTUserPayload,
    filterDto?: QuizGroupFilterDto,
  ) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }
    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const QuizGroupModel = connection.model(QuizGroup.name, QuizGroupSchema);
    const QuizModel = connection.model(Quiz.name, QuizSchema);
    // Register Module and Chapter models for populate to work
    connection.model(Module.name, ModuleSchema);
    connection.model(Chapter.name, ChapterSchema);

    const filter: any = { deleted_at: null };

    // Apply filters
    if (filterDto?.category) {
      filter.category = filterDto.category;
    }
    if (filterDto?.difficulty) {
      filter.difficulty = filterDto.difficulty;
    }
    if (filterDto?.type) {
      filter.type = filterDto.type;
    }
    if (filterDto?.module_id) {
      filter.module_id = new Types.ObjectId(filterDto.module_id);
      filter.type = QuizTypeEnum.MODULE;
    }
    if (filterDto?.chapter_id) {
      filter.chapter_id = new Types.ObjectId(filterDto.chapter_id);
      filter.type = QuizTypeEnum.CHAPTER;
    }

    const quizGroups = await QuizGroupModel.findOne(filter).lean();

    if (!quizGroups?._id) {
      throw new NotFoundException('Quiz group not found');
    }

    // // Check if student can access this quiz (validate sequence)
    if (user.role.name === RoleEnum.STUDENT) {
      // Validate quiz group exists
      const quizGroup = await QuizGroupModel.findOne({
        _id: new Types.ObjectId(quizGroups?._id),

        deleted_at: null,
      });

      if (!quizGroup) {
        throw new NotFoundException('Quiz group not found');
      }

      // Validate access to this quiz (chapter-based validation)
      if (quizGroup.chapter_id) {
        await this.progressService.validateQuizAccess(
          user.id,
          quizGroup,
          connection,
        );
      }
    }

    const quiz = await QuizModel.find({
      quiz_group_id: quizGroups._id,
      deleted_at: null,
    })
      .sort({
        sequence: 1,
        created_at: -1,
      })
      .lean();

    return { ...quizGroups, quiz };
  }

  async findQuizGroupById(id: string | Types.ObjectId, user: JWTUserPayload) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }
    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const QuizGroupModel = connection.model(QuizGroup.name, QuizGroupSchema);
    // Register Module and Chapter models for populate to work
    connection.model(Module.name, ModuleSchema);
    connection.model(Chapter.name, ChapterSchema);

    const quizGroup = await QuizGroupModel.findOne({
      _id: id,
      deleted_at: null,
    })
      .populate('module_id', 'title subject')
      .populate('chapter_id', 'title subject')
      .exec();

    if (!quizGroup) {
      throw new NotFoundException('Quiz group not found');
    }

    return quizGroup;
  }

  async updateQuizGroup(
    id: string | Types.ObjectId,
    updateQuizGroupDto: UpdateQuizGroupDto,
    user: JWTUserPayload,
  ) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }
    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const QuizGroupModel = connection.model(QuizGroup.name, QuizGroupSchema);
    const ModuleModel = connection.model(Module.name, ModuleSchema);
    const ChapterModel = connection.model(Chapter.name, ChapterSchema);

    const quizGroup = await QuizGroupModel.findOne({
      _id: id,
      deleted_at: null,
    });

    if (!quizGroup) {
      throw new NotFoundException('Quiz group not found');
    }

    // Validate module/chapter if being updated
    if (
      updateQuizGroupDto.type === QuizTypeEnum.MODULE &&
      updateQuizGroupDto.module_id
    ) {
      const moduleExists = await ModuleModel.findOne({
        _id: updateQuizGroupDto.module_id,
        deleted_at: null,
      });
      if (!moduleExists) {
        throw new NotFoundException('Module not found');
      }
    }

    if (
      updateQuizGroupDto.type === QuizTypeEnum.CHAPTER &&
      updateQuizGroupDto.chapter_id
    ) {
      const chapterExists = await ChapterModel.findOne({
        _id: updateQuizGroupDto.chapter_id,
        deleted_at: null,
      });
      if (!chapterExists) {
        throw new NotFoundException('Chapter not found');
      }
    }

    Object.assign(quizGroup, updateQuizGroupDto);
    await quizGroup.save();

    this.logger.log(`Quiz group updated with ID: ${id} by user: ${user.id}`);

    return quizGroup;
  }

  async removeQuizGroup(id: string | Types.ObjectId, user: JWTUserPayload) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }
    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const QuizGroupModel = connection.model(QuizGroup.name, QuizGroupSchema);
    const QuizModel = connection.model(Quiz.name, QuizSchema);

    const quizGroup = await QuizGroupModel.findOne({
      _id: id,
      deleted_at: null,
    });

    if (!quizGroup) {
      throw new NotFoundException('Quiz group not found');
    }

    // Soft delete the quiz group and all associated quizzes
    await Promise.all([
      QuizGroupModel.updateOne({ _id: id }, { deleted_at: new Date() }),
      QuizModel.updateMany({ quiz_group_id: id }, { deleted_at: new Date() }),
    ]);

    this.logger.log(
      `Quiz group soft deleted with ID: ${id} by user: ${user.id}`,
    );

    return { message: 'Quiz group deleted successfully' };
  }

  // ========== QUIZ OPERATIONS ==========

  async createQuiz(createQuizDto: CreateQuizDto, user: JWTUserPayload) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }
    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const QuizModel = connection.model(Quiz.name, QuizSchema);
    const QuizGroupModel = connection.model(QuizGroup.name, QuizGroupSchema);

    const {
      quiz_group_id,
      question,
      type,
      options,
      answer = [],
      explanation,
      sequence,
      tags = [],
    } = createQuizDto;

    // Validate that the quiz group exists
    const quizGroup = await QuizGroupModel.findOne({
      _id: quiz_group_id,
      deleted_at: null,
    });
    if (!quizGroup) {
      throw new NotFoundException('Quiz group not found');
    }

    // Generate sequence if not provided
    let finalSequence = sequence;
    if (!finalSequence) {
      finalSequence = await this.getNextQuizSequence(quiz_group_id, user);
    }

    const quizData = {
      quiz_group_id: new Types.ObjectId(quiz_group_id),
      module_id: quizGroup.module_id,
      chapter_id: quizGroup.chapter_id,
      question,
      type,
      options,
      answer,
      explanation,
      sequence: finalSequence,
      tags,
      created_by: new Types.ObjectId(user.id),
      created_by_role: user.role.name,
    };

    const quiz = new QuizModel(quizData);
    await quiz.save();

    this.logger.log(`Quiz created with ID: ${quiz._id} by user: ${user.id}`);

    return quiz;
  }

  async findAllQuizzes(user: JWTUserPayload, filterDto?: QuizFilterDto) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }
    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const QuizModel = connection.model(Quiz.name, QuizSchema);
    // Register QuizGroup, Module and Chapter models for populate to work
    connection.model(QuizGroup.name, QuizGroupSchema);
    connection.model(Module.name, ModuleSchema);
    connection.model(Chapter.name, ChapterSchema);

    const filter: any = { deleted_at: null };

    // Apply filters
    if (filterDto?.quiz_group_id) {
      filter.quiz_group_id = new Types.ObjectId(filterDto.quiz_group_id);
    }
    if (filterDto?.type) {
      filter.type = filterDto.type;
    }
    if (filterDto?.module_id) {
      filter.module_id = new Types.ObjectId(filterDto.module_id);
    }
    if (filterDto?.chapter_id) {
      filter.chapter_id = new Types.ObjectId(filterDto.chapter_id);
    }
    if (filterDto?.tags) {
      filter.tags = { $in: [filterDto.tags] };
    }

    const [quizzes] = await Promise.all([
      QuizModel.find(filter)
        .sort({ sequence: 1, created_at: -1 })
        .populate('quiz_group_id', 'subject category difficulty')
        .populate('module_id', 'title subject')
        .populate('chapter_id', 'title subject')
        .exec(),
      // QuizModel.countDocuments(filter),
    ]);

    // return createPaginationResult(quizzes, total, paginationOptions);
    return quizzes;
  }

  async findQuizById(id: string | Types.ObjectId, user: JWTUserPayload) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }
    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const QuizModel = connection.model(Quiz.name, QuizSchema);
    // Register QuizGroup, Module and Chapter models for populate to work
    connection.model(QuizGroup.name, QuizGroupSchema);
    connection.model(Module.name, ModuleSchema);
    connection.model(Chapter.name, ChapterSchema);

    const quiz = await QuizModel.findOne({
      _id: id,
      deleted_at: null,
    })
      .populate('quiz_group_id', 'subject category difficulty')
      .populate('module_id', 'title subject')
      .populate('chapter_id', 'title subject')
      .exec();

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return quiz;
  }

  async updateQuiz(
    id: string | Types.ObjectId,
    updateQuizDto: UpdateQuizDto,
    user: JWTUserPayload,
  ) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }
    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const QuizModel = connection.model(Quiz.name, QuizSchema);

    const quiz = await QuizModel.findOne({
      _id: id,
      deleted_at: null,
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Validate answers if being updated
    if (updateQuizDto.options && updateQuizDto.answer) {
      const invalidAnswers = updateQuizDto.answer.filter(
        (ans) => !updateQuizDto.options!.includes(ans),
      );
      if (invalidAnswers.length > 0) {
        throw new BadRequestException(
          `Invalid answers: ${invalidAnswers.join(', ')}. All answers must be from the options array.`,
        );
      }
    }

    Object.assign(quiz, updateQuizDto);
    await quiz.save();

    this.logger.log(`Quiz updated with ID: ${id} by user: ${user.id}`);

    return quiz;
  }

  async removeQuiz(id: string | Types.ObjectId, user: JWTUserPayload) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const QuizModel = connection.model(Quiz.name, QuizSchema);

    const quiz = await QuizModel.findOne({
      _id: id,
      deleted_at: null,
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    await QuizModel.updateOne({ _id: id }, { deleted_at: new Date() });

    this.logger.log(`Quiz soft deleted with ID: ${id} by user: ${user.id}`);

    return { message: 'Quiz deleted successfully' };
  }

  // ========== HELPER METHODS ==========

  private async getNextQuizSequence(
    quiz_group_id: string | Types.ObjectId,
    user: JWTUserPayload,
  ): Promise<number> {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }
    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const QuizModel = connection.model(Quiz.name, QuizSchema);

    const lastQuiz = await QuizModel.findOne({
      quiz_group_id,
      deleted_at: null,
    })
      .sort({ sequence: -1 })
      .exec();

    return lastQuiz ? lastQuiz.sequence + 1 : 1;
  }
}
