import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { createPaginationResult } from 'src/common/utils/pagination.util';
import { School } from 'src/database/schemas/central/school.schema';
import { User } from 'src/database/schemas/central/user.schema';
import {
  AnchorChatSession,
  AnchorChatSessionSchema,
} from 'src/database/schemas/tenant/anchor-chat-session.schema';
import {
  AnchorChatMessage,
  AnchorChatMessageSchema,
} from 'src/database/schemas/tenant/anchor-chat-message.schema';
import {
  AnchorChatResource,
  AnchorChatResourceSchema,
} from 'src/database/schemas/tenant/anchor-chat-resource.schema';
import {
  Module,
  ModuleSchema,
} from 'src/database/schemas/tenant/module.schema';
import {
  Student,
  StudentSchema,
} from 'src/database/schemas/tenant/student.schema';
import {
  AnchorTag,
  AnchorTagSchema,
} from 'src/database/schemas/tenant/anchor-tag.schema';
import {
  Chapter,
  ChapterSchema,
} from 'src/database/schemas/tenant/chapter.schema';
import {
  Bibliography,
  BibliographySchema,
} from 'src/database/schemas/tenant/bibliography.schema';
import {
  Quiz,
  QuizSchema,
} from 'src/database/schemas/tenant/quiz.schema';
import {
  QuizGroup,
  QuizGroupSchema,
} from 'src/database/schemas/tenant/quiz-group.schema';
import {
  StudentQuizAttempt,
  StudentQuizAttemptSchema,
} from 'src/database/schemas/tenant/student-quiz-attempt.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { CreateAnchorChatSessionDto } from './dto/create-anchor-chat-session.dto';
import { AnchorChatSessionStatusEnum } from 'src/common/constants/anchor-chat-session.constant';
import { AnchorChatSessionTypeEnum } from 'src/common/constants/anchor-chat-session-type.constant';
import { AnchorChatSessionFilterDto } from './dto/anchor-chat-session-filter.dto';
import { CreateAnchorChatMessageDto } from './dto/create-anchor-chat-message.dto';
import { CreateAnchorChatResourceDto } from './dto/create-anchor-chat-resource.dto';
import {
  AnchorChatMessageSenderEnum,
  AnchorChatMessageTypeEnum,
} from 'src/common/constants/anchor-chat-message.constant';
import { AnchorChatPythonService } from './python.service';
import { AnchorChatConversationHistoryType } from './python.service';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { DEFAULT_LANGUAGE } from 'src/common/constants/language.constant';

@Injectable()
export class AnchorChatService {
  private readonly logger = new Logger(AnchorChatService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly anchorChatPythonService: AnchorChatPythonService,
    private readonly errorMessageService: ErrorMessageService,
  ) {}

  // ========== SESSION OPERATIONS ==========

