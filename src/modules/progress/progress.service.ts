import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/database/schemas/central/user.schema';
import { School } from 'src/database/schemas/central/school.schema';
import {
  StudentModuleProgress,
  StudentModuleProgressSchema,
} from 'src/database/schemas/tenant/student-module-progress.schema';
import { ProgressStatusEnum } from 'src/common/constants/status.constant';
import {
  StudentChapterProgress,
  StudentChapterProgressSchema,
} from 'src/database/schemas/tenant/student-chapter-progress.schema';
import {
  StudentQuizAttempt,
  StudentQuizAttemptSchema,
} from 'src/database/schemas/tenant/student-quiz-attempt.schema';
import { AttemptStatusEnum } from 'src/common/constants/status.constant';
import {
  Student,
  StudentSchema,
} from 'src/database/schemas/tenant/student.schema';
import {
  Module,
  ModuleSchema,
} from 'src/database/schemas/tenant/module.schema';
import {
  Chapter,
  ChapterSchema,
} from 'src/database/schemas/tenant/chapter.schema';
import {
  QuizGroup,
  QuizGroupSchema,
} from 'src/database/schemas/tenant/quiz-group.schema';
import { Quiz, QuizSchema } from 'src/database/schemas/tenant/quiz.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { QuizTypeEnum } from 'src/common/constants/quiz.constant';
import { StartModuleDto } from './dto/start-module.dto';
import { StartChapterDto } from './dto/start-chapter.dto';
import { StartQuizAttemptDto } from './dto/start-quiz-attempt.dto';
import { SubmitQuizAnswersDto } from './dto/submit-quiz-answers.dto';
import { MarkChapterCompleteDto } from './dto/mark-chapter-complete.dto';
import {
  ProgressFilterDto,
  QuizAttemptFilterDto,
} from './dto/progress-filter.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  getPaginationOptions,
  createPaginationResult,
} from 'src/common/utils/pagination.util';
import { StudentDashboardDto } from './dto/student-dashboard.dto';
import { PythonService } from './python.service';
import {
  QuizQuestion,
  QuizVerificationResponse,
} from 'src/common/types/quiz.type';

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly pythonService: PythonService,
  ) {}

  // ========== MODULE PROGRESS OPERATIONS ==========

  async startModule(startModuleDto: StartModuleDto, user: JWTUserPayload) {
    const { module_id } = startModuleDto;

    this.logger.log(`Student ${user.id} starting module ${module_id}`);

    // Validate user is a student
    if (user.role.name !== RoleEnum.STUDENT) {
      throw new ForbiddenException('Only students can start modules');
    }

    // Get school and tenant connection
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);
    const StudentModuleProgressModel = tenantConnection.model(
      StudentModuleProgress.name,
      StudentModuleProgressSchema,
    );

    try {
      // Validate student exists in tenant database
      const student = await StudentModel.findById(user.id);
      if (!student) {
        throw new NotFoundException('Student not found');
      }

      // Validate module exists
      const module = await ModuleModel.findOne({
        _id: module_id,
        deleted_at: null,
      });
      if (!module) {
        throw new NotFoundException('Module not found');
      }

      // Get total chapters count for this module
      const totalChapters = await ChapterModel.countDocuments({
        module_id: new Types.ObjectId(module_id),
        deleted_at: null,
      });

      // Check if progress already exists
      let progress = await StudentModuleProgressModel.findOne({
        student_id: new Types.ObjectId(user.id),
        module_id: new Types.ObjectId(module_id),
      });

      if (progress) {
        // Update existing progress
        progress.status = ProgressStatusEnum.IN_PROGRESS;
        progress.last_accessed_at = new Date();
        if (!progress.started_at) {
          progress.started_at = new Date();
        }
        progress.total_chapters = totalChapters;
        await progress.save();
      } else {
        // Create new progress record
        progress = new StudentModuleProgressModel({
          student_id: new Types.ObjectId(user.id),
          module_id: new Types.ObjectId(module_id),
          status: ProgressStatusEnum.IN_PROGRESS,
          started_at: new Date(),
          last_accessed_at: new Date(),
          total_chapters: totalChapters,
          progress_percentage: 0,
          chapters_completed: 0,
        });
        await progress.save();
      }

      this.logger.log(
        `Module progress updated for student ${user.id}, module ${module_id}`,
      );

      return {
        message: 'Module started successfully',
        data: {
          progress_id: progress._id,
          module_id: progress.module_id,
          status: progress.status,
          progress_percentage: progress.progress_percentage,
          chapters_completed: progress.chapters_completed,
          total_chapters: progress.total_chapters,
          started_at: progress.started_at,
        },
      };
    } catch (error) {
      this.logger.error('Error starting module', error?.stack || error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to start module');
    }
  }

  // ========== CHAPTER PROGRESS OPERATIONS ==========

  async startChapter(startChapterDto: StartChapterDto, user: JWTUserPayload) {
    const { chapter_id } = startChapterDto;

    this.logger.log(`Student ${user.id} starting chapter ${chapter_id}`);

    // Validate user is a student
    if (user.role.name !== RoleEnum.STUDENT) {
      throw new ForbiddenException('Only students can start chapters');
    }

    // Get school and tenant connection
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);
    const StudentChapterProgressModel = tenantConnection.model(
      StudentChapterProgress.name,
      StudentChapterProgressSchema,
    );

    try {
      // Validate student exists
      const student = await StudentModel.findById(user.id);
      if (!student) {
        throw new NotFoundException('Student not found');
      }

      // Validate chapter exists
      const chapter = await ChapterModel.findOne({
        _id: chapter_id,
        deleted_at: null,
      });
      if (!chapter) {
        throw new NotFoundException('Chapter not found');
      }

      // Check if student can access this chapter (validate sequence)
      await this.validateChapterAccess(user.id, chapter, tenantConnection);

      // Start the module if not already started
      await this.startModule(
        { module_id: new Types.ObjectId(chapter.module_id) },
        user,
      );

      // Check if chapter progress already exists
      let progress = await StudentChapterProgressModel.findOne({
        student_id: new Types.ObjectId(user.id),
        chapter_id: new Types.ObjectId(chapter_id),
      });

      if (progress) {
        // Update existing progress
        progress.status = ProgressStatusEnum.IN_PROGRESS;
        progress.last_accessed_at = new Date();
        if (!progress.started_at) {
          progress.started_at = new Date();
        }
        await progress.save();
      } else {
        // Create new progress record
        progress = new StudentChapterProgressModel({
          student_id: new Types.ObjectId(user.id),
          module_id: new Types.ObjectId(chapter.module_id),
          chapter_id: new Types.ObjectId(chapter_id),
          status: ProgressStatusEnum.IN_PROGRESS,
          started_at: new Date(),
          last_accessed_at: new Date(),
          chapter_sequence: chapter.sequence,
        });
        await progress.save();
      }

      this.logger.log(
        `Chapter progress updated for student ${user.id}, chapter ${chapter_id}`,
      );

      return {
        message: 'Chapter started successfully',
        data: {
          progress_id: progress._id,
          chapter_id: progress.chapter_id,
          module_id: progress.module_id,
          status: progress.status,
          chapter_sequence: progress.chapter_sequence,
          started_at: progress.started_at,
        },
      };
    } catch (error) {
      this.logger.error('Error starting chapter', error?.stack || error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to start chapter');
    }
  }

  // ========== CHAPTER COMPLETION OPERATIONS ==========

  async markChapterComplete(
    markChapterCompleteDto: MarkChapterCompleteDto,
    user: JWTUserPayload,
  ) {
    const { chapter_id } = markChapterCompleteDto;

    this.logger.log(
      `Student ${user.id} marking chapter ${chapter_id} as complete`,
    );

    // Validate user is a student
    if (user.role.name !== RoleEnum.STUDENT) {
      throw new ForbiddenException(
        'Only students can mark chapters as complete',
      );
    }

    // Get school and tenant connection
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);
    const StudentChapterProgressModel = tenantConnection.model(
      StudentChapterProgress.name,
      StudentChapterProgressSchema,
    );
    const QuizGroupModel = tenantConnection.model(
      QuizGroup.name,
      QuizGroupSchema,
    );

    try {
      // Validate student exists
      const student = await StudentModel.findById(user.id);
      if (!student) {
        throw new NotFoundException('Student not found');
      }

      // Validate chapter exists
      const chapter = await ChapterModel.findOne({
        _id: new Types.ObjectId(chapter_id),
        deleted_at: null,
      });
      if (!chapter) {
        throw new NotFoundException('Chapter not found');
      }

      // Check if chapter has any quiz groups
      const hasQuiz = await QuizGroupModel.exists({
        chapter_id: new Types.ObjectId(chapter_id),
        deleted_at: null,
      });

      // Check if chapter progress exists
      let chapterProgress = await StudentChapterProgressModel.findOne({
        student_id: new Types.ObjectId(user.id),
        chapter_id: new Types.ObjectId(chapter_id),
      });

      if (!chapterProgress) {
        // Create new chapter progress if it doesn't exist
        chapterProgress = new StudentChapterProgressModel({
          student_id: new Types.ObjectId(user.id),
          module_id: new Types.ObjectId(chapter.module_id),
          chapter_id: new Types.ObjectId(chapter_id),
          status: ProgressStatusEnum.IN_PROGRESS,
          started_at: new Date(),
          chapter_sequence: chapter.sequence,
          last_accessed_at: new Date(),
        });
      }

      // Mark chapter as complete (manual completion)
      chapterProgress.status = ProgressStatusEnum.COMPLETED;
      chapterProgress.completed_at = new Date();
      chapterProgress.last_accessed_at = new Date();

      // Auto-complete quiz if chapter has no quiz groups
      // This ensures chapters without quizzes are considered fully completed
      if (!hasQuiz) {
        chapterProgress.chapter_quiz_completed = true;
        chapterProgress.quiz_completed_at = new Date();
        chapterProgress.quiz_auto_completed = true;
      }

      await chapterProgress.save();

      // Recalculate module progress to prevent progress from getting stuck
      // This is especially important when quiz is auto-completed
      await this.recalculateModuleProgress(
        new Types.ObjectId(user.id),
        new Types.ObjectId(chapter.module_id),
        tenantConnection,
      );

      this.logger.log(
        `Chapter ${chapter_id} marked as complete for student ${user.id}`,
      );

      return {
        message: 'Chapter marked as complete successfully',
        data: {
          chapter_id: chapterProgress.chapter_id,
          module_id: chapterProgress.module_id,
          status: chapterProgress.status,
          completed_at: chapterProgress.completed_at,
          chapter_quiz_completed: chapterProgress.chapter_quiz_completed,
        },
      };
    } catch (error) {
      this.logger.error('Error marking chapter as complete:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to mark chapter as complete');
    }
  }

  // ========== QUIZ ATTEMPT OPERATIONS ==========

  async startQuizAttempt(
    startQuizAttemptDto: StartQuizAttemptDto,
    user: JWTUserPayload,
  ) {
    const { quiz_group_id } = startQuizAttemptDto;

    this.logger.log(
      `Student ${user.id} starting quiz attempt for quiz group ${quiz_group_id}`,
    );

    // Validate user is a student
    if (user.role.name !== RoleEnum.STUDENT) {
      throw new ForbiddenException('Only students can start quiz attempts');
    }

    // Get school and tenant connection
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);
    const QuizGroupModel = tenantConnection.model(
      QuizGroup.name,
      QuizGroupSchema,
    );
    const QuizModel = tenantConnection.model(Quiz.name, QuizSchema);
    const StudentQuizAttemptModel = tenantConnection.model(
      StudentQuizAttempt.name,
      StudentQuizAttemptSchema,
    );

    try {
      // Validate student exists
      const student = await StudentModel.findById(user.id);
      if (!student) {
        throw new NotFoundException('Student not found');
      }

      // Validate quiz group exists
      const quizGroup = await QuizGroupModel.findOne({
        _id: quiz_group_id,
        deleted_at: null,
      });
      if (!quizGroup) {
        throw new NotFoundException('Quiz group not found');
      }

      // Validate access to this quiz (chapter-based validation)
      if (quizGroup.chapter_id) {
        await this.validateQuizAccess(user.id, quizGroup, tenantConnection);
      }

      // Check for existing in-progress attempt
      const existingAttempt = await StudentQuizAttemptModel.findOne({
        student_id: new Types.ObjectId(user.id),
        quiz_group_id: new Types.ObjectId(quiz_group_id),
        status: AttemptStatusEnum.IN_PROGRESS,
      });

      if (existingAttempt) {
        return {
          message: 'Quiz attempt already in progress',
          data: {
            attempt_id: existingAttempt._id,
            quiz_group_id: existingAttempt.quiz_group_id,
            status: existingAttempt.status,
            started_at: existingAttempt.started_at,
            attempt_number: existingAttempt.attempt_number,
          },
        };
      }

      // Get total questions count
      const totalQuestions = await QuizModel.countDocuments({
        quiz_group_id: new Types.ObjectId(quiz_group_id),
        deleted_at: null,
      });

      // Get next attempt number
      const lastAttempt = await StudentQuizAttemptModel.findOne({
        student_id: new Types.ObjectId(user.id),
        quiz_group_id: new Types.ObjectId(quiz_group_id),
      }).sort({ attempt_number: -1 });

      const nextAttemptNumber = lastAttempt
        ? lastAttempt.attempt_number + 1
        : 1;

      // Create new quiz attempt
      const newAttempt = new StudentQuizAttemptModel({
        student_id: new Types.ObjectId(user.id),
        quiz_group_id: new Types.ObjectId(quiz_group_id),
        module_id: quizGroup.module_id,
        chapter_id: quizGroup.chapter_id,
        status: AttemptStatusEnum.IN_PROGRESS,
        started_at: new Date(),
        total_questions: totalQuestions,
        attempt_number: nextAttemptNumber,
      });

      await newAttempt.save();

      this.logger.log(
        `Quiz attempt created for student ${user.id}, quiz group ${quiz_group_id}`,
      );

      return {
        message: 'Quiz attempt started successfully',
        data: {
          attempt_id: newAttempt._id,
          quiz_group_id: newAttempt.quiz_group_id,
          status: newAttempt.status,
          started_at: newAttempt.started_at,
          total_questions: newAttempt.total_questions,
          attempt_number: newAttempt.attempt_number,
        },
      };
    } catch (error) {
      this.logger.error('Error starting quiz attempt', error?.stack || error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to start quiz attempt');
    }
  }

  async submitQuizAnswers(
    submitQuizAnswersDto: SubmitQuizAnswersDto,
    user: JWTUserPayload,
  ) {
    const { quiz_group_id, answers, total_time_taken_seconds } =
      submitQuizAnswersDto;

    this.logger.log(
      `Student ${user.id} submitting quiz answers for quiz group ${quiz_group_id}`,
    );

    // Validate user is a student
    if (user.role.name !== RoleEnum.STUDENT) {
      throw new ForbiddenException('Only students can submit quiz answers');
    }

    // Get school and tenant connection
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const QuizModel = tenantConnection.model(Quiz.name, QuizSchema);
    const QuizGroupModel = tenantConnection.model(
      QuizGroup.name,
      QuizGroupSchema,
    );
    const StudentQuizAttemptModel = tenantConnection.model(
      StudentQuizAttempt.name,
      StudentQuizAttemptSchema,
    );
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);

    // Find the in-progress attempt
    const attempt = await StudentQuizAttemptModel.findOne({
      student_id: new Types.ObjectId(user.id),
      quiz_group_id: new Types.ObjectId(quiz_group_id),
      status: AttemptStatusEnum.IN_PROGRESS,
    });

    if (!attempt) {
      throw new NotFoundException('No in-progress quiz attempt found');
    }

    // Get quiz group details
    const quizGroup = await QuizGroupModel.findById(
      new Types.ObjectId(quiz_group_id),
    );
    if (!quizGroup) {
      throw new NotFoundException('Quiz group not found');
    }

    // Get module details for AI verification
    const module = await ModuleModel.findById(quizGroup.module_id);
    if (!module) {
      throw new NotFoundException('Module not found');
    }

    // Get all quizzes for this group with correct answers
    const quizzes = await QuizModel.find({
      quiz_group_id: new Types.ObjectId(quiz_group_id),
      deleted_at: null,
    }).lean();

    // Prepare questions for AI verification
    const questionsForAI: QuizQuestion[] = [];
    answers.map((answer) => {
      const quiz = quizzes.find(
        (q) => q._id.toString() === answer.quiz_id.toString(),
      );

      if (quiz) {
        questionsForAI.push({
          question: quiz?.question || '',
          question_type: quiz?.type,
          options: quiz?.options || [],
          user_answer:
            answer.selected_answers && answer.selected_answers.length > 0
              ? answer.selected_answers.join(', ')
              : '',
        });
      }
    });

    // Verify quiz questions using Python AI service
    let aiVerificationResult: QuizVerificationResponse | null = null;
    try {
      aiVerificationResult = await this.pythonService.quizVerificationByAI(
        module.title,
        module.description,
        questionsForAI,
      );
      this.logger.log('AI verification completed successfully');
    } catch (error) {
      this.logger.error('AI verification failed:', error.message);
      // Continue with manual verification if AI fails
      aiVerificationResult = null;
    }

    // TODO: Remove this after testing
    const isPassed =
      (aiVerificationResult?.score_percentage || 0) >=
      attempt.passing_threshold;
    // const isPassed = true;

    // Update attempt
    attempt.status = AttemptStatusEnum.COMPLETED;
    attempt.completed_at = new Date();
    attempt.score_percentage = aiVerificationResult?.score_percentage || 0;
    attempt.correct_answers = aiVerificationResult?.correct_answers || 0;
    attempt.total_questions = quizzes.length;
    attempt.time_taken_seconds = total_time_taken_seconds || 0;
    attempt.is_passed = isPassed;
    attempt.answers = answers?.map((answer) => ({
      quiz_id: new Types.ObjectId(answer.quiz_id),
      selected_answers: answer.selected_answers,
      time_spent_seconds: answer?.time_spent_seconds || 0,
    }));

    // Store AI verification result if available
    if (aiVerificationResult) {
      attempt.ai_verification_result = aiVerificationResult;
    }

    await attempt.save();

    // Update chapter/module progress if quiz is passed
    if (isPassed) {
      await this.updateProgressOnQuizCompletion(attempt, tenantConnection);
    }

    this.logger.log(
      `Quiz attempt completed for student ${user.id}, score: ${aiVerificationResult?.score_percentage || 0}%`,
    );

    return {
      message: 'Quiz answers submitted successfully',
      data: {
        attempt_id: attempt._id,
        score_percentage: attempt.score_percentage,
        correct_answers: attempt.correct_answers,
        total_questions: attempt.total_questions,
        is_passed: attempt.is_passed,
        time_taken_seconds: attempt.time_taken_seconds,
        status: attempt.status,
        completed_at: attempt.completed_at,
        ai_verification: aiVerificationResult ? 'completed' : 'failed',
        ai_verification_report: aiVerificationResult,
      },
    };
  }

  // ========== VALIDATION METHODS ==========

  async validateChapterAccess(
    studentId: string | Types.ObjectId,
    chapter: any,
    tenantConnection: any,
  ) {
    // If this is the first chapter (sequence 1), allow access
    if (chapter.sequence === 1) {
      return true;
    }

    const StudentChapterProgressModel = tenantConnection.model(
      StudentChapterProgress.name,
      StudentChapterProgressSchema,
    );

    // Find the previous chapter
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);
    const previousChapter = await ChapterModel.findOne({
      module_id: chapter.module_id,
      sequence: chapter.sequence - 1,
      deleted_at: null,
    });

    if (!previousChapter) {
      throw new BadRequestException('Previous chapter not found');
    }

    // Check if previous chapter quiz is completed
    const previousChapterProgress = await StudentChapterProgressModel.findOne({
      student_id: new Types.ObjectId(studentId),
      chapter_id: previousChapter._id,
      chapter_quiz_completed: true,
    });

    if (!previousChapterProgress) {
      throw new ForbiddenException(
        `The chapter is locked. Please complete the quiz for "${previousChapter.title}" to continue.`,
      );
    }

    return true;
  }

  async validateQuizAccess(
    studentId: string | Types.ObjectId,
    quizGroup: any,
    tenantConnection: any,
  ) {
    // If this is a module-level quiz, check if all chapters are completed
    if (quizGroup.type === QuizTypeEnum.MODULE) {
      const StudentChapterProgressModel = tenantConnection.model(
        StudentChapterProgress.name,
        StudentChapterProgressSchema,
      );
      const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);

      // Get total chapters for this module
      const totalChapters = await ChapterModel.countDocuments({
        module_id: quizGroup.module_id,
        deleted_at: null,
      });

      // Get completed chapters count (both manually completed and quiz completed)
      const completedChapters =
        await StudentChapterProgressModel.countDocuments({
          student_id: new Types.ObjectId(studentId),
          module_id: quizGroup.module_id,
          status: ProgressStatusEnum.COMPLETED,
          chapter_quiz_completed: true,
        });

      if (completedChapters < totalChapters) {
        throw new ForbiddenException(
          'You must complete all chapters and their quizzes before taking the module quiz',
        );
      }
    }

    // If this is a chapter-level quiz, check if chapter is manually completed
    if (quizGroup.type === QuizTypeEnum.CHAPTER && quizGroup.chapter_id) {
      const StudentChapterProgressModel = tenantConnection.model(
        StudentChapterProgress.name,
        StudentChapterProgressSchema,
      );

      // Check if chapter is manually completed
      const chapterProgress = await StudentChapterProgressModel.findOne({
        student_id: new Types.ObjectId(studentId),
        chapter_id: quizGroup.chapter_id,
        status: ProgressStatusEnum.COMPLETED,
      });

      if (!chapterProgress) {
        const ChapterModel = tenantConnection.model(
          Chapter.name,
          ChapterSchema,
        );
        const chapter = await ChapterModel.findById(quizGroup.chapter_id);
        const chapterTitle = chapter?.title || 'this chapter';

        throw new ForbiddenException(
          `You must mark "${chapterTitle}" as complete before taking the quiz`,
        );
      }
    }

    return true;
  }

  // ========== PROGRESS UPDATE METHODS ==========

  private async updateProgressOnQuizCompletion(
    attempt: any,
    tenantConnection: any,
  ) {
    const QuizGroupModel = tenantConnection.model(
      QuizGroup.name,
      QuizGroupSchema,
    );
    const quizGroup = await QuizGroupModel.findById(attempt.quiz_group_id);

    if (!quizGroup) return;

    if (quizGroup.type === QuizTypeEnum.CHAPTER && attempt.chapter_id) {
      await this.updateChapterProgressOnQuizCompletion(
        attempt,
        tenantConnection,
      );
    } else if (quizGroup.type === QuizTypeEnum.MODULE && attempt.module_id) {
      await this.updateModuleProgressOnQuizCompletion(
        attempt,
        tenantConnection,
      );
    }
  }

  private async updateChapterProgressOnQuizCompletion(
    attempt: any,
    tenantConnection: any,
  ) {
    const StudentChapterProgressModel = tenantConnection.model(
      StudentChapterProgress.name,
      StudentChapterProgressSchema,
    );

    // Update chapter progress - only mark quiz as completed, don't change status
    await StudentChapterProgressModel.findOneAndUpdate(
      {
        student_id: attempt.student_id,
        chapter_id: attempt.chapter_id,
      },
      {
        chapter_quiz_completed: true,
        quiz_completed_at: attempt.completed_at,
        last_accessed_at: new Date(),
      },
      { upsert: true },
    );

    // Update module progress
    await this.recalculateModuleProgress(
      attempt.student_id,
      attempt.module_id,
      tenantConnection,
    );
  }

  private async updateModuleProgressOnQuizCompletion(
    attempt: any,
    tenantConnection: any,
  ) {
    const StudentModuleProgressModel = tenantConnection.model(
      StudentModuleProgress.name,
      StudentModuleProgressSchema,
    );

    // Update module progress
    await StudentModuleProgressModel.findOneAndUpdate(
      {
        student_id: attempt.student_id,
        module_id: attempt.module_id,
      },
      {
        module_quiz_completed: true,
        last_accessed_at: new Date(),
      },
    );

    // Recalculate overall module progress
    await this.recalculateModuleProgress(
      attempt.student_id,
      attempt.module_id,
      tenantConnection,
    );
  }

  private async recalculateModuleProgress(
    studentId: Types.ObjectId,
    moduleId: Types.ObjectId,
    tenantConnection: any,
  ) {
    const StudentModuleProgressModel = tenantConnection.model(
      StudentModuleProgress.name,
      StudentModuleProgressSchema,
    );
    const StudentChapterProgressModel = tenantConnection.model(
      StudentChapterProgress.name,
      StudentChapterProgressSchema,
    );
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);

    // Get total chapters for this module
    const totalChapters = await ChapterModel.countDocuments({
      module_id: moduleId,
      deleted_at: null,
    });

    // Get completed chapters count
    const completedChapters = await StudentChapterProgressModel.countDocuments({
      student_id: studentId,
      module_id: moduleId,
      chapter_quiz_completed: true,
    });

    // Get module progress
    const moduleProgress = await StudentModuleProgressModel.findOne({
      student_id: studentId,
      module_id: moduleId,
    });

    if (!moduleProgress) return;

    // Calculate progress percentage
    let progressPercentage = 0;
    if (totalChapters > 0) {
      progressPercentage = Math.round((completedChapters / totalChapters) * 90); // 90% for chapters
      if (moduleProgress.module_quiz_completed) {
        progressPercentage += 10; // 10% for module quiz
      }
    }

    // Determine status
    let status = ProgressStatusEnum.IN_PROGRESS;
    if (progressPercentage >= 100) {
      status = ProgressStatusEnum.COMPLETED;
    }

    // Update module progress
    await StudentModuleProgressModel.findByIdAndUpdate(moduleProgress._id, {
      chapters_completed: completedChapters,
      progress_percentage: Math.min(progressPercentage, 100),
      status: status,
      completed_at: status === ProgressStatusEnum.COMPLETED ? new Date() : null,
      last_accessed_at: new Date(),
    });
  }

  // ========== UTILITY METHODS ==========

  private areAnswersEqual(selected: string[], correct: string[]): boolean {
    if (selected.length !== correct.length) {
      return false;
    }

    const sortedSelected = [...selected].sort();
    const sortedCorrect = [...correct].sort();

    return sortedSelected.every(
      (answer, index) => answer === sortedCorrect[index],
    );
  }

  // ========== PROGRESS RETRIEVAL METHODS ==========

  async getStudentModuleProgress(
    user: JWTUserPayload,
    paginationDto?: PaginationDto,
    filterDto?: ProgressFilterDto,
  ) {
    this.logger.log(`Getting module progress for student ${user.id}`);

    // Validate user is a student
    if (user.role.name !== RoleEnum.STUDENT) {
      throw new ForbiddenException('Only students can view their own progress');
    }

    // Get school and tenant connection
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModuleProgressModel = tenantConnection.model(
      StudentModuleProgress.name,
      StudentModuleProgressSchema,
    );
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);

    try {
      // Build query
      const query: any = { student_id: new Types.ObjectId(user.id) };

      if (filterDto?.module_id) {
        query.module_id = new Types.ObjectId(filterDto.module_id);
      }

      if (filterDto?.status) {
        query.status = filterDto.status;
      }

      if (filterDto?.from_date || filterDto?.to_date) {
        query.last_accessed_at = {};
        if (filterDto.from_date) {
          query.last_accessed_at.$gte = new Date(filterDto.from_date);
        }
        if (filterDto.to_date) {
          query.last_accessed_at.$lte = new Date(filterDto.to_date);
        }
      }

      // Get pagination options
      const paginationOptions = getPaginationOptions(paginationDto || {});

      // Get total count
      const total = await StudentModuleProgressModel.countDocuments(query);

      // Get paginated results
      const progress = await StudentModuleProgressModel.find(query)
        .populate('module_id', 'title subject description duration difficulty')
        .sort({ last_accessed_at: -1 })
        .skip(paginationOptions.skip)
        .limit(paginationOptions.limit)
        .lean();

      // Create pagination result
      const result = createPaginationResult(progress, total, paginationOptions);

      return {
        message: 'Module progress retrieved successfully',
        data: result.data,
        pagination_data: result.pagination_data,
      };
    } catch (error) {
      this.logger.error('Error getting module progress', error?.stack || error);
      throw new BadRequestException('Failed to retrieve module progress');
    }
  }

  async getStudentChapterProgress(
    user: JWTUserPayload,
    paginationDto?: PaginationDto,
    filterDto?: ProgressFilterDto,
  ) {
    this.logger.log(`Getting chapter progress for student ${user.id}`);

    // Validate user is a student
    if (user.role.name !== RoleEnum.STUDENT) {
      throw new ForbiddenException('Only students can view their own progress');
    }

    // Get school and tenant connection
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentChapterProgressModel = tenantConnection.model(
      StudentChapterProgress.name,
      StudentChapterProgressSchema,
    );
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);
    try {
      // Build query
      const query: any = { student_id: new Types.ObjectId(user.id) };

      if (filterDto?.module_id) {
        query.module_id = new Types.ObjectId(filterDto.module_id);
      }

      if (filterDto?.chapter_id) {
        query.chapter_id = new Types.ObjectId(filterDto.chapter_id);
      }

      if (filterDto?.status) {
        query.status = filterDto.status;
      }

      if (filterDto?.from_date || filterDto?.to_date) {
        query.last_accessed_at = {};
        if (filterDto.from_date) {
          query.last_accessed_at.$gte = new Date(filterDto.from_date);
        }
        if (filterDto.to_date) {
          query.last_accessed_at.$lte = new Date(filterDto.to_date);
        }
      }

      // Get pagination options
      const paginationOptions = getPaginationOptions(paginationDto || {});

      // Get total count
      const total = await StudentChapterProgressModel.countDocuments(query);

      // Get paginated results
      const progress = await StudentChapterProgressModel.find(query)
        .populate('module_id', 'title subject')
        .populate('chapter_id', 'title subject sequence')
        .sort({ chapter_sequence: 1 })
        .skip(paginationOptions.skip)
        .limit(paginationOptions.limit)
        .lean();

      // Create pagination result
      const result = createPaginationResult(progress, total, paginationOptions);

      return {
        message: 'Chapter progress retrieved successfully',
        data: result.data,
        pagination_data: result.pagination_data,
      };
    } catch (error) {
      this.logger.error(
        'Error getting chapter progress',
        error?.stack || error,
      );
      throw new BadRequestException('Failed to retrieve chapter progress');
    }
  }

  async getStudentQuizAttempts(
    user: JWTUserPayload,
    paginationDto?: PaginationDto,
    filterDto?: QuizAttemptFilterDto,
  ) {
    this.logger.log(`Getting quiz attempts for student ${user.id}`);

    // Validate user is a student
    if (user.role.name !== RoleEnum.STUDENT) {
      throw new ForbiddenException(
        'Only students can view their own quiz attempts',
      );
    }

    // Get school and tenant connection
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentQuizAttemptModel = tenantConnection.model(
      StudentQuizAttempt.name,
      StudentQuizAttemptSchema,
    );

    try {
      // Build query
      const query: any = { student_id: new Types.ObjectId(user.id) };

      if (filterDto?.quiz_group_id) {
        query.quiz_group_id = new Types.ObjectId(filterDto.quiz_group_id);
      }

      if (filterDto?.module_id) {
        query.module_id = new Types.ObjectId(filterDto.module_id);
      }

      if (filterDto?.chapter_id) {
        query.chapter_id = new Types.ObjectId(filterDto.chapter_id);
      }

      if (filterDto?.status) {
        query.status = filterDto.status;
      }

      if (filterDto?.from_date || filterDto?.to_date) {
        query.started_at = {};
        if (filterDto.from_date) {
          query.started_at.$gte = new Date(filterDto.from_date);
        }
        if (filterDto.to_date) {
          query.started_at.$lte = new Date(filterDto.to_date);
        }
      }

      // Get pagination options
      const paginationOptions = getPaginationOptions(paginationDto || {});

      // Get total count
      const total = await StudentQuizAttemptModel.countDocuments(query);

      // Get paginated results
      const attempts = await StudentQuizAttemptModel.find(query)
        .populate('quiz_group_id', 'subject description type category')
        .populate('module_id', 'title subject')
        .populate('chapter_id', 'title subject sequence')
        .sort({ started_at: -1 })
        .skip(paginationOptions.skip)
        .limit(paginationOptions.limit)
        .lean();

      // Create pagination result
      const result = createPaginationResult(attempts, total, paginationOptions);

      return {
        message: 'Quiz attempts retrieved successfully',
        data: result.data,
        pagination_data: result.pagination_data,
      };
    } catch (error) {
      this.logger.error('Error getting quiz attempts', error?.stack || error);
      throw new BadRequestException('Failed to retrieve quiz attempts');
    }
  }

  // ========== DASHBOARD METHODS ==========

  async getStudentDashboard(
    user: JWTUserPayload,
    queryDto?: StudentDashboardDto,
  ) {
    this.logger.log(
      `Getting dashboard data for user ${user.id} with role ${user.role.name}`,
    );

    let studentId: string;
    let schoolId: string;
    let school: any;

    // Determine student ID and school ID based on user role
    if (user.role.name === RoleEnum.STUDENT) {
      // For students, use their own ID and school
      studentId = user.id.toString();
      if (!user.school_id) {
        throw new BadRequestException('Student must have a school_id');
      }
      schoolId = user.school_id.toString();
    } else if (user.role.name === RoleEnum.SUPER_ADMIN) {
      // For super admin, both student_id and school_id are required in params
      if (!queryDto?.student_id || !queryDto?.school_id) {
        throw new BadRequestException(
          'Both student_id and school_id are required for super admin access',
        );
      }
      studentId = queryDto.student_id;
      schoolId = queryDto.school_id;
    } else if (
      user.role.name === RoleEnum.SCHOOL_ADMIN ||
      user.role.name === RoleEnum.PROFESSOR
    ) {
      // For school admin/professor, student_id is required in params
      if (!queryDto?.student_id) {
        throw new BadRequestException(
          'student_id is required for admin/professor access',
        );
      }
      studentId = queryDto.student_id;
      if (!user.school_id) {
        throw new BadRequestException('Admin/Professor must have a school_id');
      }
      schoolId = user.school_id.toString(); // Use their school_id
    } else {
      throw new ForbiddenException('Access denied - insufficient permissions');
    }

    // Validate school exists
    school = await this.schoolModel.findById(new Types.ObjectId(schoolId));
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // For school admin/professor, validate that the student belongs to their school
    if (
      user.role.name === RoleEnum.SCHOOL_ADMIN ||
      user.role.name === RoleEnum.PROFESSOR
    ) {
      const tenantConnection =
        await this.tenantConnectionService.getTenantConnection(school.db_name);
      const StudentModel = tenantConnection.model(Student.name, StudentSchema);
      console.log(studentId);
      const student = await StudentModel.findById(
        new Types.ObjectId(studentId),
      );
      if (!student) {
        throw new NotFoundException('Student not found');
      }

      // Validate student belongs to the same school as the admin/professor
      if (student.school_id.toString() !== user.school_id?.toString()) {
        throw new ForbiddenException(
          'Access denied - student does not belong to your school',
        );
      }
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModuleProgressModel = tenantConnection.model(
      StudentModuleProgress.name,
      StudentModuleProgressSchema,
    );
    const StudentChapterProgressModel = tenantConnection.model(
      StudentChapterProgress.name,
      StudentChapterProgressSchema,
    );
    const StudentQuizAttemptModel = tenantConnection.model(
      StudentQuizAttempt.name,
      StudentQuizAttemptSchema,
    );

    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);

    try {
      const studentObjectId = new Types.ObjectId(studentId);

      // Get overall statistics
      const [
        totalModules,
        inProgressModules,
        completedModules,
        totalQuizAttempts,
        passedQuizzes,
        recentActivity,
      ] = await Promise.all([
        StudentModuleProgressModel.countDocuments({
          student_id: studentObjectId,
        }),
        StudentModuleProgressModel.countDocuments({
          student_id: studentObjectId,
          status: ProgressStatusEnum.IN_PROGRESS,
        }),
        StudentModuleProgressModel.countDocuments({
          student_id: studentObjectId,
          status: ProgressStatusEnum.COMPLETED,
        }),
        StudentQuizAttemptModel.countDocuments({
          student_id: studentObjectId,
          status: AttemptStatusEnum.COMPLETED,
        }),
        StudentQuizAttemptModel.countDocuments({
          student_id: studentObjectId,
          status: AttemptStatusEnum.COMPLETED,
          is_passed: true,
        }),
        StudentModuleProgressModel.find({ student_id: studentObjectId })
          .populate('module_id', 'title subject')
          .sort({ last_accessed_at: -1 })
          .limit(5)
          .lean(),
      ]);

      // Calculate average progress
      const moduleProgresses = await StudentModuleProgressModel.find({
        student_id: studentObjectId,
      }).lean();
      const averageProgress =
        moduleProgresses.length > 0
          ? moduleProgresses.reduce(
              (sum, progress) => sum + progress.progress_percentage,
              0,
            ) / moduleProgresses.length
          : 0;

      return {
        message: 'Dashboard data retrieved successfully',
        data: {
          overview: {
            total_modules: totalModules,
            in_progress_modules: inProgressModules,
            completed_modules: completedModules,
            total_quiz_attempts: totalQuizAttempts,
            passed_quizzes: passedQuizzes,
            average_progress: Math.round(averageProgress),
          },
          recent_activity: recentActivity,
        },
      };
    } catch (error) {
      this.logger.error(
        'Error getting student dashboard',
        error?.stack || error,
      );
      throw new BadRequestException('Failed to retrieve dashboard data');
    }
  }

  async getSchoolAdminDashboard(user: JWTUserPayload, moduleId?: string) {
    this.logger.log(
      `Getting admin dashboard data for school ${user.school_id}`,
    );

    // Validate user is school admin or professor
    if (![RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR].includes(user.role.name)) {
      throw new ForbiddenException(
        'Only school admins and professors can view school dashboard',
      );
    }

    // Get school and tenant connection
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);
    const StudentModuleProgressModel = tenantConnection.model(
      StudentModuleProgress.name,
      StudentModuleProgressSchema,
    );
    const StudentQuizAttemptModel = tenantConnection.model(
      StudentQuizAttempt.name,
      StudentQuizAttemptSchema,
    );

    try {
      // Build query for specific module if provided
      const progressQuery: any = {};
      if (moduleId) {
        progressQuery.module_id = new Types.ObjectId(moduleId);
      }

      // Get overall statistics
      const [
        totalStudents,
        activeStudents,
        moduleProgresses,
        recentQuizAttempts,
      ] = await Promise.all([
        StudentModel.countDocuments({ deleted_at: null }),
        StudentModuleProgressModel.distinct('student_id', progressQuery),
        StudentModuleProgressModel.find(progressQuery)
          .populate('student_id', 'first_name last_name email')
          .populate('module_id', 'title subject')
          .sort({ last_accessed_at: -1 })
          .lean(),
        StudentQuizAttemptModel.find(
          moduleId ? { module_id: new Types.ObjectId(moduleId) } : {},
        )
          .populate('student_id', 'first_name last_name email')
          .populate('quiz_group_id', 'subject type')
          .sort({ started_at: -1 })
          .limit(10)
          .lean(),
      ]);

      // Calculate progress statistics
      const progressStats = {
        not_started: 0,
        in_progress: 0,
        completed: 0,
        average_progress: 0,
      };

      if (moduleProgresses.length > 0) {
        progressStats.not_started = moduleProgresses.filter(
          (p) => p.status === ProgressStatusEnum.NOT_STARTED,
        ).length;
        progressStats.in_progress = moduleProgresses.filter(
          (p) => p.status === ProgressStatusEnum.IN_PROGRESS,
        ).length;
        progressStats.completed = moduleProgresses.filter(
          (p) => p.status === ProgressStatusEnum.COMPLETED,
        ).length;
        progressStats.average_progress = Math.round(
          moduleProgresses.reduce(
            (sum, progress) => sum + progress.progress_percentage,
            0,
          ) / moduleProgresses.length,
        );
      }

      return {
        message: 'Admin dashboard data retrieved successfully',
        data: {
          overview: {
            total_students: totalStudents,
            active_students: activeStudents.length,
            ...progressStats,
          },
          student_progress: moduleProgresses.slice(0, 20), // Limit to 20 for performance
          recent_quiz_attempts: recentQuizAttempts,
        },
      };
    } catch (error) {
      this.logger.error('Error getting admin dashboard', error?.stack || error);
      throw new BadRequestException('Failed to retrieve admin dashboard data');
    }
  }
}
