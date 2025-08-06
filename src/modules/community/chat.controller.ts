import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { ChatConversationFilterDto } from './dto/chat-conversation-filter.dto';
import { SearchUsersDto } from './dto/search-users.dto';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('conversations-with-details')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.STUDENT, RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get user conversations with full user details' })
  @ApiResponse({
    status: 200,
    description: 'Conversations with user details retrieved successfully',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'user_id', required: false, type: String })
  @ApiQuery({ name: 'user_role', required: false, enum: RoleEnum })
  async getConversationsWithDetails(
    @Query() filter: ChatConversationFilterDto,
    @Request() req: { user: JWTUserPayload },
  ) {
    return this.chatService.getConversationsWithUserDetails(req.user, filter);
  }

  @Get('messages/:userId')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.STUDENT, RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get messages with a specific user' })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiParam({ name: 'userId', description: 'User ID to get messages with' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMessages(
    @Param('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Request() req: { user: JWTUserPayload },
  ) {
    return this.chatService.getMessages(req.user, userId, page, limit);
  }

  @Get('users')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.STUDENT, RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Search professors and students for the current school (only STUDENT and PROFESSOR roles)' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              conversation_user: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  first_name: { type: 'string' },
                  last_name: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' },
                },
              },
              conversation_user_role: { type: 'string' },
            },
          },
        },
        total: { type: 'number' },
      },
    },
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: [RoleEnum.STUDENT, RoleEnum.PROFESSOR] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchUsers(
    @Query() searchParams: SearchUsersDto,
    @Request() req: { user: JWTUserPayload },
  ) {
    return this.chatService.searchUsers(req.user, searchParams);
  }
} 