  async createAnchorChatSession(
    createAnchorChatSessionDto: CreateAnchorChatSessionDto,
    user: JWTUserPayload,
  ) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          DEFAULT_LANGUAGE,
        ),
      );
    }

    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const AnchorChatSessionModel = connection.model(
      AnchorChatSession.name,
      AnchorChatSessionSchema,
    );
    const AnchorTagModel = connection.model(AnchorTag.name, AnchorTagSchema);
    const ModuleModel = connection.model(Module.name, ModuleSchema);
    const AnchorChatMessageModel = connection.model(
      AnchorChatMessage.name,
      AnchorChatMessageSchema,
    );
    const StudentModel = connection.model(Student.name, StudentSchema);
    const ChapterModel = connection.model(Chapter.name, ChapterSchema);
    const BibliographyModel = connection.model(Bibliography.name, BibliographySchema);

    const { anchor_tag_id, session_type, quiz_id } = createAnchorChatSessionDto;
    const student_id = user.id;

    let anchorTag;
    let actualAnchorTagId;

    // Handle different session types
    let quizGroupModuleId: Types.ObjectId | null = null;
    if (session_type === AnchorChatSessionTypeEnum.QUIZ) {
      // For quiz sessions, validate quiz exists if quiz_id is provided
      if (quiz_id) {
        console.log('🔍 Validating quiz with ID:', quiz_id);

        const QuizGroupModel = connection.model(QuizGroup.name, QuizGroupSchema);
        const quizGroup = await QuizGroupModel.findOne({
          _id: quiz_id,
          deleted_at: null,
        });

        console.log('📋 Quiz Group found:', quizGroup ? {
          _id: quizGroup._id,
          subject: quizGroup.subject,
          module_id: quizGroup.module_id,
          chapter_id: quizGroup.chapter_id,
          bibliography_id: quizGroup.bibliography_id
        } : 'NOT FOUND');

        if (!quizGroup) {
          throw new NotFoundException(
            this.errorMessageService.getMessageWithLanguage(
              'QUIZ_GROUP',
              'NOT_FOUND',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }

        // Store the module_id from quiz group for later use
        quizGroupModuleId = quizGroup.module_id;
      }
    }

    // Handle anchor_tag_id if provided (for both session types)
    if (anchor_tag_id) {
      console.log('🔍 Validating anchor tag with ID:', anchor_tag_id);

      // Validate that the anchor tag exists
      anchorTag = await AnchorTagModel.findOne({
        _id: anchor_tag_id,
        deleted_at: null,
      });

      console.log('🏷️ Anchor tag found:', anchorTag ? {
        _id: anchorTag._id,
        title: anchorTag.title,
        module_id: anchorTag.module_id,
        chapter_id: anchorTag.chapter_id,
        bibliography_id: anchorTag.bibliography_id,
        anchor_type: anchorTag.anchor_type
      } : 'NOT FOUND');

      if (!anchorTag) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'ANCHOR_TAG',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
      actualAnchorTagId = anchor_tag_id;
    } else {
      // No anchor tag provided - create a minimal session
      anchorTag = null;
      actualAnchorTagId = null;
    }

    // Validate that the module exists (only if anchor tag is provided)
    let moduleExists: any = null;
    if (anchorTag) {
      moduleExists = await ModuleModel.findOne({
        _id: anchorTag.module_id,
        deleted_at: null,
      });
      if (!moduleExists) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'MODULE',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    }

    // Fetch chapter details (only if anchor tag is provided)
    let chapterExists: any = null;
    if (anchorTag) {
      chapterExists = await ChapterModel.findOne({
        _id: anchorTag.chapter_id,
        deleted_at: null,
      });
      if (!chapterExists) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'CHAPTER',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    }

    // Fetch bibliography details (only if anchor tag is provided)
    let bibliographyExists: any = null;
    if (anchorTag) {
      bibliographyExists = await BibliographyModel.findOne({
        _id: anchorTag.bibliography_id,
        deleted_at: null,
      });
      if (!bibliographyExists) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'BIBLIOGRAPHY',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    }

    // Validate that the student exists
    const studentExists = await StudentModel.findOne({
      _id: student_id,
      deleted_at: null,
    });
    if (!studentExists) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'NOT_FOUND',
          DEFAULT_LANGUAGE,
        ),
      );
    }

    const sessionData = {
      anchor_tag_id: actualAnchorTagId ? new Types.ObjectId(actualAnchorTagId) : null,
      module_id: anchorTag
        ? new Types.ObjectId(anchorTag.module_id)
        : (quizGroupModuleId ? new Types.ObjectId(quizGroupModuleId) : null),
      student_id: new Types.ObjectId(student_id),
      created_by: new Types.ObjectId(user.id),
      created_by_role: user.role.name,
      status: AnchorChatSessionStatusEnum.ACTIVE,
      session_type: session_type || AnchorChatSessionTypeEnum.AI_CHAT,
      started_at: new Date(),
      session_title: anchorTag
        ? (session_type === AnchorChatSessionTypeEnum.QUIZ
            ? `Quiz Chat: ${anchorTag.title}`
            : `Resource Chat: ${anchorTag.title}`)
        : (session_type === AnchorChatSessionTypeEnum.QUIZ
            ? 'Quiz Chat Session'
            : 'AI Chat Session'),
      session_description: anchorTag
        ? (session_type === AnchorChatSessionTypeEnum.QUIZ
            ? `Quiz-based AI resource advisor for ${anchorTag.title}`
            : `AI resource advisor for ${anchorTag.title}`)
        : (session_type === AnchorChatSessionTypeEnum.QUIZ
            ? 'Quiz-based AI resource advisor'
            : 'AI resource advisor'),
      anchor_context: anchorTag?.description || '',
      ai_chat_question: anchorTag?.ai_chat_question || null,
      ai_question_asked: false,
      ai_question_answered: false,
    };

    console.log('sessionData',sessionData);

    // Start database transaction
    const dbSession = await connection.startSession();

    try {
      const response = await dbSession.withTransaction(async () => {
        // Create anchor chat session within transaction
        const anchorChatSession = new AnchorChatSessionModel(sessionData);
        await anchorChatSession.save({ session: dbSession });

        this.logger.log(
          `Anchor chat session created with ID: ${anchorChatSession._id} by user: ${user.id}`,
        );

        // Python API call to start the resource advisor conversation
        let response: any = {
          message: session_type === AnchorChatSessionTypeEnum.QUIZ
            ? 'Quiz chat session started successfully. How can I help you with your quiz?'
            : 'AI chat session started successfully. How can I help you today?',
          metadata: null
        };

        // Call Python API if we have anchor tag OR if it's a quiz session with module info
        if (anchorTag && moduleExists && chapterExists && bibliographyExists) {
          // Full context with anchor tag
          const moduleTitle = (moduleExists as any)?.title || 'Unknown Module';
          const chapterTitle = (chapterExists as any)?.title || 'Unknown Chapter';
          const bibliographyTitle = (bibliographyExists as any)?.title || 'Unknown Bibliography';

          response = await this.anchorChatPythonService.startAnchorChatSession(
            anchorTag.title,
            anchorTag.description || '',
            sessionData.anchor_context,
            moduleTitle,
            chapterTitle,
            bibliographyTitle,
            anchorTag.ai_chat_question,
          );
        } else if (session_type === AnchorChatSessionTypeEnum.QUIZ && quizGroupModuleId) {
          // Quiz session without anchor tag - get module info and call Quiz API
          const ModuleModel = connection.model(Module.name, ModuleSchema);
          const module = await ModuleModel.findOne({
            _id: quizGroupModuleId,
            deleted_at: null,
          });

          if (module) {
            const moduleTitle = (module as any)?.title || 'Unknown Module';

            // Get quiz group subject for additional context
            const QuizGroupModel = connection.model(QuizGroup.name, QuizGroupSchema);
            const quizGroup = await QuizGroupModel.findOne({
              _id: quiz_id,
              deleted_at: null,
            });

            const quizSubject = quizGroup?.subject || null;

            // Get quiz questions from the quiz group
            const QuizModel = connection.model(Quiz.name, QuizSchema);
            const quizQuestions = await QuizModel.find({
              quiz_group_id: quiz_id,
              deleted_at: null,
            }).sort({ sequence: 1 });

            // Get user's last quiz attempt
            const StudentQuizAttemptModel = connection.model(StudentQuizAttempt.name, StudentQuizAttemptSchema);
            const lastQuizAttempt = await StudentQuizAttemptModel.findOne({
              student_id: student_id,
              quiz_group_id: quiz_id,
            }).sort({ attempt_number: -1 }); // Get the latest attempt

            // Format user answers for the Python API
            let userAnswers: any[] | undefined = undefined;
            if (
              lastQuizAttempt &&
              lastQuizAttempt.answers &&
              lastQuizAttempt.answers.length > 0
            ) {
              userAnswers = lastQuizAttempt.answers.map((answer) => ({
                question_id: answer.quiz_id,
                user_answer: answer.selected_answers,
                time_spent_seconds: answer.time_spent_seconds,
                attempt_number: lastQuizAttempt.attempt_number,
                score_percentage: lastQuizAttempt.score_percentage,
                is_passed: lastQuizAttempt.is_passed,
                completed_at: lastQuizAttempt.completed_at,
              }));
            }

            response = await this.anchorChatPythonService.startQuizChatSession(
              moduleTitle,
              quizSubject || undefined,
              quizQuestions.length > 0 ? quizQuestions : undefined,
              userAnswers,
            );
          }
        }

        // Update session if AI question was asked
        if (anchorTag?.ai_chat_question) {
          await AnchorChatSessionModel.updateOne(
            { _id: anchorChatSession._id },
            { ai_question_asked: true },
            { session: dbSession }
          );
        }

        // Create AI chat message within transaction
        const message = await AnchorChatMessageModel.create(
          [
            {
              session_id: new Types.ObjectId(anchorChatSession._id),
              anchor_tag_id: actualAnchorTagId ? new Types.ObjectId(actualAnchorTagId) : null,
              module_id: anchorTag
                ? new Types.ObjectId(anchorTag.module_id)
                : (quizGroupModuleId ? new Types.ObjectId(quizGroupModuleId) : null),
              student_id: new Types.ObjectId(student_id),
              sender: AnchorChatMessageSenderEnum.AI_RESOURCE_ADVISOR,
              message_type: AnchorChatMessageTypeEnum.TEXT,
              content: (response as any).message || 'Session started successfully',
              conversation_started: true,
              message_metadata: (response as any).metadata || null,
            },
          ],
          { session: dbSession },
        );
        return message[0];
      });

      // Return the response from the transaction
      return response;
    } catch (error) {
      throw new InternalServerErrorException(error?.message || error);
    } finally {
      await dbSession.endSession();
    }
  }

  async findAllAnchorChatSessions(
    user: JWTUserPayload,
    filterDto?: AnchorChatSessionFilterDto,
    paginationOptions?: any,
  ) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const AnchorChatSessionModel = connection.model(
      AnchorChatSession.name,
      AnchorChatSessionSchema,
    );
    // Register related models for populate
    connection.model(Module.name, ModuleSchema);
    connection.model(Student.name, StudentSchema);
    connection.model(AnchorTag.name, AnchorTagSchema);

    const filter: any = {
      deleted_at: null,
      student_id: new Types.ObjectId(user.id), // Automatically filter by authenticated user
    };

    // Apply filters
    if (filterDto?.anchor_tag_id) {
      filter.anchor_tag_id = new Types.ObjectId(filterDto.anchor_tag_id);
    }
    if (filterDto?.module_id) {
      filter.module_id = new Types.ObjectId(filterDto.module_id);
    }
    if (filterDto?.status) {
      filter.status = filterDto.status;
    }

    const [sessions, total] = await Promise.all([
      AnchorChatSessionModel.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'modules',
            localField: 'module_id',
            foreignField: '_id',
            as: 'module',
            pipeline: [
              { $project: { _id: 1, title: 1, subject: 1, description: 1 } },
            ],
          },
        },
        { $unwind: { path: '$module', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'anchor_tags',
            localField: 'anchor_tag_id',
            foreignField: '_id',
            as: 'anchor_tag',
            pipeline: [
              { $project: { _id: 1, title: 1, description: 1, content_type: 1 } },
            ],
          },
        },
        { $unwind: { path: '$anchor_tag', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'students',
            localField: 'student_id',
            foreignField: '_id',
            as: 'student',
            pipeline: [
              { $project: { _id: 1, first_name: 1, last_name: 1, email: 1 } },
            ],
          },
        },
        {
          $lookup: {
            from: 'anchor_chat_message',
            localField: '_id',
            foreignField: 'session_id',
            pipeline: [
              {
                $group: {
                  _id: null,
                  total_messages: { $sum: 1 },
                  student_messages: {
                    $sum: {
                      $cond: [
                        { $eq: ['$sender', AnchorChatMessageSenderEnum.STUDENT] },
                        1,
                        0,
                      ],
                    },
                  },
                  ai_messages: {
                    $sum: {
                      $cond: [
                        { $eq: ['$sender', AnchorChatMessageSenderEnum.AI_RESOURCE_ADVISOR] },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  total_messages: 1,
                  student_messages: 1,
                  ai_messages: 1,
                },
              },
            ],
            as: 'message_counts',
          },
        },
        {
          $addFields: {
            total_messages: {
              $ifNull: [
                { $arrayElemAt: ['$message_counts.total_messages', 0] },
                0,
              ],
            },
            student_messages: {
              $ifNull: [
                { $arrayElemAt: ['$message_counts.student_messages', 0] },
                0,
              ],
            },
            ai_messages: {
              $ifNull: [
                { $arrayElemAt: ['$message_counts.ai_messages', 0] },
                0,
              ],
            },
          },
        },
        { $project: { message_counts: 0 } },
        { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
        { $sort: { status: 1, created_at: -1 } },
        { $skip: Number(paginationOptions?.skip || 0) },
        { $limit: Number(paginationOptions?.limit || 10) },
      ]),
      AnchorChatSessionModel.countDocuments(filter),
    ]);

    return createPaginationResult(sessions, total, paginationOptions);
  }

  async completeAnchorChatSession(id: string | Types.ObjectId, user: JWTUserPayload) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const AnchorChatSessionModel = connection.model(
      AnchorChatSession.name,
      AnchorChatSessionSchema,
    );

    // Find the session and validate it exists
    const session = await AnchorChatSessionModel.findOne({
      _id: id,
      deleted_at: null,
    });

    if (!session) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_CHAT',
          'SESSION_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Check if session is already completed
    if (session.status === AnchorChatSessionStatusEnum.COMPLETED) {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_CHAT',
          'SESSION_ALREADY_COMPLETED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Check if session is cancelled
    if (session.status === AnchorChatSessionStatusEnum.CANCELLED) {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_CHAT',
          'CANNOT_COMPLETE_CANCELLED_SESSION',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Update session to completed status with ended_at timestamp
    const updateData = {
      status: AnchorChatSessionStatusEnum.COMPLETED,
      ended_at: new Date(),
      updated_at: new Date(),
    };

    await AnchorChatSessionModel.findByIdAndUpdate(new Types.ObjectId(id), updateData);

    this.logger.log(`Anchor chat session completed with ID: ${id} by user: ${user.id}`);

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'ANCHOR_CHAT',
        'ANCHOR_CHAT_SESSION_COMPLETED_SUCCESSFULLY',
        DEFAULT_LANGUAGE,
      ),
    };
  }

  // ========== MESSAGE OPERATIONS ==========

  async createAnchorChatMessage(
    createAnchorChatMessageDto: CreateAnchorChatMessageDto,
    user: JWTUserPayload,
  ) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const AnchorChatMessageModel = connection.model(
      AnchorChatMessage.name,
      AnchorChatMessageSchema,
    );
    const AnchorChatSessionModel = connection.model(
      AnchorChatSession.name,
      AnchorChatSessionSchema,
    );
    const AnchorTagModel = connection.model(AnchorTag.name, AnchorTagSchema);
    const ModuleModel = connection.model(Module.name, ModuleSchema);
    const ChapterModel = connection.model(Chapter.name, ChapterSchema);
    const BibliographyModel = connection.model(Bibliography.name, BibliographySchema);

    const { session_id, anchor_tag_id, module_id, message_type, content, session_type, quiz_id } = createAnchorChatMessageDto;
    const student_id = user.id;

    // Validate that the session exists and is active
    const session = await AnchorChatSessionModel.findOne({
      _id: session_id,
      deleted_at: null,
    });
    if (!session) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_CHAT',
          'SESSION_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    if (session.status !== AnchorChatSessionStatusEnum.ACTIVE) {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_CHAT',
          'CANNOT_ADD_MESSAGES_TO_INACTIVE_SESSION',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get anchor tag, module, chapter, and bibliography details for context
    let anchorTag: any = null;
    let actualAnchorTagId: Types.ObjectId | null = null;

    if (anchor_tag_id) {
      anchorTag = await AnchorTagModel.findById(anchor_tag_id);
      if (!anchorTag) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'ANCHOR_TAG',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
      actualAnchorTagId = new Types.ObjectId(anchor_tag_id);
    }

    const module = await ModuleModel.findById(module_id);
    if (!module) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'MODULE',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    let chapter: any = null;
    let bibliography: any = null;

    if (anchorTag) {
      chapter = await ChapterModel.findById(anchorTag.chapter_id);
      bibliography = await BibliographyModel.findById(anchorTag.bibliography_id);
    }

    const messageData = {
      session_id: new Types.ObjectId(session_id),
      anchor_tag_id: actualAnchorTagId,
      module_id: new Types.ObjectId(module_id),
      student_id: new Types.ObjectId(student_id),
      sender: AnchorChatMessageSenderEnum.STUDENT,
      message_type,
      content,
    };

    const message = new AnchorChatMessageModel(messageData);
    await message.save();

    // Update session message counts
    await this.updateSessionMessageCounts(
      session_id,
      AnchorChatMessageModel,
      AnchorChatSessionModel,
    );

    this.logger.log(
      `Anchor chat message created with ID: ${message._id} by user: ${user.id}`,
    );

    const conversation_history: AnchorChatConversationHistoryType[] =
      await AnchorChatMessageModel.aggregate([
        {
          $match: {
            session_id,
            deleted_at: null,
          },
        },
        {
          $sort: { created_at: 1 },
        },
        {
          $project: {
            role: '$sender',
            content: '$content',
            timestamp: '$created_at',
          },
        },
      ]);

    let response;
    let shouldUpdateSession = false;
    let sessionUpdates = {};

    // Check if this is answering the AI's initial question
    if (session.ai_question_asked && !session.ai_question_answered && session.ai_chat_question) {
      // Student is answering the AI's question
      response = await this.anchorChatPythonService.continueAfterAiQuestion(
        messageData.content,
        conversation_history,
        anchorTag?.title || '',
        anchorTag?.description || '',
        session.anchor_context || '',
        module?.title || '',
        chapter?.title || '',
        bibliography?.title || '',
        session.ai_chat_question,
      );

      shouldUpdateSession = true;
      sessionUpdates = { ai_question_answered: true };
    }
    // Quiz chat session - use quiz chat API
    else if (session.session_type === AnchorChatSessionTypeEnum.QUIZ) {
      // Get quiz information for context
      let quizSubject: string | undefined = undefined;
      let quizQuestions: any[] | undefined = undefined;
      let userAnswers: any[] | undefined = undefined;

      if (quiz_id) {
        const QuizGroupModel = connection.model(QuizGroup.name, QuizGroupSchema);
        const quizGroup = await QuizGroupModel.findOne({
          _id: quiz_id,
          deleted_at: null,
        });
        quizSubject = quizGroup?.subject || undefined;

        // Get quiz questions from the quiz group
        const QuizModel = connection.model(Quiz.name, QuizSchema);
        const questions = await QuizModel.find({
          quiz_group_id: quiz_id,
          deleted_at: null,
        }).sort({ sequence: 1 });

        if (questions.length > 0) {
          quizQuestions = questions;
        }

        // Get user's last quiz attempt
        const StudentQuizAttemptModel = connection.model(StudentQuizAttempt.name, StudentQuizAttemptSchema);
        const lastQuizAttempt = await StudentQuizAttemptModel.findOne({
          student_id: student_id,
          quiz_group_id: quiz_id,
        }).sort({ attempt_number: -1 });

        // Format user answers for the Python API
        if (
          lastQuizAttempt &&
          lastQuizAttempt.answers &&
          lastQuizAttempt.answers.length > 0
        ) {
          userAnswers = lastQuizAttempt.answers.map((answer) => ({
            question_id: answer.quiz_id,
            user_answer: answer.selected_answers,
            time_spent_seconds: answer.time_spent_seconds,
            attempt_number: lastQuizAttempt.attempt_number,
            score_percentage: lastQuizAttempt.score_percentage,
            is_passed: lastQuizAttempt.is_passed,
            completed_at: lastQuizAttempt.completed_at,
          }));
        }
      }

      response = await this.anchorChatPythonService.quizChat(
        messageData.content,
        conversation_history,
        module?.title || 'Unknown Module',
        quizSubject,
        quizQuestions,
        userAnswers,
      );
    }
    // Continue normal conversation after AI question is answered
    else if (session.ai_question_answered) {
      response = await this.anchorChatPythonService.anchorResourceChat(
        messageData.content,
        conversation_history,
        anchorTag?.title || '',
        anchorTag?.description || '',
        session.anchor_context || '',
        module?.title || '',
        chapter?.title || '',
        bibliography?.title || '',
        false,
      );
    }
    // Normal conversation flow
    else {
      response = await this.anchorChatPythonService.anchorResourceChat(
        messageData.content,
        conversation_history,
        anchorTag?.title || '',
        anchorTag?.description || '',
        session.anchor_context || '',
        module?.title || '',
        chapter?.title || '',
        bibliography?.title || '',
        false,
      );
    }

    // Update session if needed
    if (shouldUpdateSession) {
      await AnchorChatSessionModel.updateOne(
        { _id: session_id },
        sessionUpdates
      );
    }

    await AnchorChatMessageModel.create({
      session_id: new Types.ObjectId(session_id),
      anchor_tag_id: new Types.ObjectId(anchor_tag_id),
      module_id: new Types.ObjectId(module_id),
      student_id: new Types.ObjectId(student_id),
      sender: AnchorChatMessageSenderEnum.AI_RESOURCE_ADVISOR,
      message_type: AnchorChatMessageTypeEnum.TEXT,
      content: response?.message,
      conversation_started: false,
      message_metadata: null,
    });

    return response;
  }

  async findMessagesBySessionId(
    session_id: string | Types.ObjectId,
    user: JWTUserPayload,
  ) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const AnchorChatMessageModel = connection.model(
      AnchorChatMessage.name,
      AnchorChatMessageSchema,
    );
    const AnchorChatResourceModel = connection.model(AnchorChatResource.name, AnchorChatResourceSchema);
    const AnchorChatSessionModel = connection.model(
      AnchorChatSession.name,
      AnchorChatSessionSchema,
    );

    const messages = await AnchorChatMessageModel.find({
      session_id,
      deleted_at: null,
    })
      .sort({ created_at: 1 })
      .exec();

    const resources = await AnchorChatResourceModel.find({
      session_id,
      deleted_at: null,
    });

    const sessionDetails = await AnchorChatSessionModel.findOne({
      _id: session_id,
      deleted_at: null,
    });

    return {
      messages,
      resources,
      sessionDetails,
    };
  }

  // ========== RESOURCE OPERATIONS ==========

  async createAnchorChatResource(
    createAnchorChatResourceDto: CreateAnchorChatResourceDto,
    user: JWTUserPayload,
  ) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const AnchorChatResourceModel = connection.model(AnchorChatResource.name, AnchorChatResourceSchema);
    const AnchorChatSessionModel = connection.model(
      AnchorChatSession.name,
      AnchorChatSessionSchema,
    );
    const AnchorChatMessageModel = connection.model(
      AnchorChatMessage.name,
      AnchorChatMessageSchema,
    );
    const AnchorTagModel = connection.model(AnchorTag.name, AnchorTagSchema);
    const ChapterModel = connection.model(Chapter.name, ChapterSchema);
    const BibliographyModel = connection.model(Bibliography.name, BibliographySchema);
    const ModuleModel = connection.model(Module.name, ModuleSchema);

    const { session_id } = createAnchorChatResourceDto;
    const student_id = user.id;

    // Validate that the session exists
    const session = await AnchorChatSessionModel.findOne({
      _id: new Types.ObjectId(session_id),
      deleted_at: null,
    });
    if (!session) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'ANCHOR_CHAT',
          'SESSION_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get anchor tag details (only for AI_CHAT sessions)
    let anchorTag: any = null;
    let module: any = null;
    let chapter: any = null;
    let bibliography: any = null;

    if (session.session_type === AnchorChatSessionTypeEnum.AI_CHAT && session.anchor_tag_id) {
      anchorTag = await AnchorTagModel.findById(session.anchor_tag_id);
      if (!anchorTag) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'ANCHOR_TAG',
            'NOT_FOUND',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Get module, chapter, and bibliography details
      module = await ModuleModel.findById(anchorTag.module_id);
      chapter = await ChapterModel.findById(anchorTag.chapter_id);
      bibliography = await BibliographyModel.findById(anchorTag.bibliography_id);
    } else if (session.session_type === AnchorChatSessionTypeEnum.QUIZ) {
      // For quiz sessions, get module directly
      module = await ModuleModel.findById(session.module_id);
    }

    // Get conversation history for context
    const conversation_history: AnchorChatConversationHistoryType[] =
      await AnchorChatMessageModel.aggregate([
        {
          $match: {
            session_id: new Types.ObjectId(session_id),
            deleted_at: null,
          },
        },
        {
          $sort: { created_at: 1 },
        },
        {
          $project: {
            role: '$sender',
            content: '$content',
            timestamp: '$created_at',
            _id: 0,
          },
        },
      ]);

    let resourcesResponse: any;
    let keywords: string[] = [];

    if (session.session_type === AnchorChatSessionTypeEnum.AI_CHAT && anchorTag) {
      // Extract keywords from conversation for anchor chat
      const conversationText = conversation_history
        .map(msg => msg.content)
        .join(' ');

      const keywordsResponse = await this.anchorChatPythonService.extractAnchorKeywords(
        anchorTag.title,
        anchorTag.description || '',
        conversationText,
      );

      keywords = keywordsResponse.keywords || [];

      // Get resources based on anchor tag and conversation
      resourcesResponse = await this.anchorChatPythonService.getAnchorResources(
        anchorTag.title,
        anchorTag.description || '',
        session.anchor_context || '',
        module?.title || '',
        chapter?.title || '',
        bibliography?.title || '',
        conversation_history,
        keywords,
      );
    } else if (session.session_type === AnchorChatSessionTypeEnum.QUIZ) {
      // Get quiz resources
      let quizSubject: string | undefined = undefined;
      let quizQuestions: any[] | undefined = undefined;
      let userAnswers: any[] | undefined = undefined;

      // Extract keywords from conversation for quiz sessions
      const conversationText = conversation_history
        .map(msg => msg.content)
        .join(' ');

      // Extract keywords using module title and conversation
      try {
        const keywordsResponse = await this.anchorChatPythonService.extractAnchorKeywords(
          module?.title || 'Quiz Module',
          quizSubject || 'Quiz Subject',
          conversationText,
        );

        keywords = keywordsResponse.keywords || [];
      } catch (error) {
        this.logger.warn('Keywords extraction failed, using fallback keywords:', error.message);
        // Fallback keywords based on module title and conversation
        keywords = [
          module?.title || 'Quiz Module',
          'quiz',
          'study',
          'preparation',
          ...conversationText.toLowerCase().split(' ').filter(word => word.length > 3).slice(0, 5)
        ];
      }

      // Get quiz information if available
      if (session.anchor_tag_id) {
        // If there's an anchor_tag_id, it might be a quiz group ID
        const QuizGroupModel = connection.model(QuizGroup.name, QuizGroupSchema);
        const quizGroup = await QuizGroupModel.findOne({
          _id: session.anchor_tag_id,
          deleted_at: null,
        });

        if (quizGroup) {
          quizSubject = quizGroup.subject || undefined;

          // Get quiz questions
          const QuizModel = connection.model(Quiz.name, QuizSchema);
          const questions = await QuizModel.find({
            quiz_group_id: session.anchor_tag_id,
            deleted_at: null,
          }).sort({ sequence: 1 });

          if (questions.length > 0) {
            quizQuestions = questions;
          }

          // Get user's last quiz attempt
          const StudentQuizAttemptModel = connection.model(StudentQuizAttempt.name, StudentQuizAttemptSchema);
          const lastQuizAttempt = await StudentQuizAttemptModel.findOne({
            student_id: student_id,
            quiz_group_id: session.anchor_tag_id,
          }).sort({ attempt_number: -1 });

          if (
            lastQuizAttempt &&
            lastQuizAttempt.answers &&
            lastQuizAttempt.answers.length > 0
          ) {
            userAnswers = lastQuizAttempt.answers.map((answer) => ({
              question_id: answer.quiz_id,
              user_answer: answer.selected_answers,
              time_spent_seconds: answer.time_spent_seconds,
              attempt_number: lastQuizAttempt.attempt_number,
              score_percentage: lastQuizAttempt.score_percentage,
              is_passed: lastQuizAttempt.is_passed,
              completed_at: lastQuizAttempt.completed_at,
            }));
          }
        }
      }

      // Provide fallback values if no quiz data is available
      const finalQuizSubject = quizSubject || module?.title || 'General Quiz';
      const finalQuizQuestions = quizQuestions || [];
      const finalUserAnswers = userAnswers || [];

      this.logger.log('📊 Quiz Resources Data:', {
        module_title: module?.title,
        quiz_subject: finalQuizSubject,
        quiz_questions_count: finalQuizQuestions.length,
        user_answers_count: finalUserAnswers.length,
        conversation_history_count: conversation_history.length,
        keywords_count: keywords.length
      });

      resourcesResponse = await this.anchorChatPythonService.getQuizResources(
        module?.title || 'Unknown Module',
        finalQuizSubject,
        finalQuizQuestions.length > 0 ? finalQuizQuestions : undefined,
        finalUserAnswers.length > 0 ? finalUserAnswers : undefined,
        conversation_history,
        keywords,
      );
    }

    const resourceData = {
      session_id: new Types.ObjectId(session_id),
      anchor_tag_id: session.anchor_tag_id ? new Types.ObjectId(session.anchor_tag_id) : null,
      module_id: new Types.ObjectId(session.module_id),
      student_id: new Types.ObjectId(student_id),
      resources: resourcesResponse.resources || [],
      recommendations: resourcesResponse.recommendations || '',
      total_found: resourcesResponse.total_found || 0,
      knowledge_available: resourcesResponse.knowledge_available || false,
      keywords_for_learning: keywords,
      anchor_context: session.anchor_context,
    };

    const resource = new AnchorChatResourceModel(resourceData);
    await resource.save();

    this.logger.log(
      `Anchor chat resource created with ID: ${resource._id} by user: ${user.id}`,
    );

    return resource;
  }

  async findResourcesBySessionId(
    session_id: string | Types.ObjectId,
    user: JWTUserPayload,
  ) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const AnchorChatResourceModel = connection.model(AnchorChatResource.name, AnchorChatResourceSchema);

    const resources = await AnchorChatResourceModel.find({
      session_id,
      deleted_at: null,
    })
      .sort({ created_at: -1 })
      .exec();

    return resources;
  }

  // ========== HELPER METHODS ==========

  private async updateSessionMessageCounts(
    session_id: string | Types.ObjectId,
    AnchorChatMessageModel: Model<AnchorChatMessage>,
    AnchorChatSessionModel: Model<AnchorChatSession>,
  ) {
    const [totalMessages, studentMessages, aiMessages] = await Promise.all([
      AnchorChatMessageModel.countDocuments({ session_id, deleted_at: null }),
      AnchorChatMessageModel.countDocuments({
        session_id,
        sender: AnchorChatMessageSenderEnum.STUDENT,
        deleted_at: null,
      }),
      AnchorChatMessageModel.countDocuments({
        session_id,
        sender: AnchorChatMessageSenderEnum.AI_RESOURCE_ADVISOR,
        deleted_at: null,
      }),
    ]);

    await AnchorChatSessionModel.updateOne(
      { _id: session_id },
      {
        total_messages: totalMessages,
        student_messages: studentMessages,
        ai_messages: aiMessages,
      },
    );
  }

  // ========== HELPER METHODS ==========

}
