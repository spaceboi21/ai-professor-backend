import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { AIChatService } from './ai-chat.service';
import { CreateAISessionDto } from './dto/create-ai-session.dto';
import { CreateAIMessageDto } from './dto/create-ai-message.dto';
import { CreateAIFeedbackDto } from './dto/create-ai-feedback.dto';
import { CreateAIResourceDto } from './dto/create-ai-resource.dto';
import { AISessionFilterDto } from './dto/ai-session-filter.dto';
import { AISessionResponseDto } from './dto/ai-session-response.dto';
import { AIMessageResponseDto } from './dto/ai-message-response.dto';
import { AIFeedbackResponseDto } from './dto/ai-feedback-response.dto';
import { AIResourceResponseDto } from './dto/ai-resource-response.dto';
import { getPaginationOptions } from 'src/common/utils/pagination.util';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { User } from 'src/common/decorators/user.decorator';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { AISessionStatusEnum } from 'src/common/constants/ai-chat-session.constant';

@ApiTags('AI Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('ai-chat')
export class AIChatController {
  constructor(private readonly aiChatService: AIChatService) {}

  // ========== SESSION ENDPOINTS ==========

  @Post('sessions')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Create a new AI chat session',
    description:
      'Creates a new AI practice session for a student with a specific module. Session title and description are automatically generated from the module information.',
  })
  @ApiBody({ type: CreateAISessionDto })
  @ApiResponse({
    status: 201,
    description: 'AI session created successfully',
    type: AISessionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Module or student not found',
  })
  async createAISession(
    @Body() createAISessionDto: CreateAISessionDto,
    @User() user: JWTUserPayload,
  ) {
    return this.aiChatService.createAISession(createAISessionDto, user);
  }

  @Get('sessions')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Get all AI chat sessions',
    description:
      'Retrieve paginated list of AI chat sessions with optional filters. Sessions are automatically filtered by the authenticated user.',
  })
  @ApiQuery({
    name: 'module_id',
    required: false,
    type: String,
    description: 'Filter by module ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: AISessionStatusEnum,
    description: 'Filter by session status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'AI sessions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/AISessionResponseDto' },
        },
        total: { type: 'number', example: 25 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
        totalPages: { type: 'number', example: 3 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  async findAllAISessions(
    @Query() filterDto: AISessionFilterDto,
    @Query() query: any,
    @User() user: JWTUserPayload,
  ) {
    const paginationOptions = getPaginationOptions(query);
    return this.aiChatService.findAllAISessions(
      user,
      filterDto,
      paginationOptions,
    );
  }

  @Put('sessions/:id/complete')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Complete an AI chat session',
    description:
      'Mark an AI session as completed and set the ended_at timestamp automatically',
  })
  @ApiParam({
    name: 'id',
    description: 'AI session ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'AI session completed successfully',
    type: AISessionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'AI session not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Session is already completed or cannot be completed',
  })
  async completeAISession(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.aiChatService.completeAISession(id, user);
  }

  // ========== MESSAGE ENDPOINTS ==========

  @Post('messages')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Create a new AI chat message',
    description:
      'Add a new message to an AI chat session (student or AI response)',
  })
  @ApiBody({ type: CreateAIMessageDto })
  @ApiResponse({
    status: 201,
    description: 'AI message created successfully',
    type: AIMessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or session not active',
  })
  @ApiResponse({
    status: 404,
    description: 'AI session not found',
  })
  async createAIMessage(
    @Body() createAIMessageDto: CreateAIMessageDto,
    @User() user: JWTUserPayload,
  ) {
    return this.aiChatService.createAIMessage(createAIMessageDto, user);
  }

  @Get('sessions/:sessionId/messages')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Get messages by session ID',
    description: 'Retrieve all messages for a specific AI chat session',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'AI session ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
    type: [AIMessageResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'AI session not found',
  })
  async findMessagesBySessionId(
    @Param('sessionId', ParseObjectIdPipe) sessionId: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.aiChatService.findMessagesBySessionId(sessionId, user);
  }

  // ========== FEEDBACK ENDPOINTS ==========

  @Post('feedback')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Create AI chat feedback',
    description: 'Add feedback, analysis, or ratings for an AI chat session',
  })
  @ApiBody({ type: CreateAIFeedbackDto })
  @ApiResponse({
    status: 201,
    description: 'AI feedback created successfully',
    type: AIFeedbackResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'AI session not found',
  })
  async createAIFeedback(
    @Body() createAIFeedbackDto: CreateAIFeedbackDto,
    @User() user: JWTUserPayload,
  ) {
    return this.aiChatService.createAIFeedback(createAIFeedbackDto, user);
  }

  @Get('sessions/:sessionId/feedback')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Get feedback by session ID',
    description:
      'Retrieve all feedback and analysis for a specific AI chat session',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'AI session ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'Feedback retrieved successfully',
    type: [AIFeedbackResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'AI session not found',
  })
  async findFeedbackBySessionId(
    @Param('sessionId', ParseObjectIdPipe) sessionId: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.aiChatService.findFeedbackBySessionId(sessionId, user);
  }

  // ========== RESOURCE ENDPOINTS ==========

  @Post('resources')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Create AI resource',
    description:
      'Add study materials, resources, or learning content for an AI session',
  })
  @ApiBody({ type: CreateAIResourceDto })
  @ApiResponse({
    status: 201,
    description: 'AI resource created successfully',
    type: AIResourceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'AI session not found',
  })
  async createAIResource(
    @Body() createAIResourceDto: CreateAIResourceDto,
    @User() user: JWTUserPayload,
  ) {
    return this.aiChatService.createAIResource(createAIResourceDto, user);
  }

  @Get('sessions/:sessionId/resources')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Get resources by session ID',
    description:
      'Retrieve all study materials and resources for a specific AI chat session',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'AI session ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'Resources retrieved successfully',
    type: [AIResourceResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'AI session not found',
  })
  async findResourcesBySessionId(
    @Param('sessionId', ParseObjectIdPipe) sessionId: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.aiChatService.findResourcesBySessionId(sessionId, user);
  }
}
