import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import {
  ChatMessage,
  ChatMessageSchema,
} from 'src/database/schemas/tenant/chat-message.schema';
import { User } from 'src/database/schemas/central/user.schema';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { ChatConversationFilterDto } from './dto/chat-conversation-filter.dto';
import { ChatMessageResponseDto } from './dto/chat-message-response.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { RoleEnum, ROLE_IDS } from 'src/common/constants/roles.constant';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import {
  Student,
  StudentSchema,
} from 'src/database/schemas/tenant/student.schema';
import { School } from 'src/database/schemas/central/school.schema';
import { ErrorMessageService } from 'src/common/services/error-message.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  // TODO: commented for communicate with student to any other role
  // private readonly allowedCommunicationPatterns = [
  //   { sender: RoleEnum.PROFESSOR, receiver: RoleEnum.STUDENT },
  //   { sender: RoleEnum.STUDENT, receiver: RoleEnum.PROFESSOR },
  //   { sender: RoleEnum.STUDENT, receiver: RoleEnum.SCHOOL_ADMIN },
  //   { sender: RoleEnum.SCHOOL_ADMIN, receiver: RoleEnum.STUDENT },
  //   { sender: RoleEnum.PROFESSOR, receiver: RoleEnum.SCHOOL_ADMIN },
  //   { sender: RoleEnum.SCHOOL_ADMIN, receiver: RoleEnum.PROFESSOR },
  //   { sender: RoleEnum.SUPER_ADMIN, receiver: RoleEnum.SCHOOL_ADMIN },
  //   { sender: RoleEnum.SCHOOL_ADMIN, receiver: RoleEnum.SUPER_ADMIN },
  //   { sender: RoleEnum.SUPER_ADMIN, receiver: RoleEnum.PROFESSOR },
  //   { sender: RoleEnum.PROFESSOR, receiver: RoleEnum.SUPER_ADMIN },
  //   { sender: RoleEnum.SUPER_ADMIN, receiver: RoleEnum.STUDENT },
  //   { sender: RoleEnum.STUDENT, receiver: RoleEnum.SUPER_ADMIN },
  // ];

  constructor(
    @InjectModel(ChatMessage.name)
    private readonly chatMessageModel: Model<ChatMessage>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly errorMessageService: ErrorMessageService,
  ) {}

  async createMessage(
    createChatMessageDto: CreateChatMessageDto,
    currentUser: JWTUserPayload,
  ): Promise<ChatMessageResponseDto> {
    this.logger.log(
      `Creating message from ${currentUser.id} to ${createChatMessageDto.receiver_id}`,
    );

    if (!currentUser?.school_id) {
      throw new BadRequestException(
        this.errorMessageService.getMessage(
          'CHAT',
          'SCHOOL_ID_REQUIRED',
          currentUser,
        ),
      );
    }

    // Validate school and get connection
    const connection = await this.getTenantConnection(
      currentUser.school_id.toString(),
    );

    // Validate receiver based on their role
    const receiver = await this.validateReceiver(
      createChatMessageDto,
      connection,
    );

    // Validate communication rules
    // TODO: commented for communicate with student to any other role
    // this.validateCommunicationRules(
    //   currentUser.role.name,
    //   createChatMessageDto.receiver_role,
    // );

    // Create and save message
    const message = await this.saveMessage(
      createChatMessageDto,
      currentUser,
      connection,
    );

    this.logger.log(`Message saved successfully: ${message._id}`);
    return this.mapToResponseDto(message);
  }

  private async getConversations(
    currentUser: JWTUserPayload,
    filter: ChatConversationFilterDto,
  ): Promise<{ conversations: any[]; total: number }> {
    const { page = 1, limit = 20, user_id, user_role } = filter;

    // Ensure limit and skip are numbers
    const numericLimit = Number(limit);
    const numericPage = Number(page);

    // Validate numeric values
    if (isNaN(numericLimit) || numericLimit < 1 || numericLimit > 100) {
      throw new BadRequestException(
        this.errorMessageService.getMessage(
          'CHAT',
          'LIMIT_VALIDATION',
          currentUser,
        ),
      );
    }

    if (isNaN(numericPage) || numericPage < 1) {
      throw new BadRequestException(
        this.errorMessageService.getMessage(
          'CHAT',
          'PAGE_VALIDATION',
          currentUser,
        ),
      );
    }

    const skip = (numericPage - 1) * numericLimit;
    const currentUserId = new Types.ObjectId(currentUser.id);

    if (!currentUser?.school_id) {
      throw new BadRequestException(
        this.errorMessageService.getMessage(
          'CHAT',
          'SCHOOL_ID_REQUIRED',
          currentUser,
        ),
      );
    }

    const connection = await this.getTenantConnection(
      currentUser.school_id.toString(),
    );

    const chatMessageModel = connection.model(
      ChatMessage.name,
      ChatMessageSchema,
    );

    const pipeline = this.buildConversationPipeline(
      currentUserId,
      user_id,
      user_role,
      skip,
      numericLimit,
    );

    const [conversations, totalResult] = await Promise.all([
      chatMessageModel.aggregate(pipeline),
      chatMessageModel.aggregate([
        ...pipeline.slice(0, -3),
        { $count: 'total' },
      ]),
    ]);

    return {
      conversations: this.formatConversations(conversations),
      total: totalResult[0]?.total || 0,
    };
  }

  async getMessages(
    currentUser: JWTUserPayload,
    otherUserId: string,
    page = 1,
    limit = 50,
  ): Promise<{ messages: ChatMessageResponseDto[]; total: number }> {
    const currentUserId = new Types.ObjectId(currentUser.id);
    const otherUserObjectId = new Types.ObjectId(otherUserId);

    // Ensure page and limit are numbers
    const numericPage = Number(page);
    const numericLimit = Number(limit);

    // Validate numeric values
    if (isNaN(numericLimit) || numericLimit < 1 || numericLimit > 100) {
      throw new BadRequestException(
        this.errorMessageService.getMessage(
          'CHAT',
          'LIMIT_VALIDATION',
          currentUser,
        ),
      );
    }

    if (isNaN(numericPage) || numericPage < 1) {
      throw new BadRequestException(
        this.errorMessageService.getMessage(
          'CHAT',
          'PAGE_VALIDATION',
          currentUser,
        ),
      );
    }

    const skip = (numericPage - 1) * numericLimit;

    if (!currentUser?.school_id) {
      throw new BadRequestException(
        this.errorMessageService.getMessage(
          'CHAT',
          'SCHOOL_ID_REQUIRED',
          currentUser,
        ),
      );
    }

    const connection = await this.getTenantConnection(
      currentUser.school_id.toString(),
    );

    const chatMessageModel = connection.model(
      ChatMessage.name,
      ChatMessageSchema,
    );

    const [messages, total] = await Promise.all([
      chatMessageModel
        .find(this.buildMessageQuery(currentUserId, otherUserObjectId))
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(numericLimit)
        .lean(),
      chatMessageModel.countDocuments(
        this.buildMessageQuery(currentUserId, otherUserObjectId),
      ),
    ]);

    // Mark messages as read
    await this.markMessagesAsRead(currentUserId, otherUserObjectId, connection);

    return {
      messages: messages.map((msg) => this.mapToResponseDto(msg)),
      total,
    };
  }

  async markMessagesAsRead(
    currentUserId: Types.ObjectId,
    otherUserId: Types.ObjectId,
    connection: Connection,
  ): Promise<void> {
    const chatMessageModel = connection.model(
      ChatMessage.name,
      ChatMessageSchema,
    );

    // First, let's check how many unread messages exist
    const query = {
      sender_id: otherUserId,
      receiver_id: currentUserId,
      is_read: false,
      deleted_at: null,
    };

    const unreadCount = await chatMessageModel.countDocuments(query);

    this.logger.log(`Found ${unreadCount} unread messages to mark as read`);

    if (unreadCount === 0) {
      this.logger.log('No unread messages found to update');
      return;
    }

    const result = await chatMessageModel.updateMany(query, {
      $set: {
        is_read: true,
        read_at: new Date(),
      },
    });

    this.logger.log(
      `Matched ${result.matchedCount} messages, modified ${result.modifiedCount} messages`,
    );
  }

  async deleteMessage(
    messageId: string,
    currentUser: JWTUserPayload,
  ): Promise<void> {
    if (!currentUser?.school_id) {
      throw new BadRequestException(
        this.errorMessageService.getMessage(
          'CHAT',
          'SCHOOL_ID_REQUIRED',
          currentUser,
        ),
      );
    }

    const connection = await this.getTenantConnection(
      currentUser.school_id.toString(),
    );

    const chatMessageModel = connection.model(
      ChatMessage.name,
      ChatMessageSchema,
    );

    const message = await chatMessageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException(
        this.errorMessageService.getMessage(
          'CHAT',
          'MESSAGE_NOT_FOUND',
          currentUser,
        ),
      );
    }

    if (message.sender_id.toString() !== currentUser.id) {
      throw new ForbiddenException(
        this.errorMessageService.getMessage(
          'CHAT',
          'CAN_ONLY_DELETE_OWN',
          currentUser,
        ),
      );
    }

    await chatMessageModel.findByIdAndUpdate(messageId, {
      deleted_at: new Date(),
      deleted_by: new Types.ObjectId(currentUser.id),
    });
  }

  // Private helper methods
  async getTenantConnection(schoolId: string) {
    const school = await this.schoolModel.findById(schoolId);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessage(
          'SCHOOL',
          'NOT_FOUND',
          {} as JWTUserPayload,
        ),
      );
    }
    return this.tenantConnectionService.getTenantConnection(school.db_name);
  }

  private async validateReceiver(
    createChatMessageDto: CreateChatMessageDto,
    connection: any,
  ): Promise<User | Student> {
    let receiver: User | Student | null = null;

    if (createChatMessageDto.receiver_role === RoleEnum.STUDENT) {
      // Students are in tenant database
      const StudentModel = connection.model(Student.name, StudentSchema);
      receiver = await StudentModel.findById(
        new Types.ObjectId(createChatMessageDto.receiver_id),
      );
    } else if (createChatMessageDto.receiver_role === RoleEnum.PROFESSOR) {
      // Professors are in central database
      receiver = await this.userModel.findById(
        createChatMessageDto.receiver_id,
      );
    } else {
      throw new BadRequestException(
        this.errorMessageService.getMessage(
          'CHAT',
          'INVALID_RECEIVER_ROLE',
          {} as JWTUserPayload,
        ),
      );
    }

    if (!receiver) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithParams(
          'CHAT',
          'RECEIVER_NOT_FOUND',
          { role: createChatMessageDto.receiver_role },
          {} as JWTUserPayload,
        ),
      );
    }

    return receiver;
  }

  // TODO: commented for communicate with student to any other role
  // private validateCommunicationRules(
  //   senderRole: RoleEnum,
  //   receiverRole: RoleEnum,
  // ): void {
  //   const isAllowed = this.allowedCommunicationPatterns.some(
  //     (pattern) =>
  //       pattern.sender === senderRole && pattern.receiver === receiverRole,
  //   );

  // TODO: commented for communicate with student to any other role
  //   if (!isAllowed) {
  //     throw new ForbiddenException(
  //       `Communication between ${senderRole} and ${receiverRole} is not allowed`,
  //     );
  //   }
  // }

  private async saveMessage(
    createChatMessageDto: CreateChatMessageDto,
    currentUser: JWTUserPayload,
    connection: any,
  ): Promise<ChatMessage> {
    const chatMessageModel = connection.model(
      ChatMessage.name,
      ChatMessageSchema,
    );

    const message = new chatMessageModel({
      sender_id: new Types.ObjectId(currentUser.id),
      receiver_id: new Types.ObjectId(createChatMessageDto.receiver_id),
      sender_role: currentUser.role.name,
      receiver_role: createChatMessageDto.receiver_role,
      message: createChatMessageDto.message,
    });

    return message.save();
  }

  private buildConversationPipeline(
    currentUserId: Types.ObjectId,
    user_id?: string,
    user_role?: string,
    skip = 0,
    limit = 20,
  ): any[] {
    const pipeline: any[] = [
      {
        $match: {
          $or: [{ sender_id: currentUserId }, { receiver_id: currentUserId }],
          deleted_at: null,
        },
      },
      // For now, we'll use a simplified approach since we can't easily join across databases
      // In a real implementation, you might want to:
      // 1. Store user details in the message itself
      // 2. Use a separate service to fetch user details
      // 3. Handle the joins in application code
      {
        $addFields: {
          // Add basic user info that we can derive from the message
          sender_info: {
            _id: '$sender_id',
            role: '$sender_role',
          },
          receiver_info: {
            _id: '$receiver_id',
            role: '$receiver_role',
          },
        },
      },
      {
        $addFields: {
          other_user: {
            $cond: {
              if: { $eq: ['$sender_id', currentUserId] },
              then: '$receiver_info',
              else: '$sender_info',
            },
          },
          other_user_role: {
            $cond: {
              if: { $eq: ['$sender_id', currentUserId] },
              then: '$receiver_role',
              else: '$sender_role',
            },
          },
        },
      },
      {
        $group: {
          _id: '$other_user._id',
          last_message: { $last: '$$ROOT' },
          unread_count: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver_id', currentUserId] },
                    { $eq: ['$is_read', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              '$last_message',
              {
                conversation_user: '$last_message.other_user',
                conversation_user_role: '$last_message.other_user_role',
                unread_count: '$unread_count',
              },
            ],
          },
        },
      },
    ];

    // Add filters
    if (user_id) {
      pipeline.unshift({
        $match: {
          $or: [
            { sender_id: new Types.ObjectId(user_id) },
            { receiver_id: new Types.ObjectId(user_id) },
          ],
        },
      });
    }

    if (user_role) {
      pipeline.unshift({
        $match: {
          $or: [{ sender_role: user_role }, { receiver_role: user_role }],
        },
      });
    }

    // Add sorting and pagination
    pipeline.push(
      { $sort: { created_at: -1 } },
      { $skip: skip },
      { $limit: limit },
    );

    return pipeline;
  }

  private formatConversations(conversations: any[]): any[] {
    return conversations.map((conv) => ({
      conversation_user: {
        _id: conv.conversation_user._id,
        role: conv.conversation_user.role,
        // Note: Full user details would need to be fetched separately
        // since we can't easily join across databases
      },
      conversation_user_role: conv.conversation_user_role,
      last_message: {
        _id: conv._id,
        message: conv.message,
        created_at: conv.created_at,
        is_read: conv.is_read,
      },
      unread_count: conv.unread_count,
    }));
  }

  // Method to fetch user details from the correct database
  async getUserDetails(
    userId: string,
    userRole: string,
    schoolId?: string,
  ): Promise<any> {
    if (userRole === RoleEnum.STUDENT) {
      // Students are in tenant database
      if (!schoolId) {
        throw new BadRequestException('School ID required to fetch student details');
      }

      const connection = await this.getTenantConnection(schoolId);
      const StudentModel = connection.model(Student.name, StudentSchema);

      const student = await StudentModel.findById(userId)
        .select('first_name last_name email')
        .lean();

      return student
        ? {
            _id: student._id,
            first_name: student.first_name,
            last_name: student.last_name,
            email: student.email,
            role: RoleEnum.STUDENT,
          }
        : null;
    } else {
      // Professors and other roles are in central database
      const user = await this.userModel
        .findById(userId)
        .select('first_name last_name email')
        .lean();

      return user
        ? {
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            role: userRole,
          }
        : null;
    }
  }

  // Enhanced method to get conversations with full user details
  async getConversationsWithUserDetails(
    currentUser: JWTUserPayload,
    filter: ChatConversationFilterDto,
  ): Promise<{ conversations: any[]; total: number }> {
    const { conversations, total } = await this.getConversations(
      currentUser,
      filter,
    );

    // Fetch user details for each conversation
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        const userDetails = await this.getUserDetails(
          conv.conversation_user._id,
          conv.conversation_user_role,
          currentUser.school_id?.toString(),
        );

        return {
          ...conv,
          conversation_user: userDetails || conv.conversation_user,
        };
      }),
    );

    return {
      conversations: conversationsWithDetails,
      total,
    };
  }

  private buildMessageQuery(
    currentUserId: Types.ObjectId,
    otherUserObjectId: Types.ObjectId,
  ) {
    return {
      $or: [
        { sender_id: currentUserId, receiver_id: otherUserObjectId },
        { sender_id: otherUserObjectId, receiver_id: currentUserId },
      ],
      deleted_at: null,
    };
  }

  private async validateUserExists(userId: string): Promise<void> {
    // Check both central and tenant databases
    const [centralUser, tenantUser] = await Promise.all([
      this.userModel.findById(userId),
      this.findUserInTenantDatabases(userId),
    ]);

    if (!centralUser && !tenantUser) {
      throw new NotFoundException(
        this.errorMessageService.getMessage(
          'CHAT',
          'USER_NOT_FOUND',
          {} as JWTUserPayload,
        ),
      );
    }
  }

  private async findUserInTenantDatabases(userId: string): Promise<any> {
    // This is a simplified version - in a real implementation,
    // you might want to check all tenant databases or have a mapping
    try {
      // For now, we'll assume the user exists if we can't find them in central DB
      // In a real implementation, you'd check tenant databases based on school_id
      return null;
    } catch (error) {
      return null;
    }
  }

  private mapToResponseDto(message: any): ChatMessageResponseDto {
    return {
      _id: message._id.toString(),
      sender_id: message.sender_id.toString(),
      receiver_id: message.receiver_id.toString(),
      sender_role: message.sender_role,
      receiver_role: message.receiver_role,
      message: message.message,
      is_read: message.is_read,
      read_at: message.read_at,
      created_at: message.created_at,
      updated_at: message.updated_at,
    };
  }

  async searchUsers(
    currentUser: JWTUserPayload,
    searchParams: SearchUsersDto,
  ): Promise<{ users: any[]; total: number }> {
    this.logger.log(`Searching users for school: ${currentUser.school_id}`);

    if (!currentUser?.school_id) {
      throw new BadRequestException('School ID is required');
    }

    const { search = '', role, page = 1, limit = 20 } = searchParams;

    // Validate numeric values
    const numericPage = Number(page);
    const numericLimit = Number(limit);

    if (isNaN(numericLimit) || numericLimit < 1 || numericLimit > 100) {
      throw new BadRequestException('Limit must be a number between 1 and 100');
    }

    if (isNaN(numericPage) || numericPage < 1) {
      throw new BadRequestException('Page must be a number greater than 0');
    }

    const skip = (numericPage - 1) * numericLimit;

    // Get tenant connection for students
    const connection = await this.getTenantConnection(
      currentUser.school_id.toString(),
    );

    const StudentModel = connection.model(Student.name, StudentSchema);

    // Build search query for students
    const studentQuery: any = {
      deleted_at: null,
      _id: { $ne: new Types.ObjectId(currentUser.id) }, // Exclude current user
    };

    if (search) {
      studentQuery.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Build search query for professors (central database) - only PROFESSOR role
    const professorQuery: any = {
      deleted_at: null,
      role: new Types.ObjectId(ROLE_IDS.PROFESSOR), // Role is stored as ObjectId
      _id: { $ne: new Types.ObjectId(currentUser.id) }, // Exclude current user
    };



    if (search) {
      professorQuery.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (role && role === RoleEnum.STUDENT) {
      // If role is STUDENT, only search students
      const [students, totalStudents] = await Promise.all([
        StudentModel.find(studentQuery)
          .select('first_name last_name email')
          .skip(skip)
          .limit(numericLimit)
          .lean(),
        StudentModel.countDocuments(studentQuery),
      ]);

      const formattedStudents = students.map((student) => ({
        conversation_user: {
          _id: student._id,
          first_name: student.first_name,
          last_name: student.last_name,
          email: student.email,
          role: RoleEnum.STUDENT,
        },
        conversation_user_role: RoleEnum.STUDENT,
      }));

      return {
        users: formattedStudents,
        total: totalStudents,
      };
    }

    if (role && role === RoleEnum.PROFESSOR) {
      // If role is PROFESSOR, only search professors
      const [professors, totalProfessors] = await Promise.all([
        this.userModel
          .find(professorQuery)
          .select('first_name last_name email role')
          .skip(skip)
          .limit(numericLimit)
          .lean(),
        this.userModel.countDocuments(professorQuery),
      ]);



      const formattedProfessors = professors.map((professor) => ({
        conversation_user: {
          _id: professor._id,
          first_name: professor.first_name,
          last_name: professor.last_name,
          email: professor.email,
          role: RoleEnum.PROFESSOR, // Map to PROFESSOR enum
        },
        conversation_user_role: RoleEnum.PROFESSOR,
      }));

      return {
        users: formattedProfessors,
        total: totalProfessors,
      };
    }

    // If no role specified, search both students and professors with proper pagination
    // First, get total counts to determine how to split the limit
    const [totalStudents, totalProfessors] = await Promise.all([
      StudentModel.countDocuments(studentQuery),
      this.userModel.countDocuments(professorQuery),
    ]);

    // Calculate how many to fetch from each database
    const totalAvailable = totalStudents + totalProfessors;
    const remainingLimit = numericLimit;
    
    // Fetch more than needed from each to ensure we get enough after sorting
    const fetchLimit = Math.min(remainingLimit * 2, Math.max(totalStudents, totalProfessors));
    
    const [students, professors] = await Promise.all([
      StudentModel.find(studentQuery)
        .select('first_name last_name email')
        .limit(fetchLimit)
        .lean(),
      this.userModel
        .find(professorQuery)
        .select('first_name last_name email role')
        .limit(fetchLimit)
        .lean(),
    ]);

    const formattedStudents = students.map((student) => ({
      conversation_user: {
        _id: student._id,
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        role: RoleEnum.STUDENT,
      },
      conversation_user_role: RoleEnum.STUDENT,
    }));

    const formattedProfessors = professors.map((professor) => ({
      conversation_user: {
        _id: professor._id,
        first_name: professor.first_name,
        last_name: professor.last_name,
        email: professor.email,
        role: RoleEnum.PROFESSOR, // Map to PROFESSOR enum
      },
      conversation_user_role: RoleEnum.PROFESSOR,
    }));

    // Combine and sort by name
    const allUsers = [...formattedStudents, ...formattedProfessors].sort(
      (a, b) => {
        const nameA =
          `${a.conversation_user.first_name} ${a.conversation_user.last_name}`.toLowerCase();
        const nameB =
          `${b.conversation_user.first_name} ${b.conversation_user.last_name}`.toLowerCase();
        return nameA.localeCompare(nameB);
      },
    );

    // Apply pagination to the combined and sorted results
    const paginatedUsers = allUsers.slice(skip, skip + numericLimit);

    return {
      users: paginatedUsers,
      total: totalAvailable,
    };
  }
}
