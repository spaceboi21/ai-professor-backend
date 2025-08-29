import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { createPaginationResult } from 'src/common/utils/pagination.util';
import { School } from 'src/database/schemas/central/school.schema';
import { User } from 'src/database/schemas/central/user.schema';
import {
  AIChatFeedback,
  AIChatFeedbackSchema,
} from 'src/database/schemas/tenant/ai-chat-feedback.schema';
import {
  AIChatMessage,
  AIChatMessageSchema,
} from 'src/database/schemas/tenant/ai-chat-message.schema';
import {
  AIChatSession,
  AIChatSessionSchema,
} from 'src/database/schemas/tenant/ai-chat-session.schema';
import {
  AIResource,
  AIResourceSchema,
} from 'src/database/schemas/tenant/ai-resource.schema';
import {
  Module,
  ModuleSchema,
} from 'src/database/schemas/tenant/module.schema';
import {
  Student,
  StudentSchema,
} from 'src/database/schemas/tenant/student.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { CreateAISessionDto } from './dto/create-ai-session.dto';
import { AISessionStatusEnum } from 'src/common/constants/ai-chat-session.constant';
import { AISessionFilterDto } from './dto/ai-session-filter.dto';
import { CreateAIMessageDto } from './dto/create-ai-message.dto';
import { CreateAIFeedbackDto } from './dto/create-ai-feedback.dto';
import { CreateAIResourceDto } from './dto/create-ai-resource.dto';
import {
  MessageSenderEnum,
  MessageTypeEnum,
} from 'src/common/constants/ai-chat-message.constant';
import { PythonService } from './python.service';
import {
  ConversationHistoryType,
  ProfessorResourcesResponseType,
  SupervisorAnalysisResponseType,
} from 'src/common/types/ai-chat-module.type';
import { FeedbackTypeEnum } from 'src/common/constants/ai-chat-feedback.constant';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { DEFAULT_LANGUAGE } from 'src/common/constants/language.constant';

@Injectable()
export class AIChatService {
  private readonly logger = new Logger(AIChatService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly pythonService: PythonService,
    private readonly errorMessageService: ErrorMessageService,
  ) {}

  // ========== SESSION OPERATIONS ==========

