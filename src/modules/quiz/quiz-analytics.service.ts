import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/database/schemas/central/user.schema';
import { School } from 'src/database/schemas/central/school.schema';
import {
  StudentQuizAttempt,
  StudentQuizAttemptSchema,
} from 'src/database/schemas/tenant/student-quiz-attempt.schema';
import {
  QuizGroup,
  QuizGroupSchema,
} from 'src/database/schemas/tenant/quiz-group.schema';
import { Quiz, QuizSchema } from 'src/database/schemas/tenant/quiz.schema';
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
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { AttemptStatusEnum } from 'src/common/constants/status.constant';
import { StudentQuizAnalyticsFilterDto } from './dto/student-quiz-analytics-filter.dto';
import { ExportFormatEnum } from 'src/common/constants/export.constant';
import { QuizAnalyticsFilterDto } from './dto/quiz-analytics-filter.dto';

@Injectable()
export class QuizAnalyticsService {
  private readonly logger = new Logger(QuizAnalyticsService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {}

  // ========== ADMIN ANALYTICS ==========

  async getQuizAnalytics(
    user: JWTUserPayload,
    filterDto?: QuizAnalyticsFilterDto,
  ) {
    this.logger.log(`Getting quiz analytics for user: ${user.id}`);

    // Validate user has admin privileges
    if (
      user.role.name !== RoleEnum.SCHOOL_ADMIN &&
      user.role.name !== RoleEnum.PROFESSOR
    ) {
      throw new BadRequestException('Only admins can access quiz analytics');
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
    const QuizGroupModel = tenantConnection.model(
      QuizGroup.name,
      QuizGroupSchema,
    );
    const QuizModel = tenantConnection.model(Quiz.name, QuizSchema);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);

    // Build match conditions
    const matchConditions: any = {
      status: AttemptStatusEnum.COMPLETED,
    };

    if (filterDto?.module_id) {
      matchConditions.module_id = new Types.ObjectId(filterDto.module_id);
    }

    if (filterDto?.chapter_id) {
      matchConditions.chapter_id = new Types.ObjectId(filterDto.chapter_id);
    }

    if (filterDto?.quiz_group_id) {
      matchConditions.quiz_group_id = new Types.ObjectId(
        filterDto.quiz_group_id,
      );
    }

    if (filterDto?.date_from) {
      matchConditions.completed_at = {
        $gte: new Date(filterDto.date_from),
      };
    }

    if (filterDto?.date_to) {
      if (matchConditions.completed_at) {
        matchConditions.completed_at.$lte = new Date(filterDto.date_to);
      } else {
        matchConditions.completed_at = {
          $lte: new Date(filterDto.date_to),
        };
      }
    }

    // Aggregate pipeline for quiz-level analytics
    const quizAnalyticsPipeline = [
      { $match: matchConditions },
      {
        $lookup: {
          from: 'quiz_group',
          localField: 'quiz_group_id',
          foreignField: '_id',
          as: 'quiz_group',
        },
      },
      { $unwind: '$quiz_group' },
      {
        $lookup: {
          from: 'modules',
          localField: 'module_id',
          foreignField: '_id',
          as: 'module',
        },
      },
      {
        $lookup: {
          from: 'chapters',
          localField: 'chapter_id',
          foreignField: '_id',
          as: 'chapter',
        },
      },
      {
        $group: {
          _id: '$quiz_group_id',
          quiz_group: { $first: '$quiz_group' },
          module: { $first: { $arrayElemAt: ['$module', 0] } },
          chapter: { $first: { $arrayElemAt: ['$chapter', 0] } },
          total_attempts: { $sum: 1 },
          average_score: { $avg: '$score_percentage' },
          total_passed: {
            $sum: { $cond: ['$is_passed', 1, 0] },
          },
          total_failed: {
            $sum: { $cond: ['$is_passed', 0, 1] },
          },
          min_score: { $min: '$score_percentage' },
          max_score: { $max: '$score_percentage' },
          average_time_taken: { $avg: '$time_taken_seconds' },
        },
      },
      {
        $addFields: {
          pass_rate: {
            $multiply: [{ $divide: ['$total_passed', '$total_attempts'] }, 100],
          },
        },
      },
      {
        $project: {
          _id: 1,
          quiz_group: {
            _id: 1,
            subject: 1,
            description: 1,
            difficulty: 1,
            category: 1,
          },
          module: {
            _id: 1,
            title: 1,
            subject: 1,
          },
          chapter: {
            _id: 1,
            title: 1,
          },
          total_attempts: 1,
          average_score: { $round: ['$average_score', 2] },
          pass_rate: { $round: ['$pass_rate', 2] },
          total_passed: 1,
          total_failed: 1,
          min_score: 1,
          max_score: 1,
          average_time_taken: { $round: ['$average_time_taken', 2] },
        },
      },
      { $sort: { 'quiz_group.subject': 1 } },
    ];

    const quizAnalytics = await StudentQuizAttemptModel.aggregate(
      quizAnalyticsPipeline as any,
    );

    // Get most missed questions for each quiz group
    const mostMissedQuestions = await this.getMostMissedQuestions(
      tenantConnection,
      matchConditions,
    );

    // Combine analytics with most missed questions
    const enhancedAnalytics = quizAnalytics.map((quiz) => {
      const missedQuestions = mostMissedQuestions.find(
        (mq) => mq.quiz_group_id.toString() === quiz._id.toString(),
      );
      return {
        ...quiz,
        most_missed_questions: missedQuestions?.questions || [],
      };
    });

    return {
      analytics: enhancedAnalytics,
      summary: {
        total_quizzes: enhancedAnalytics.length,
        total_attempts: enhancedAnalytics.reduce(
          (sum, quiz) => sum + quiz.total_attempts,
          0,
        ),
        average_pass_rate: enhancedAnalytics.length
          ? enhancedAnalytics.reduce((sum, quiz) => sum + quiz.pass_rate, 0) /
            enhancedAnalytics.length
          : 0,
      },
    };
  }

  private async getMostMissedQuestions(
    tenantConnection: any,
    matchConditions: any,
  ) {
    const StudentQuizAttemptModel = tenantConnection.model(
      StudentQuizAttempt.name,
      StudentQuizAttemptSchema,
    );
    const QuizModel = tenantConnection.model(Quiz.name, QuizSchema);

    const pipeline = [
      { $match: matchConditions },
      { $unwind: '$answers' },
      {
        $lookup: {
          from: 'quizzes',
          localField: 'answers.quiz_id',
          foreignField: '_id',
          as: 'quiz',
        },
      },
      { $unwind: '$quiz' },
      {
        $addFields: {
          is_correct: {
            $setEquals: ['$answers.selected_answers', '$quiz.answer'],
          },
        },
      },
      {
        $group: {
          _id: {
            quiz_group_id: '$quiz_group_id',
            quiz_id: '$answers.quiz_id',
            question: '$quiz.question',
            sequence: '$quiz.sequence',
          },
          total_attempts: { $sum: 1 },
          correct_attempts: {
            $sum: { $cond: ['$is_correct', 1, 0] },
          },
        },
      },
      {
        $addFields: {
          incorrect_attempts: {
            $subtract: ['$total_attempts', '$correct_attempts'],
          },
          accuracy_rate: {
            $multiply: [
              { $divide: ['$correct_attempts', '$total_attempts'] },
              100,
            ],
          },
        },
      },
      {
        $group: {
          _id: '$_id.quiz_group_id',
          quiz_group_id: { $first: '$_id.quiz_group_id' },
          questions: {
            $push: {
              quiz_id: '$_id.quiz_id',
              question: '$_id.question',
              sequence: '$_id.sequence',
              total_attempts: '$total_attempts',
              correct_attempts: '$correct_attempts',
              incorrect_attempts: '$incorrect_attempts',
              accuracy_rate: '$accuracy_rate',
            },
          },
        },
      },
      {
        $project: {
          quiz_group_id: 1,
          questions: {
            $sortArray: {
              input: '$questions',
              sortBy: { incorrect_attempts: -1, accuracy_rate: 1 },
            },
          },
        },
      },
      {
        $addFields: {
          questions: { $slice: ['$questions', 5] }, // Top 5 most missed
        },
      },
    ];

    return await StudentQuizAttemptModel.aggregate(pipeline as any);
  }

  // ========== STUDENT ANALYTICS ==========

  async getStudentQuizAnalytics(
    user: JWTUserPayload,
    filterDto?: StudentQuizAnalyticsFilterDto,
  ) {
    this.logger.log(`Getting student quiz analytics for user: ${user.id}`);

    // Validate user is a student
    if (user.role.name !== RoleEnum.STUDENT) {
      throw new BadRequestException(
        'Only students can access personal analytics',
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
    const QuizGroupModel = tenantConnection.model(
      QuizGroup.name,
      QuizGroupSchema,
    );
    const QuizModel = tenantConnection.model(Quiz.name, QuizSchema);
    const ModuleModel = tenantConnection.model(Module.name, ModuleSchema);
    const ChapterModel = tenantConnection.model(Chapter.name, ChapterSchema);

    // Build match conditions
    const matchConditions: any = {
      student_id: new Types.ObjectId(user.id),
      status: AttemptStatusEnum.COMPLETED,
    };

    if (filterDto?.module_id) {
      matchConditions.module_id = new Types.ObjectId(filterDto.module_id);
    }

    if (filterDto?.chapter_id) {
      matchConditions.chapter_id = new Types.ObjectId(filterDto.chapter_id);
    }

    if (filterDto?.quiz_group_id) {
      matchConditions.quiz_group_id = new Types.ObjectId(
        filterDto.quiz_group_id,
      );
    }

    if (filterDto?.date_from) {
      matchConditions.completed_at = {
        $gte: new Date(filterDto.date_from),
      };
    }

    if (filterDto?.date_to) {
      if (matchConditions.completed_at) {
        matchConditions.completed_at.$lte = new Date(filterDto.date_to);
      } else {
        matchConditions.completed_at = {
          $lte: new Date(filterDto.date_to),
        };
      }
    }

    // Get student's quiz attempts with details
    const attempts = await StudentQuizAttemptModel.aggregate([
      { $match: matchConditions },
      {
        $lookup: {
          from: 'quiz_group',
          localField: 'quiz_group_id',
          foreignField: '_id',
          as: 'quiz_group',
        },
      },
      { $unwind: '$quiz_group' },
      {
        $lookup: {
          from: 'modules',
          localField: 'module_id',
          foreignField: '_id',
          as: 'module',
        },
      },
      {
        $lookup: {
          from: 'chapters',
          localField: 'chapter_id',
          foreignField: '_id',
          as: 'chapter',
        },
      },
      {
        $project: {
          _id: 1,
          quiz_group: {
            _id: 1,
            subject: 1,
            description: 1,
            difficulty: 1,
          },
          module: { $arrayElemAt: ['$module', 0] },
          chapter: { $arrayElemAt: ['$chapter', 0] },
          score_percentage: 1,
          is_passed: 1,
          attempt_number: 1,
          started_at: 1,
          completed_at: 1,
          time_taken_seconds: 1,
          answers: 1,
        },
      },
      { $sort: { completed_at: -1 } },
    ]);

    // Get detailed question analysis for each attempt
    const attemptsWithDetails = await Promise.all(
      attempts.map(async (attempt) => {
        const questionDetails = await this.getQuestionDetailsForAttempt(
          attempt._id,
          tenantConnection,
        );

        return {
          ...attempt,
          question_breakdown: questionDetails,
        };
      }),
    );

    // Calculate summary statistics
    const summary = this.calculateStudentSummary(attempts);

    return {
      attempts: attemptsWithDetails,
      summary,
    };
  }

  private async getQuestionDetailsForAttempt(
    attemptId: Types.ObjectId,
    tenantConnection: any,
  ) {
    const StudentQuizAttemptModel = tenantConnection.model(
      StudentQuizAttempt.name,
      StudentQuizAttemptSchema,
    );
    const QuizModel = tenantConnection.model(Quiz.name, QuizSchema);

    const attempt = await StudentQuizAttemptModel.findById(attemptId);
    if (!attempt) return [];

    const questionDetails = await Promise.all(
      attempt.answers.map(async (answer: any) => {
        const quiz = await QuizModel.findById(answer.quiz_id);
        if (!quiz) return null;

        const isCorrect = this.areAnswersEqual(
          answer.selected_answers,
          quiz.answer,
        );

        return {
          quiz_id: answer.quiz_id,
          question: quiz.question,
          sequence: quiz.sequence,
          selected_answers: answer.selected_answers,
          correct_answers: quiz.answer,
          is_correct: isCorrect,
          time_spent_seconds: answer.time_spent_seconds,
          explanation: quiz.explanation,
        };
      }),
    );

    return questionDetails.filter(Boolean);
  }

  private calculateStudentSummary(attempts: any[]) {
    if (attempts.length === 0) {
      return {
        total_attempts: 0,
        average_score: 0,
        pass_rate: 0,
        total_passed: 0,
        total_failed: 0,
        average_time_taken: 0,
        best_score: 0,
        worst_score: 0,
      };
    }

    const totalAttempts = attempts.length;
    const totalPassed = attempts.filter((a) => a.is_passed).length;
    const averageScore =
      attempts.reduce((sum, a) => sum + a.score_percentage, 0) / totalAttempts;
    const averageTimeTaken =
      attempts.reduce((sum, a) => sum + a.time_taken_seconds, 0) /
      totalAttempts;
    const scores = attempts.map((a) => a.score_percentage);

    return {
      total_attempts: totalAttempts,
      average_score: Math.round(averageScore * 100) / 100,
      pass_rate: Math.round((totalPassed / totalAttempts) * 100 * 100) / 100,
      total_passed: totalPassed,
      total_failed: totalAttempts - totalPassed,
      average_time_taken: Math.round(averageTimeTaken * 100) / 100,
      best_score: Math.max(...scores),
      worst_score: Math.min(...scores),
    };
  }

  private areAnswersEqual(selected: string[], correct: string[]): boolean {
    if (selected.length !== correct.length) return false;
    const sortedSelected = [...selected].sort();
    const sortedCorrect = [...correct].sort();
    return JSON.stringify(sortedSelected) === JSON.stringify(sortedCorrect);
  }

  // ========== EXPORT FUNCTIONALITY ==========

  async exportQuizAnalytics(
    user: JWTUserPayload,
    format: ExportFormatEnum,
    filterDto?: QuizAnalyticsFilterDto,
  ) {
    this.logger.log(
      `Exporting quiz analytics in ${format} format for user: ${user.id}`,
    );

    const analytics = await this.getQuizAnalytics(user, filterDto);

    if (format === ExportFormatEnum.CSV) {
      return this.exportToCSV(analytics.analytics);
    } else if (format === ExportFormatEnum.JSON) {
      return this.exportToJSON(analytics);
    }

    throw new BadRequestException('Unsupported export format');
  }

  async exportStudentQuizAnalytics(
    user: JWTUserPayload,
    format: ExportFormatEnum,
    filterDto?: StudentQuizAnalyticsFilterDto,
  ) {
    this.logger.log(
      `Exporting student quiz analytics in ${format} format for user: ${user.id}`,
    );

    const analytics = await this.getStudentQuizAnalytics(user, filterDto);

    if (format === ExportFormatEnum.CSV) {
      return this.exportStudentToCSV(analytics);
    } else if (format === ExportFormatEnum.JSON) {
      return this.exportStudentToJSON(analytics);
    }

    throw new BadRequestException('Unsupported export format');
  }

  private exportToCSV(analytics: any[]) {
    const headers = [
      'Quiz Subject',
      'Module',
      'Chapter',
      'Total Attempts',
      'Average Score',
      'Pass Rate (%)',
      'Total Passed',
      'Total Failed',
      'Min Score',
      'Max Score',
      'Average Time (seconds)',
    ];

    const rows = analytics.map((quiz) => [
      quiz.quiz_group.subject,
      quiz.module?.title || 'N/A',
      quiz.chapter?.title || 'N/A',
      quiz.total_attempts,
      quiz.average_score,
      quiz.pass_rate,
      quiz.total_passed,
      quiz.total_failed,
      quiz.min_score,
      quiz.max_score,
      quiz.average_time_taken,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    return {
      filename: `quiz-analytics-${new Date().toISOString().split('T')[0]}.csv`,
      content: csvContent,
      contentType: 'text/csv',
    };
  }

  private exportToJSON(analytics: any) {
    return {
      filename: `quiz-analytics-${new Date().toISOString().split('T')[0]}.json`,
      content: JSON.stringify(analytics, null, 2),
      contentType: 'application/json',
    };
  }

  private exportStudentToCSV(analytics: any) {
    const headers = [
      'Quiz Subject',
      'Module',
      'Chapter',
      'Attempt Number',
      'Score (%)',
      'Passed',
      'Time Taken (seconds)',
      'Completed At',
    ];

    const rows = analytics.attempts.map((attempt: any) => [
      attempt.quiz_group.subject,
      attempt.module?.title || 'N/A',
      attempt.chapter?.title || 'N/A',
      attempt.attempt_number,
      attempt.score_percentage,
      attempt.is_passed ? 'Yes' : 'No',
      attempt.time_taken_seconds,
      attempt.completed_at,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    return {
      filename: `student-quiz-analytics-${new Date().toISOString().split('T')[0]}.csv`,
      content: csvContent,
      contentType: 'text/csv',
    };
  }

  private exportStudentToJSON(analytics: any) {
    return {
      filename: `student-quiz-analytics-${new Date().toISOString().split('T')[0]}.json`,
      content: JSON.stringify(analytics, null, 2),
      contentType: 'application/json',
    };
  }
}
