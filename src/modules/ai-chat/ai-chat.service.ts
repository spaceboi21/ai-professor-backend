import {
  BadRequestException,
  Injectable,
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
import { UpdateAISessionDto } from './dto/update-ai-session.dto';
import { AISessionStatusEnum } from 'src/common/constants/ai-chat-session.constant';
import { AISessionFilterDto } from './dto/ai-session-filter.dto';
import { CreateAIMessageDto } from './dto/create-ai-message.dto';
import { CreateAIFeedbackDto } from './dto/create-ai-feedback.dto';
import { CreateAIResourceDto } from './dto/create-ai-resource.dto';
import { MessageSenderEnum } from 'src/common/constants/ai-chat-message.constant';

@Injectable()
export class AIChatService {
  private readonly logger = new Logger(AIChatService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {}

  // ========== SESSION OPERATIONS ==========

  async createAISession(
    createAISessionDto: CreateAISessionDto,
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
    const AISessionModel = connection.model(
      AIChatSession.name,
      AIChatSessionSchema,
    );
    const ModuleModel = connection.model(Module.name, ModuleSchema);
    const StudentModel = connection.model(Student.name, StudentSchema);

    const { module_id, session_title, session_description } =
      createAISessionDto;
    const student_id = user.id; // Extract student ID from JWT token

    // Validate that the module exists
    const moduleExists = await ModuleModel.findOne({
      _id: module_id,
      deleted_at: null,
    });
    if (!moduleExists) {
      throw new NotFoundException('Module not found');
    }

    // Validate that the student exists
    const studentExists = await StudentModel.findOne({
      _id: student_id,
      deleted_at: null,
    });
    if (!studentExists) {
      throw new NotFoundException('Student not found');
    }

    const sessionData = {
      module_id: new Types.ObjectId(module_id),
      student_id: new Types.ObjectId(student_id),
      created_by: new Types.ObjectId(user.id),
      created_by_role: user.role.name,
      status: AISessionStatusEnum.ACTIVE,
      started_at: new Date(),
      session_title:
        session_title || `AI Practice Session - ${moduleExists.title}`,
      session_description:
        session_description || `AI practice session for ${moduleExists.title}`,
    };

    const session = new AISessionModel(sessionData);
    await session.save();

    this.logger.log(
      `AI session created with ID: ${session._id} by user: ${user.id}`,
    );

    return session;
  }

  async findAllAISessions(
    user: JWTUserPayload,
    filterDto?: AISessionFilterDto,
    paginationOptions?: any,
  ) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
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
      AISessionModel.find(filter)
        .sort({ created_at: -1 })
        .populate('module_id', 'title subject description')
        .populate('student_id', 'first_name last_name email')
        .skip(paginationOptions?.skip || 0)
        .limit(paginationOptions?.limit || 10)
        .exec(),
      AISessionModel.countDocuments(filter),
    ]);

    return createPaginationResult(sessions, total, paginationOptions);
  }

  async findAISessionById(id: string | Types.ObjectId, user: JWTUserPayload) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
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

    const session = await AISessionModel.findOne({
      _id: id,
      deleted_at: null,
    })
      .populate('module_id', 'title subject description')
      .populate('student_id', 'first_name last_name email')
      .exec();

    if (!session) {
      throw new NotFoundException('AI session not found');
    }

    return session;
  }

  async updateAISession(
    id: string | Types.ObjectId,
    updateAISessionDto: UpdateAISessionDto,
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
    const AISessionModel = connection.model(
      AIChatSession.name,
      AIChatSessionSchema,
    );

    const session = await AISessionModel.findOne({
      _id: id,
      deleted_at: null,
    });

    if (!session) {
      throw new NotFoundException('AI session not found');
    }

    // If status is being updated to completed, set ended_at
    if (
      updateAISessionDto.status === AISessionStatusEnum.COMPLETED &&
      !session.ended_at
    ) {
      updateAISessionDto.ended_at = new Date();
    }

    Object.assign(session, updateAISessionDto);
    await session.save();

    this.logger.log(`AI session updated with ID: ${id} by user: ${user.id}`);

    return session;
  }

  async completeAISession(id: string | Types.ObjectId, user: JWTUserPayload) {
    return this.updateAISession(
      id,
      { status: AISessionStatusEnum.COMPLETED },
      user,
    );
  }

  async removeAISession(id: string | Types.ObjectId, user: JWTUserPayload) {
    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const AISessionModel = connection.model(
      AIChatSession.name,
      AIChatSessionSchema,
    );

    const session = await AISessionModel.findOne({
      _id: id,
      deleted_at: null,
    });

    if (!session) {
      throw new NotFoundException('AI session not found');
    }

    await AISessionModel.updateOne({ _id: id }, { deleted_at: new Date() });

    this.logger.log(
      `AI session soft deleted with ID: ${id} by user: ${user.id}`,
    );

    return { message: 'AI session deleted successfully' };
  }

  // ========== MESSAGE OPERATIONS ==========

  async createAIMessage(
    createAIMessageDto: CreateAIMessageDto,
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
    const AIMessageModel = connection.model(
      AIChatMessage.name,
      AIChatMessageSchema,
    );
    const AISessionModel = connection.model(
      AIChatSession.name,
      AIChatSessionSchema,
    );

    const {
      session_id,
      module_id,
      sender,
      message_type,
      content,
      attachments,
      sequence,
    } = createAIMessageDto;
    const student_id = user.id; // Extract student ID from JWT token

    // Validate that the session exists and is active
    const session = await AISessionModel.findOne({
      _id: session_id,
      deleted_at: null,
    });
    if (!session) {
      throw new NotFoundException('AI session not found');
    }

    if (session.status !== AISessionStatusEnum.ACTIVE) {
      throw new BadRequestException('Cannot add messages to inactive session');
    }

    // Generate sequence if not provided
    let finalSequence = sequence;
    if (!finalSequence) {
      finalSequence = await this.getNextMessageSequence(session_id, user);
    }

    const messageData = {
      session_id: new Types.ObjectId(session_id),
      module_id: new Types.ObjectId(module_id),
      student_id: new Types.ObjectId(student_id),
      created_by: new Types.ObjectId(user.id),
      created_by_role: user.role.name,
      sender,
      message_type,
      content,
      attachments: attachments || [],
      sequence: finalSequence,
    };

    const message = new AIMessageModel(messageData);
    await message.save();

    // Update session message counts
    await this.updateSessionMessageCounts(session_id, user);

    this.logger.log(
      `AI message created with ID: ${message._id} by user: ${user.id}`,
    );

    return message;
  }

  async findMessagesBySessionId(
    session_id: string | Types.ObjectId,
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
    const AIMessageModel = connection.model(
      AIChatMessage.name,
      AIChatMessageSchema,
    );

    const messages = await AIMessageModel.find({
      session_id,
      deleted_at: null,
    })
      .sort({ sequence: 1, created_at: 1 })
      .exec();

    return messages;
  }

  // ========== FEEDBACK OPERATIONS ==========

  async createAIFeedback(
    createAIFeedbackDto: CreateAIFeedbackDto,
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
    const AIFeedbackModel = connection.model(
      AIChatFeedback.name,
      AIChatFeedbackSchema,
    );
    const AISessionModel = connection.model(
      AIChatSession.name,
      AIChatSessionSchema,
    );

    const {
      session_id,
      module_id,
      feedback_type,
      title,
      content,
      rating,
      keywords,
      mistakes,
      strengths,
      areas_for_improvement,
      analysis_data,
    } = createAIFeedbackDto;
    const student_id = user.id; // Extract student ID from JWT token

    // Validate that the session exists
    const session = await AISessionModel.findOne({
      _id: session_id,
      deleted_at: null,
    });
    if (!session) {
      throw new NotFoundException('AI session not found');
    }

    const feedbackData = {
      session_id: new Types.ObjectId(session_id),
      module_id: new Types.ObjectId(module_id),
      student_id: new Types.ObjectId(student_id),
      created_by: new Types.ObjectId(user.id),
      created_by_role: user.role.name,
      feedback_type,
      title,
      content,
      rating,
      keywords: keywords || [],
      mistakes: mistakes || [],
      strengths: strengths || [],
      areas_for_improvement: areas_for_improvement || [],
      analysis_data: analysis_data || {},
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
      throw new NotFoundException('School not found');
    }

    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const AIFeedbackModel = connection.model(
      AIChatFeedback.name,
      AIChatFeedbackSchema,
    );

    const feedback = await AIFeedbackModel.find({
      session_id,
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
      throw new NotFoundException('School not found');
    }

    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const AIResourceModel = connection.model(AIResource.name, AIResourceSchema);
    const AISessionModel = connection.model(
      AIChatSession.name,
      AIChatSessionSchema,
    );

    const {
      session_id,
      module_id,
      title,
      description,
      resource_type,
      category,
      url,
      tags,
      keywords,
      related_mistakes,
      duration_minutes,
      author,
      source,
      difficulty_level,
      is_recommended,
    } = createAIResourceDto;
    const student_id = user.id; // Extract student ID from JWT token

    // Validate that the session exists
    const session = await AISessionModel.findOne({
      _id: session_id,
      deleted_at: null,
    });
    if (!session) {
      throw new NotFoundException('AI session not found');
    }

    const resourceData = {
      session_id: new Types.ObjectId(session_id),
      module_id: new Types.ObjectId(module_id),
      student_id: new Types.ObjectId(student_id),
      created_by: new Types.ObjectId(user.id),
      created_by_role: user.role.name,
      title,
      description,
      resource_type,
      category,
      url,
      tags: tags || [],
      keywords: keywords || [],
      related_mistakes: related_mistakes || [],
      duration_minutes: duration_minutes || 0,
      author: author || null,
      source: source || null,
      difficulty_level: difficulty_level || 0,
      is_recommended: is_recommended || false,
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
      throw new NotFoundException('School not found');
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

  async markResourceAsAccessed(
    resource_id: string | Types.ObjectId,
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
    const AIResourceModel = connection.model(AIResource.name, AIResourceSchema);

    const resource = await AIResourceModel.findOne({
      _id: resource_id,
      deleted_at: null,
    });

    if (!resource) {
      throw new NotFoundException('AI resource not found');
    }

    resource.is_accessed = true;
    resource.accessed_at = new Date();
    resource.access_count += 1;
    await resource.save();

    this.logger.log(
      `AI resource marked as accessed with ID: ${resource_id} by user: ${user.id}`,
    );

    return resource;
  }

  // ========== HELPER METHODS ==========

  private async getNextMessageSequence(
    session_id: string | Types.ObjectId,
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
    const AIMessageModel = connection.model(
      AIChatMessage.name,
      AIChatMessageSchema,
    );

    const lastMessage = await AIMessageModel.findOne({
      session_id,
      deleted_at: null,
    })
      .sort({ sequence: -1 })
      .exec();

    return lastMessage ? lastMessage.sequence + 1 : 1;
  }

  private async updateSessionMessageCounts(
    session_id: string | Types.ObjectId,
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
    const AIMessageModel = connection.model(
      AIChatMessage.name,
      AIChatMessageSchema,
    );
    const AISessionModel = connection.model(
      AIChatSession.name,
      AIChatSessionSchema,
    );

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