  async createAISession(
    createAISessionDto: CreateAISessionDto,
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
    const AISessionModel = connection.model(
      AIChatSession.name,
      AIChatSessionSchema,
    );
    const ModuleModel = connection.model(Module.name, ModuleSchema);
    const AIChatMessageModel = connection.model(
      AIChatMessage.name,
      AIChatMessageSchema,
    );
    const StudentModel = connection.model(Student.name, StudentSchema);

    const { module_id } = createAISessionDto;
    const student_id = user.id; // Extract student ID from JWT token

    // Validate that the module exists
    const moduleExists = await ModuleModel.findOne({
      _id: module_id,
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
      module_id: new Types.ObjectId(module_id),
      student_id: new Types.ObjectId(student_id),
      created_by: new Types.ObjectId(user.id),
      created_by_role: user.role.name,
      status: AISessionStatusEnum.ACTIVE,
      started_at: new Date(),
      session_title: moduleExists.title,
      session_description: moduleExists.description,
      scenario: '',
    };

    // Start database transaction
    const dbSession = await connection.startSession();

    try {
      const response = await dbSession.withTransaction(async () => {
        const scenario = await this.pythonService.generatePatientScenario(
          moduleExists.title,
          moduleExists.description,
        );

        if (!scenario?.scenario) {
          throw new InternalServerErrorException(
            this.errorMessageService.getMessageWithLanguage(
              'AI_CHAT',
              'SCENARIO_GENERATION_FAILED',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }

        sessionData.scenario = scenario.scenario;

        // Create AI session within transaction
        const aiSession = new AISessionModel(sessionData);
        await aiSession.save({ session: dbSession });

        this.logger.log(
          `AI session created with ID: ${aiSession._id} by user: ${user.id}`,
        );

        // Python API call to create a conversation with the AI
        let response = await this.pythonService.startPatientSession(
          sessionData.session_title,
          sessionData.session_description,
          sessionData.scenario,
        );

        // Create AI chat message within transaction
        const message = await AIChatMessageModel.create(
          [
            {
              session_id: new Types.ObjectId(aiSession._id),
              module_id: new Types.ObjectId(module_id),
              student_id: new Types.ObjectId(student_id),
              sender: MessageSenderEnum.AI_PATIENT,
              message_type: MessageTypeEnum.TEXT,
              content: response.message,
              conversation_started: true,
              message_metadata: response?.metadata || null,
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

  async findAllAISessions(
    user: JWTUserPayload,
    filterDto?: AISessionFilterDto,
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
    const AISessionModel = connection.model(
      AIChatSession.name,
      AIChatSessionSchema,
    );
    // Register related models for populate
    connection.model(Module.name, ModuleSchema);
    connection.model(Student.name, StudentSchema);

    const filter: any = {
      deleted_at: null,
      student_id: new Types.ObjectId(user.id), // Automatically filter by authenticated user
    };

    // Apply filters
    if (filterDto?.module_id) {
      filter.module_id = new Types.ObjectId(filterDto.module_id);
    }
    if (filterDto?.status) {
      filter.status = filterDto.status;
    }

    const [sessions, total] = await Promise.all([
      AISessionModel.aggregate([
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
            from: 'ai_chat_message',
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
                        { $eq: ['$sender', MessageSenderEnum.STUDENT] },
                        1,
                        0,
                      ],
                    },
                  },
                  ai_messages: {
                    $sum: {
                      $cond: [
                        { $eq: ['$sender', MessageSenderEnum.AI_PATIENT] },
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
      AISessionModel.countDocuments(filter),
    ]);

    return createPaginationResult(sessions, total, paginationOptions);
  }

  async completeAISession(id: string | Types.ObjectId, user: JWTUserPayload) {
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
    const AISessionModel = connection.model(
      AIChatSession.name,
      AIChatSessionSchema,
    );

    // Find the session and validate it exists
    const session = await AISessionModel.findOne({
      _id: id,
      deleted_at: null,
    });

    if (!session) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'AI_CHAT',
          'SESSION_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Check if session is already completed
    if (session.status === AISessionStatusEnum.COMPLETED) {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'AI_CHAT',
          'SESSION_ALREADY_COMPLETED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Check if session is cancelled
    if (session.status === AISessionStatusEnum.CANCELLED) {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'AI_CHAT',
          'CANNOT_COMPLETE_CANCELLED_SESSION',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Update session to completed status with ended_at timestamp
    const updateData = {
      status: AISessionStatusEnum.COMPLETED,
      ended_at: new Date(),
      updated_at: new Date(),
    };

    await AISessionModel.findByIdAndUpdate(new Types.ObjectId(id), updateData);

    this.logger.log(`AI session completed with ID: ${id} by user: ${user.id}`);

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'AI_CHAT',
        'AI_SESSION_COMPLETED_SUCCESSFULLY',
        DEFAULT_LANGUAGE,
      ),
    };
  }

  // ========== MESSAGE OPERATIONS ==========

  async createAIMessage(
    createAIMessageDto: CreateAIMessageDto,
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
    const AIMessageModel = connection.model(
      AIChatMessage.name,
      AIChatMessageSchema,
    );
    const AISessionModel = connection.model(
      AIChatSession.name,
      AIChatSessionSchema,
    );

    const { session_id, module_id, message_type, content } = createAIMessageDto;
    const student_id = user.id; // Extract student ID from JWT token

    // Validate that the session exists and is active
    const session = await AISessionModel.findOne({
      _id: session_id,
      deleted_at: null,
    });
    if (!session) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'AI_CHAT',
          'SESSION_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    if (session.status !== AISessionStatusEnum.ACTIVE) {
      // throw new BadRequestException(
      //   this.errorMessageService.getMessageWithLanguage(
      //     'AI_CHAT',
      //     'CANNOT_ADD_MESSAGES_TO_INACTIVE_SESSION',
      //     user?.preferred_language || DEFAULT_LANGUAGE,
      //   ),
      // );
      session.status = AISessionStatusEnum.ACTIVE;
      await session.save();
    }

    const messageData = {
      session_id: new Types.ObjectId(session_id),
      module_id: new Types.ObjectId(module_id),
      student_id: new Types.ObjectId(student_id),
      sender: MessageSenderEnum.STUDENT,
      message_type,
      content,
    };

    const message = new AIMessageModel(messageData);
    await message.save();

    // Update session message counts
    await this.updateSessionMessageCounts(
      session_id,
      AIMessageModel,
      AISessionModel,
    );

    this.logger.log(
      `AI message created with ID: ${message._id} by user: ${user.id}`,
    );

    const conversation_history: ConversationHistoryType[] =
      await AIMessageModel.aggregate([
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

    const response = await this.pythonService.patientChat(
      messageData.content,
      conversation_history,
      session.session_title,
      session.session_description,
      session.scenario,
    );

    await AIMessageModel.create({
      session_id: new Types.ObjectId(session_id),
      module_id: new Types.ObjectId(module_id),
      student_id: new Types.ObjectId(student_id),
      sender: MessageSenderEnum.AI_PATIENT,
      message_type: MessageTypeEnum.TEXT,
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
    const AIMessageModel = connection.model(
      AIChatMessage.name,
      AIChatMessageSchema,
    );
    const AIChatFeedbackModel = connection.model(
      AIChatFeedback.name,
      AIChatFeedbackSchema,
    );
    const AIResourceModel = connection.model(AIResource.name, AIResourceSchema);
    const AISessionModel = connection.model(
      AIChatSession.name,
      AIChatSessionSchema,
    );

    // Fetch all data in parallel
    const [messages, supervisor_feedback, professor_resources, sessionDetails] = await Promise.all([
      AIMessageModel.find({
        session_id,
        deleted_at: null,
      }).sort({ created_at: 1 }).exec(),
      
      AIChatFeedbackModel.find({
        session_id,
        deleted_at: null,
      }).sort({ created_at: -1 }).exec(), // Get latest feedback first
      
      AIResourceModel.find({
        session_id,
        deleted_at: null,
      }).sort({ created_at: -1 }).exec(), // Get latest resources first
      
      AISessionModel.findOne({
        _id: session_id,
        deleted_at: null,
      }).lean()
    ]);

    // Create unified array with type indicators (excluding session details)
    const activities: any[] = [];

    // Add messages
    messages.forEach(message => {
      activities.push({
        type: 'message',
        created_at: message.created_at,
        data: message,
      });
    });

    // Add feedback
    supervisor_feedback.forEach(feedback => {
      activities.push({
        type: 'feedback',
        created_at: feedback.created_at,
        data: feedback,
      });
    });

    // Add resources
    professor_resources.forEach(resource => {
      activities.push({
        type: 'resource',
        created_at: resource.created_at,
        data: resource,
      });
    });

    // Sort all activities by created_at in ascending order
    activities.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return {
      activities,
      sessionDetails,
      total_count: activities.length,
      messages_count: messages.length,
      feedback_count: supervisor_feedback.length,
      resources_count: professor_resources.length,
    };
  }

  // ========== FEEDBACK OPERATIONS ==========

  async createAIFeedback(
    createAIFeedbackDto: CreateAIFeedbackDto,
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
    const AIFeedbackModel = connection.model(
      AIChatFeedback.name,
      AIChatFeedbackSchema,
    );
    const AISessionModel = connection.model(
      AIChatSession.name,
      AIChatSessionSchema,
    );
    const AIChatMessageModel = connection.model(
      AIChatMessage.name,
      AIChatMessageSchema,
    );

    const { session_id } = createAIFeedbackDto;
    const student_id = user.id; // Extract student ID from JWT token

    // Validate that the session exists
    const session = await AISessionModel.findOne({
      _id: session_id,
      // status: AISessionStatusEnum.COMPLETED,
      student_id: new Types.ObjectId(student_id),
      deleted_at: null,
    }).lean();
    if (!session) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'AI_CHAT',
          'SESSION_NOT_FOUND_OR_NOT_COMPLETED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Update session status to COMPLETED if it's not already
    if (session?.status !== AISessionStatusEnum.COMPLETED) {
      await AISessionModel.findByIdAndUpdate(new Types.ObjectId(session_id), {
        status: AISessionStatusEnum.COMPLETED,
      });
    }

    const conversation_history: ConversationHistoryType[] =
      await AIChatMessageModel.aggregate([
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

    const supervisorAnalysisResponse: SupervisorAnalysisResponseType =
      await this.pythonService.supervisorAnalyze(conversation_history);

    const feedbackData = {
      session_id: new Types.ObjectId(session_id),
      module_id: new Types.ObjectId(session.module_id),
      student_id: new Types.ObjectId(student_id),
      feedback_type: FeedbackTypeEnum.SUPERVISOR_ANALYSIS,
      rating: {
        overall_score: supervisorAnalysisResponse.overall_score,
        communication_score: supervisorAnalysisResponse.communication_score,
        clinical_score: supervisorAnalysisResponse.clinical_score,
        professionalism_score: supervisorAnalysisResponse.professionalism_score,
      },
      keywords_for_learning: supervisorAnalysisResponse.keywords_for_learning,
      suggestions: supervisorAnalysisResponse.suggestions,
      missed_opportunities: supervisorAnalysisResponse.missed_opportunities,
      areas_for_improvement: supervisorAnalysisResponse.areas_for_improvement,
      strengths: supervisorAnalysisResponse.strengths,
      skill_gaps: supervisorAnalysisResponse.skill_gaps,
    };

    const feedback = new AIFeedbackModel(feedbackData);
    await feedback.save();

    this.logger.log(
      `AI feedback created with ID: ${feedback._id} by user: ${user.id}`,
    );

    return feedback;
  }

  async findFeedbackBySessionId(
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
    const AIFeedbackModel = connection.model(
      AIChatFeedback.name,
      AIChatFeedbackSchema,
    );

    const feedback = await AIFeedbackModel.find({
      session_id: new Types.ObjectId(session_id),
      deleted_at: null,
    })
      .sort({ created_at: -1 })
      .exec();

    return feedback;
  }

  // ========== RESOURCE OPERATIONS ==========

  async createAIResource(
    createAIResourceDto: CreateAIResourceDto,
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
    const AIResourceModel = connection.model(AIResource.name, AIResourceSchema);
    const AISessionModel = connection.model(
      AIChatSession.name,
      AIChatSessionSchema,
    );

    const { session_id } = createAIResourceDto;
    const student_id = user.id; // Extract student ID from JWT token

    // Validate that the session exists
    const session = await AISessionModel.findOne({
      _id: new Types.ObjectId(session_id),
      deleted_at: null,
    });
    if (!session) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'AI_CHAT',
          'SESSION_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const supervisorAnalysisFeedback = await this.findFeedbackBySessionId(
      session_id,
      user,
    );

    if (supervisorAnalysisFeedback.length === 0) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'AI_CHAT',
          'SUPERVISOR_FEEDBACK_NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Use the latest feedback (first element after sorting by created_at desc) to generate resources
    const latestFeedback = supervisorAnalysisFeedback[0];

    const professorResources: ProfessorResourcesResponseType =
      await this.pythonService.professorResources(
        session.session_title,
        {
          areas_for_improvement: latestFeedback.areas_for_improvement,
          overall_score: latestFeedback.rating.overall_score,
          strengths: latestFeedback.strengths,
        },
        latestFeedback.keywords_for_learning,
      );

    console.log('professorResources', professorResources);

    const resourceData = {
      session_id: new Types.ObjectId(session_id),
      module_id: new Types.ObjectId(session.module_id),
      student_id: new Types.ObjectId(student_id),
      resources: professorResources.resources,
      recommendations: professorResources.recommendations,
      total_found: professorResources.total_found,
      knowledge_available: professorResources.knowledge_available,
      supervisor_feedback_id: new Types.ObjectId(latestFeedback._id),
    };

    const resource = new AIResourceModel(resourceData);
    await resource.save();

    this.logger.log(
      `AI resource created with ID: ${resource._id} by user: ${user.id}`,
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
    const AIResourceModel = connection.model(AIResource.name, AIResourceSchema);

    const resources = await AIResourceModel.find({
      session_id,
      deleted_at: null,
    })
      .sort({ created_at: -1 })
      .exec();

    return resources;
  }

  // ========== HELPER METHODS ==========

  private async validateSchoolAndGetConnection(user: JWTUserPayload) {
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

    return { school, connection };
  }

  private async updateSessionMessageCounts(
    session_id: string | Types.ObjectId,
    AIMessageModel: Model<AIChatMessage>,
    AISessionModel: Model<AIChatSession>,
  ) {
    const [totalMessages, studentMessages, aiMessages] = await Promise.all([
      AIMessageModel.countDocuments({ session_id, deleted_at: null }),
      AIMessageModel.countDocuments({
        session_id,
        sender: MessageSenderEnum.STUDENT,
        deleted_at: null,
      }),
      AIMessageModel.countDocuments({
        session_id,
        sender: {
          $in: [
            MessageSenderEnum.AI_PATIENT,
            MessageSenderEnum.AI_SUPERVISOR,
            MessageSenderEnum.AI_PROFESSOR,
          ],
        },
        deleted_at: null,
      }),
    ]);

    await AISessionModel.updateOne(
      { _id: session_id },
      {
        total_messages: totalMessages,
        student_messages: studentMessages,
        ai_messages: aiMessages,
      },
    );
  }
}
