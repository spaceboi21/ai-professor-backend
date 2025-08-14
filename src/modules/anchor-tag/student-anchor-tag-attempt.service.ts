import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { School } from 'src/database/schemas/central/school.schema';
import { User } from 'src/database/schemas/central/user.schema';
import {
  Student,
  StudentSchema,
} from 'src/database/schemas/tenant/student.schema';
import {
  Module,
  ModuleSchema,
} from 'src/database/schemas/tenant/module.schema';
import {
  AnchorTag,
  AnchorTagSchema,
} from 'src/database/schemas/tenant/anchor-tag.schema';
import {
  StudentAnchorTagAttempt,
  StudentAnchorTagAttemptSchema,
} from 'src/database/schemas/tenant/student-anchor-tag-attempt.schema';
import { Quiz, QuizSchema } from 'src/database/schemas/tenant/quiz.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { DEFAULT_LANGUAGE } from 'src/common/constants/language.constant';
import {
  AnchorTagAttemptStatusEnum,
  AnchorTagTypeEnum,
} from 'src/common/constants/anchor-tag.constant';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { PythonService } from './python.service';
import {
  QuizQuestion,
  QuizVerificationResponse,
} from 'src/common/types/quiz.type';
import { QuizQuestionTypeEnum } from 'src/common/constants/quiz.constant';

@Injectable()
export class StudentAnchorTagAttemptService {
  private readonly logger = new Logger(StudentAnchorTagAttemptService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly errorMessageService: ErrorMessageService,
    private readonly pythonService: PythonService,
  ) {}

  async startAnchorTagAttempt(
    anchorTagId: string | Types.ObjectId,
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
    const StudentModel = connection.model(Student.name, StudentSchema);
    const StudentAnchorTagAttemptModel = connection.model(
      StudentAnchorTagAttempt.name,
      StudentAnchorTagAttemptSchema,
    );

    // Validate anchor tag exists and is active
    const anchorTag = await AnchorTagModel.findOne({
      _id: new Types.ObjectId(anchorTagId),
      deleted_at: null,
      status: 'ACTIVE',
    });

    if (!anchorTag) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'ANCHOR_TAG_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Validate student exists
    const student = await StudentModel.findOne({
      _id: new Types.ObjectId(user.id),
      deleted_at: null,
    });

    if (!student) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'STUDENT_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Check if there's already an in-progress attempt
    const existingAttempt = await StudentAnchorTagAttemptModel.findOne({
      student_id: student._id,
      anchor_tag_id: new Types.ObjectId(anchorTagId),
      status: AnchorTagAttemptStatusEnum.IN_PROGRESS,
      deleted_at: null,
    });

    if (existingAttempt) {
      return existingAttempt;
    }

    // Get next attempt number
    const lastAttempt = await StudentAnchorTagAttemptModel.findOne({
      student_id: student._id,
      anchor_tag_id: new Types.ObjectId(anchorTagId),
      deleted_at: null,
    })
      .sort({ attempt_number: -1 })
      .select('attempt_number')
      .lean();

    const attemptNumber = lastAttempt ? lastAttempt.attempt_number + 1 : 1;

    // Create new attempt
    const attempt = new StudentAnchorTagAttemptModel({
      student_id: student._id,
      module_id: anchorTag.module_id,
      chapter_id: anchorTag.chapter_id,
      bibliography_id: anchorTag.bibliography_id,
      anchor_tag_id: new Types.ObjectId(anchorTagId),
      status: AnchorTagAttemptStatusEnum.IN_PROGRESS,
      started_at: new Date(),
      attempt_number: attemptNumber,
    });

    const savedAttempt = await attempt.save();

    return savedAttempt;
  }

