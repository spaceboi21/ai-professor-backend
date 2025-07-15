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

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RoleGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Get student notifications' })
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
    return this.notificationsService.getStudentNotifications(
      user,
      paginationDto,
    );
  }

  @Get('unread-count')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Get unread notifications count' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
  })
  async getUnreadCount(@User() user: JWTUserPayload) {
    return this.notificationsService.getUnreadCount(user);
  }

  @Patch(':id/read')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Mark a notification as read' })
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
    return this.notificationsService.markNotificationAsRead(id, user);
  }

  @Patch('mark-all-read')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllNotificationsAsRead(@User() user: JWTUserPayload) {
    return this.notificationsService.markAllNotificationsAsRead(user);
  }
}
