import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Query,
  Post,
  Body,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { NotificationsService } from './notifications.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { RecipientTypeEnum } from 'src/database/schemas/tenant/notification.schema';
import { CreateMultiLanguageNotificationDto } from './dto/create-multi-language-notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RoleGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('multi-language')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Create multi-language notification' })
  @ApiResponse({
    status: 201,
    description: 'Multi-language notification created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data provided',
  })
  async createMultiLanguageNotification(
    @Body()
    createMultiLanguageNotificationDto: CreateMultiLanguageNotificationDto,
  ) {
    return this.notificationsService.createMultiLanguageNotification(
      createMultiLanguageNotificationDto.recipient_id,
      createMultiLanguageNotificationDto.recipient_type,
      createMultiLanguageNotificationDto.title_en,
      createMultiLanguageNotificationDto.title_fr,
      createMultiLanguageNotificationDto.message_en,
      createMultiLanguageNotificationDto.message_fr,
      createMultiLanguageNotificationDto.type,
      createMultiLanguageNotificationDto.metadata || {},
      createMultiLanguageNotificationDto.school_id,
    );
  }

  @Get()
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.PROFESSOR,
    RoleEnum.SUPER_ADMIN,
    RoleEnum.SCHOOL_ADMIN,
  )
  @ApiOperation({ summary: 'Get user notifications (Student or Professor)' })
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
    description: 'Notifications retrieved successfully',
  })
  async getNotifications(
    @User() user: JWTUserPayload,
    @Query() paginationDto?: PaginationDto,
  ) {
    const recipientType =
      user.role.name === RoleEnum.STUDENT
        ? RecipientTypeEnum.STUDENT
        : RecipientTypeEnum.PROFESSOR;

    return this.notificationsService.getNotifications(
      user,
      recipientType,
      paginationDto,
    );
  }

  @Get('unread-count')
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.PROFESSOR,
    RoleEnum.SUPER_ADMIN,
    RoleEnum.SCHOOL_ADMIN,
  )
  @ApiOperation({
    summary: 'Get unread notifications count (Student or Professor)',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
  })
  async getUnreadCount(@User() user: JWTUserPayload) {
    const recipientType =
      user.role.name === RoleEnum.STUDENT
        ? RecipientTypeEnum.STUDENT
        : RecipientTypeEnum.PROFESSOR;

    return this.notificationsService.getUnreadCount(user, recipientType);
  }

  @Patch(':id/read')
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.PROFESSOR,
    RoleEnum.SUPER_ADMIN,
    RoleEnum.SCHOOL_ADMIN,
  )
  @ApiOperation({
    summary: 'Mark a notification as read (Student or Professor)',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Notification ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markNotificationAsRead(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    const recipientType =
      user.role.name === RoleEnum.STUDENT
        ? RecipientTypeEnum.STUDENT
        : RecipientTypeEnum.PROFESSOR;

    return this.notificationsService.markNotificationAsRead(
      id,
      user,
      recipientType,
    );
  }

  @Patch('mark-all-read')
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.PROFESSOR,
    RoleEnum.SUPER_ADMIN,
    RoleEnum.SCHOOL_ADMIN,
  )
  @ApiOperation({
    summary: 'Mark all notifications as read (Student or Professor)',
  })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllNotificationsAsRead(@User() user: JWTUserPayload) {
    const recipientType =
      user.role.name === RoleEnum.STUDENT
        ? RecipientTypeEnum.STUDENT
        : RecipientTypeEnum.PROFESSOR;

    return this.notificationsService.markAllNotificationsAsRead(
      user,
      recipientType,
    );
  }
}