  async submitAnchorTagAnswer(
    anchorTagId: string | Types.ObjectId,
    answerData: {
      quiz_id?: string | Types.ObjectId;
      selected_answers?: string[];
      text_response?: string;
    },
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
    const StudentModel = connection.model(Student.name, StudentSchema);
    const StudentAnchorTagAttemptModel = connection.model(
      StudentAnchorTagAttempt.name,
      StudentAnchorTagAttemptSchema,
    );
    const QuizModel = connection.model(Quiz.name, QuizSchema);
    const ModuleModel = connection.model(Module.name, ModuleSchema);

    // Validate anchor tag exists
    const anchorTag = await AnchorTagModel.findOne({
      _id: new Types.ObjectId(anchorTagId),
      deleted_at: null,
      status: 'ACTIVE',
    });

    if (!anchorTag) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'ANCHOR_TAG_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Validate student exists
    const student = await StudentModel.findOne({
      _id: new Types.ObjectId(user.id),
      deleted_at: null,
    });

    if (!student) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'STUDENT_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Find in-progress attempt
    const attempt = await StudentAnchorTagAttemptModel.findOne({
      student_id: student._id,
      anchor_tag_id: new Types.ObjectId(anchorTagId),
      status: AnchorTagAttemptStatusEnum.IN_PROGRESS,
      deleted_at: null,
    });

    if (!attempt) {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'NO_IN_PROGRESS_ATTEMPT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get module information for Python service
    const module = await ModuleModel.findById(anchorTag.module_id);
    if (!module) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'MODULE',
          'MODULE_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const { quiz_id, selected_answers, text_response } = answerData;

    let isCorrect = false;
    let scorePercentage = 0;
    let quizAttempt: any = null;
    let aiVerificationResult: QuizVerificationResponse | null = null;

    // Handle quiz-based answer
    if (quiz_id && selected_answers) {
      const quiz = await QuizModel.findById(new Types.ObjectId(quiz_id));
      if (!quiz) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'QUIZ',
            'QUIZ_NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Prepare question data for Python service
      const questions: QuizQuestion[] = [
        {
          question: quiz.question,
          question_type: quiz.type as QuizQuestionTypeEnum,
          options: quiz.options || [],
          user_answer: selected_answers.join(', '),
        },
      ];

      // Call Python service for AI verification
      try {
        aiVerificationResult = await this.pythonService.validateAnchorTagQuiz(
          module.title,
          module.description || '',
          questions,
        );

        this.logger.log(
          'AI verification completed successfully for anchor tag',
        );

        // Use AI verification results
        isCorrect =
          aiVerificationResult.questions_results?.[0]?.is_correct || false;
        scorePercentage = aiVerificationResult.score_percentage || 0;
      } catch (error) {
        this.logger.error(
          'AI verification failed for anchor tag:',
          error.message,
        );

        // Fallback to manual verification if AI fails
        const correctAnswers = quiz.answer || [];
        const isMultiSelect = quiz.type === 'MULTI_SELECT';

        if (isMultiSelect) {
          // For multi-select, all correct answers must be selected and no incorrect ones
          const correctSelected = selected_answers.filter((answer) =>
            correctAnswers.includes(answer),
          ).length;
          const incorrectSelected = selected_answers.filter(
            (answer) => !correctAnswers.includes(answer),
          ).length;

          isCorrect =
            correctSelected === correctAnswers.length &&
            incorrectSelected === 0;
          scorePercentage = isCorrect ? 100 : 0;
        } else {
          // For single-select, exact match
          isCorrect =
            selected_answers.length === 1 &&
            correctAnswers.length === 1 &&
            selected_answers[0] === correctAnswers[0];
          scorePercentage = isCorrect ? 100 : 0;
        }
      }

      quizAttempt = {
        quiz_id: quiz._id,
        selected_answers,
        time_spent_seconds: Math.floor(
          (Date.now() - attempt.started_at.getTime()) / 1000,
        ),
        is_correct: isCorrect,
        score_percentage: scorePercentage,
      };
    }

    // Handle text-based answer
    if (text_response) {
      // For text responses, create a pseudo-question for AI verification
      const questions: QuizQuestion[] = [
        {
          question: 'Text response evaluation',
          question_type: QuizQuestionTypeEnum.SCENARIO_BASED,
          options: [],
          user_answer: text_response,
        },
      ];

      // Call Python service for AI verification of text response
      try {
        aiVerificationResult = await this.pythonService.validateAnchorTagQuiz(
          module.title,
          module.description || '',
          questions,
        );

        this.logger.log(
          'AI verification completed successfully for text response',
        );

        // Use AI verification results
        isCorrect =
          aiVerificationResult.questions_results?.[0]?.is_correct || false;
        scorePercentage = aiVerificationResult.score_percentage || 0;
      } catch (error) {
        this.logger.error(
          'AI verification failed for text response:',
          error.message,
        );

        // Fallback: For text responses without AI, we'll mark as correct for now
        isCorrect = true;
        scorePercentage = 100;
      }
    }

    // Calculate time spent
    const timeSpentSeconds = Math.floor(
      (Date.now() - attempt.started_at.getTime()) / 1000,
    );

    // Update attempt with comprehensive data
    const updateData = {
      status: AnchorTagAttemptStatusEnum.COMPLETED,
      completed_at: new Date(),
      time_spent_seconds: timeSpentSeconds,
      is_correct: isCorrect,
      score_percentage: scorePercentage,
      quiz_attempt: quizAttempt,
      text_response,
      ai_verification_result: aiVerificationResult,
    };

    const updatedAttempt = await StudentAnchorTagAttemptModel.findByIdAndUpdate(
      attempt._id,
      updateData,
      { new: true },
    );

    if (!updatedAttempt) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'ANCHOR_TAG_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    this.logger.log(
      `Anchor tag attempt completed for student ${user.id}, score: ${scorePercentage}%`,
    );

    return {
      ...updatedAttempt.toObject(),
      attempt_id: updatedAttempt._id,
      ai_verification_report: aiVerificationResult,
      ai_verification_result: undefined,
    };
  }

