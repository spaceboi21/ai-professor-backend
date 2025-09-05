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
import { AnchorChatService } from './anchor-chat.service';
import { CreateAnchorChatSessionDto } from './dto/create-anchor-chat-session.dto';
import { CreateAnchorChatMessageDto } from './dto/create-anchor-chat-message.dto';
import { CreateAnchorChatResourceDto } from './dto/create-anchor-chat-resource.dto';
import { AnchorChatSessionFilterDto } from './dto/anchor-chat-session-filter.dto';
import { AnchorChatSessionResponseDto } from './dto/anchor-chat-session-response.dto';
import { AnchorChatMessageResponseDto } from './dto/anchor-chat-message-response.dto';
import { AnchorChatResourceResponseDto } from './dto/anchor-chat-resource-response.dto';
import { getPaginationOptions } from 'src/common/utils/pagination.util';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { User } from 'src/common/decorators/user.decorator';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { AnchorChatSessionStatusEnum } from 'src/common/constants/anchor-chat-session.constant';

@ApiTags('Anchor Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('anchor-chat')
export class AnchorChatController {
  constructor(private readonly anchorChatService: AnchorChatService) {}

  // ========== SESSION ENDPOINTS ==========

  @Post('sessions')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Create a new anchor chat session',
    description:
      'Creates a new AI resource chat session for a student with a specific anchor tag. The AI will help suggest relevant resources and learning materials.',
  })
  @ApiBody({ type: CreateAnchorChatSessionDto })
  @ApiResponse({
    status: 201,
    description: 'Anchor chat session created successfully',
    type: AnchorChatSessionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Anchor tag or student not found',
  })
  async createAnchorChatSession(
    @Body() createAnchorChatSessionDto: CreateAnchorChatSessionDto,
    @User() user: JWTUserPayload,
  ) {
    return this.anchorChatService.createAnchorChatSession(createAnchorChatSessionDto, user);
  }

  @Get('sessions')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Get all anchor chat sessions',
    description:
      'Retrieve paginated list of anchor chat sessions with optional filters. Sessions are automatically filtered by the authenticated user.',
  })
  @ApiQuery({
    name: 'anchor_tag_id',
    required: false,
    type: String,
    description: 'Filter by anchor tag ID',
    example: '507f1f77bcf86cd799439011',
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
    enum: AnchorChatSessionStatusEnum,
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
    description: 'Anchor chat sessions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/AnchorChatSessionResponseDto' },
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
  async findAllAnchorChatSessions(
    @Query() filterDto: AnchorChatSessionFilterDto,
    @Query() query: any,
    @User() user: JWTUserPayload,
  ) {
    const paginationOptions = getPaginationOptions(query);
    return this.anchorChatService.findAllAnchorChatSessions(
      user,
      filterDto,
      paginationOptions,
    );
  }

  @Put('sessions/:id/complete')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Complete an anchor chat session',
    description:
      'Mark an anchor chat session as completed and set the ended_at timestamp automatically',
  })
  @ApiParam({
    name: 'id',
    description: 'Anchor chat session ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'Anchor chat session completed successfully',
    type: AnchorChatSessionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Anchor chat session not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Session is already completed or cannot be completed',
  })
  async completeAnchorChatSession(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.anchorChatService.completeAnchorChatSession(id, user);
  }

  // ========== MESSAGE ENDPOINTS ==========

  @Post('messages')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Create a new anchor chat message',
    description:
      'Send a message asking for resources related to the anchor tag. The AI will respond with helpful suggestions and resources.',
  })
  @ApiBody({ type: CreateAnchorChatMessageDto })
  @ApiResponse({
    status: 201,
    description: 'Anchor chat message created successfully',
    type: AnchorChatMessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or session not active',
  })
  @ApiResponse({
    status: 404,
    description: 'Anchor chat session not found',
  })
  async createAnchorChatMessage(
    @Body() createAnchorChatMessageDto: CreateAnchorChatMessageDto,
    @User() user: JWTUserPayload,
  ) {
    return this.anchorChatService.createAnchorChatMessage(createAnchorChatMessageDto, user);
  }

  @Get('sessions/:sessionId/messages')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Get messages by session ID',
    description: 'Retrieve all messages for a specific anchor chat session',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Anchor chat session ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          items: { $ref: '#/components/schemas/AnchorChatMessageResponseDto' },
        },
        resources: {
          type: 'array',
          items: { $ref: '#/components/schemas/AnchorChatResourceResponseDto' },
        },
        sessionDetails: { $ref: '#/components/schemas/AnchorChatSessionResponseDto' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Anchor chat session not found',
  })
  async findMessagesBySessionId(
    @Param('sessionId', ParseObjectIdPipe) sessionId: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.anchorChatService.findMessagesBySessionId(sessionId, user);
  }

  // ========== RESOURCE ENDPOINTS ==========

  @Post('resources')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Generate anchor chat resources',
    description:
      'Generate personalized learning resources and recommendations based on the anchor tag and conversation history.',
  })
  @ApiBody({ type: CreateAnchorChatResourceDto })
  @ApiResponse({
    status: 201,
    description: 'Anchor chat resources created successfully',
    type: AnchorChatResourceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Anchor chat session not found',
  })
  async createAnchorChatResource(
    @Body() createAnchorChatResourceDto: CreateAnchorChatResourceDto,
    @User() user: JWTUserPayload,
  ) {
    return this.anchorChatService.createAnchorChatResource(createAnchorChatResourceDto, user);
  }

  @Get('sessions/:sessionId/resources')
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Get resources by session ID',
    description:
      'Retrieve all generated resources and recommendations for a specific anchor chat session',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Anchor chat session ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'Resources retrieved successfully',
    type: [AnchorChatResourceResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Anchor chat session not found',
  })
  async findResourcesBySessionId(
    @Param('sessionId', ParseObjectIdPipe) sessionId: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.anchorChatService.findResourcesBySessionId(sessionId, user);
  }
}
