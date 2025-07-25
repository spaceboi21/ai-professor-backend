import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Request,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/constants/roles.constant';
import {
  ActivityLogService,
  ActivityLogFilterDto,
} from './activity-log.service';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';

@ApiTags('Activity Logs')
@Controller('activity-logs')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiBearerAuth()
export class ActivityLogController {
  private readonly logger = new Logger(ActivityLogController.name);

  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @Roles(
    RoleEnum.SUPER_ADMIN,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.PROFESSOR,
    RoleEnum.STUDENT,
  )
  @ApiOperation({
    summary: 'Get activity logs with filtering and pagination',
    description:
      'Retrieve activity logs based on user role and permissions. Super admins can see all logs, school admins see their school logs, professors see school and their own logs, students see only their own logs.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiQuery({
    name: 'activity_type',
    required: false,
    enum: ['USER_LOGIN', 'USER_CREATED', 'MODULE_CREATED', 'QUIZ_ATTEMPTED'],
    description: 'Filter by activity type',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['AUTHENTICATION', 'USER_MANAGEMENT', 'CONTENT_MANAGEMENT'],
    description: 'Filter by activity category',
  })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'],
    description: 'Filter by activity level',
  })
  @ApiQuery({
    name: 'performed_by_role',
    required: false,
    enum: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PROFESSOR', 'STUDENT'],
    description: 'Filter by user role',
  })
  @ApiQuery({
    name: 'school_id',
    required: false,
    type: String,
    description: 'Filter by school ID',
  })
  @ApiQuery({
    name: 'target_user_id',
    required: false,
    type: String,
    description: 'Filter by target user ID',
  })
  @ApiQuery({
    name: 'module_id',
    required: false,
    type: String,
    description: 'Filter by module ID',
  })
  @ApiQuery({
    name: 'chapter_id',
    required: false,
    type: String,
    description: 'Filter by chapter ID',
  })
  @ApiQuery({
    name: 'is_success',
    required: false,
    type: Boolean,
    description: 'Filter by success status',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['SUCCESS', 'WARNING', 'ERROR', 'INFO'],
    description: 'Filter by status (SUCCESS, WARNING, ERROR, INFO)',
  })
  @ApiQuery({
    name: 'start_date',
    required: false,
    type: String,
    description: 'Filter by start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    type: String,
    description: 'Filter by end date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description:
      'Search in description, school name, user email, module name, or chapter name',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity logs retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Activity logs retrieved successfully',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              activity_type: { type: 'string' },
              category: { type: 'string' },
              level: { type: 'string' },
              description: { type: 'string' },
              performed_by: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' },
                },
              },
              school: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                },
              },
              target_user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' },
                },
              },
              module: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                },
              },
              chapter: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                },
              },
              is_success: { type: 'boolean' },
              error_message: { type: 'string' },
              execution_time_ms: { type: 'number' },
              ip_address: { type: 'string' },
              endpoint: { type: 'string' },
              http_method: { type: 'string' },
              http_status_code: { type: 'number' },
              status: {
                type: 'string',
                enum: ['SUCCESS', 'WARNING', 'ERROR', 'INFO'],
              },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            total_pages: { type: 'number' },
            has_next: { type: 'boolean' },
            has_prev: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getActivityLogs(
    @Request() req: any,
    @Query() filterDto: ActivityLogFilterDto,
  ) {
    this.logger.log(`Getting activity logs for user: ${req.user.id}`);

    const result = await this.activityLogService.getActivityLogs(
      req.user,
      filterDto,
    );

    return {
      message: 'Activity logs retrieved successfully',
      ...result,
    };
  }

  @Get('stats')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({
    summary: 'Get activity statistics',
    description:
      'Retrieve activity statistics for the last 30 days (or specified days) based on user permissions.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to analyze (default: 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Activity statistics retrieved successfully',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              activities: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    level: { type: 'string' },
                    success_count: { type: 'number' },
                    error_count: { type: 'number' },
                    total_count: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  async getActivityStats(@Request() req: any, @Query('days') days?: number) {
    this.logger.log(`Getting activity stats for user: ${req.user.id}`);

    const stats = await this.activityLogService.getActivityStats(
      req.user,
      days || 30,
    );

    return {
      message: 'Activity statistics retrieved successfully',
      data: stats,
    };
  }

  @Get('export')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({
    summary: 'Export activity logs to CSV format',
    description: 'Export filtered activity logs to CSV format for download.',
  })
  @ApiQuery({
    name: 'activity_type',
    required: false,
    enum: ['USER_LOGIN', 'USER_CREATED', 'MODULE_CREATED', 'QUIZ_ATTEMPTED'],
    description: 'Filter by activity type',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['AUTHENTICATION', 'USER_MANAGEMENT', 'CONTENT_MANAGEMENT'],
    description: 'Filter by activity category',
  })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'],
    description: 'Filter by activity level',
  })
  @ApiQuery({
    name: 'performed_by_role',
    required: false,
    enum: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PROFESSOR', 'STUDENT'],
    description: 'Filter by user role',
  })
  @ApiQuery({
    name: 'school_id',
    required: false,
    type: String,
    description: 'Filter by school ID',
  })
  @ApiQuery({
    name: 'target_user_id',
    required: false,
    type: String,
    description: 'Filter by target user ID',
  })
  @ApiQuery({
    name: 'module_id',
    required: false,
    type: String,
    description: 'Filter by module ID',
  })
  @ApiQuery({
    name: 'chapter_id',
    required: false,
    type: String,
    description: 'Filter by chapter ID',
  })
  @ApiQuery({
    name: 'is_success',
    required: false,
    type: Boolean,
    description: 'Filter by success status',
  })
  @ApiQuery({
    name: 'start_date',
    required: false,
    type: String,
    description: 'Filter by start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    type: String,
    description: 'Filter by end date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description:
      'Search in description, school name, user email, module name, or chapter name',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity logs exported successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Activity logs exported successfully',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              timestamp: { type: 'string', format: 'date-time' },
              activity_type: { type: 'string' },
              category: { type: 'string' },
              level: { type: 'string' },
              description: { type: 'string' },
              performed_by: { type: 'string' },
              performed_by_email: { type: 'string' },
              performed_by_role: { type: 'string' },
              school: { type: 'string' },
              target_user: { type: 'string' },
              target_user_email: { type: 'string' },
              target_user_role: { type: 'string' },
              module: { type: 'string' },
              chapter: { type: 'string' },
              is_success: { type: 'string' },
              error_message: { type: 'string' },
              execution_time_ms: { type: 'string' },
              ip_address: { type: 'string' },
              endpoint: { type: 'string' },
              http_method: { type: 'string' },
              http_status_code: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async exportActivityLogs(
    @Request() req: any,
    @Query() filterDto: ActivityLogFilterDto,
  ) {
    this.logger.log(`Exporting activity logs for user: ${req.user.id}`);

    const logs = await this.activityLogService.exportActivityLogs(
      req.user,
      filterDto,
    );

    return {
      message: 'Activity logs exported successfully',
      data: logs,
    };
  }

  @Get(':id')
  @Roles(
    RoleEnum.SUPER_ADMIN,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.PROFESSOR,
    RoleEnum.STUDENT,
  )
  @ApiOperation({
    summary: 'Get activity log by ID',
    description:
      'Retrieve a specific activity log by ID with proper access control.',
  })
  @ApiParam({ name: 'id', description: 'Activity log ID' })
  @ApiResponse({
    status: 200,
    description: 'Activity log retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Activity log retrieved successfully',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            activity_type: { type: 'string' },
            category: { type: 'string' },
            level: { type: 'string' },
            description: { type: 'string' },
            performed_by: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
              },
            },
            school: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
            target_user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
              },
            },
            module: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
            chapter: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
            metadata: { type: 'object' },
            ip_address: { type: 'string' },
            user_agent: { type: 'string' },
            is_success: { type: 'boolean' },
            error_message: { type: 'string' },
            execution_time_ms: { type: 'number' },
            endpoint: { type: 'string' },
            http_method: { type: 'string' },
            http_status_code: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid log ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Access denied to this activity log',
  })
  @ApiResponse({ status: 404, description: 'Activity log not found' })
  async getActivityLogById(@Request() req: any, @Param('id') id: string) {
    this.logger.log(
      `Getting activity log by ID: ${id} for user: ${req.user.id}`,
    );

    if (!id || id === 'undefined' || id === 'null') {
      throw new BadRequestException('Invalid activity log ID');
    }

    const log = await this.activityLogService.getActivityLogById(id, req.user);

    return {
      message: 'Activity log retrieved successfully',
      data: log,
    };
  }
}