  async skipAnchorTag(
    anchorTagId: string | Types.ObjectId,
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
    const StudentModel = connection.model(Student.name, StudentSchema);
    const StudentAnchorTagAttemptModel = connection.model(
      StudentAnchorTagAttempt.name,
      StudentAnchorTagAttemptSchema,
    );

    // Validate anchor tag exists
    const anchorTag = await AnchorTagModel.findOne({
      _id: new Types.ObjectId(anchorTagId),
      deleted_at: null,
      status: 'ACTIVE',
    });

    if (!anchorTag) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'ANCHOR_TAG_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Check if anchor tag is mandatory
    if (anchorTag.is_mandatory) {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_TAG',
          'MANDATORY_ANCHOR_TAG_CANNOT_BE_SKIPPED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Validate student exists
    const student = await StudentModel.findOne({
      user_id: new Types.ObjectId(user.id),
      deleted_at: null,
    });

    if (!student) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'STUDENT_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Find in-progress attempt or create new one
    let attempt = await StudentAnchorTagAttemptModel.findOne({
      student_id: student._id,
      anchor_tag_id: new Types.ObjectId(anchorTagId),
      status: AnchorTagAttemptStatusEnum.IN_PROGRESS,
      deleted_at: null,
    });

    if (!attempt) {
      // Get next attempt number
      const lastAttempt = await StudentAnchorTagAttemptModel.findOne({
        student_id: student._id,
        anchor_tag_id: new Types.ObjectId(anchorTagId),
        deleted_at: null,
      })
        .sort({ attempt_number: -1 })
        .select('attempt_number')
        .lean();

      const attemptNumber = lastAttempt ? lastAttempt.attempt_number + 1 : 1;

      attempt = new StudentAnchorTagAttemptModel({
        student_id: student._id,
        module_id: anchorTag.module_id,
        chapter_id: anchorTag.chapter_id,
        bibliography_id: anchorTag.bibliography_id,
        anchor_tag_id: new Types.ObjectId(anchorTagId),
        status: AnchorTagAttemptStatusEnum.SKIPPED,
        started_at: new Date(),
        skipped_at: new Date(),
        attempt_number: attemptNumber,
      });
    } else {
      attempt.status = AnchorTagAttemptStatusEnum.SKIPPED;
      attempt.skipped_at = new Date();
    }

    const savedAttempt = await attempt.save();

    return savedAttempt;
  }

  async getStudentAnchorTagAttempts(
    user: JWTUserPayload,
    filterDto?: {
      anchor_tag_id?: string | Types.ObjectId;
      bibliography_id?: string | Types.ObjectId;
      module_id?: string | Types.ObjectId;
      chapter_id?: string | Types.ObjectId;
      status?: AnchorTagAttemptStatusEnum;
    },
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
    const StudentModel = connection.model(Student.name, StudentSchema);
    const StudentAnchorTagAttemptModel = connection.model(
      StudentAnchorTagAttempt.name,
      StudentAnchorTagAttemptSchema,
    );

    // Validate student exists
    const student = await StudentModel.findOne({
      user_id: new Types.ObjectId(user.id),
      deleted_at: null,
    });

    if (!student) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'STUDENT_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Build filter query
    const filterQuery: any = {
      student_id: student._id,
      deleted_at: null,
    };

    if (filterDto) {
      const { anchor_tag_id, bibliography_id, module_id, chapter_id, status } =
        filterDto;
      if (anchor_tag_id)
        filterQuery.anchor_tag_id = new Types.ObjectId(anchor_tag_id);
      if (bibliography_id)
        filterQuery.bibliography_id = new Types.ObjectId(bibliography_id);
      if (module_id) filterQuery.module_id = new Types.ObjectId(module_id);
      if (chapter_id) filterQuery.chapter_id = new Types.ObjectId(chapter_id);
      if (status) filterQuery.status = status;
    }

    const attempts = await StudentAnchorTagAttemptModel.find(filterQuery)
      .sort({ created_at: -1 })
      .populate(
        'anchor_tag_id',
        'title description content_type content_reference',
      )
      .populate('module_id', 'title')
      .populate('chapter_id', 'title')
      .populate('bibliography_id', 'title type')
      .lean();

    return attempts;
  }
}
