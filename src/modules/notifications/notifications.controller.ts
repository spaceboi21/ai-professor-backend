import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Query,
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

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RoleGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR)
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
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR)
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
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR)
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
  @Roles(RoleEnum.STUDENT, RoleEnum.PROFESSOR)
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
