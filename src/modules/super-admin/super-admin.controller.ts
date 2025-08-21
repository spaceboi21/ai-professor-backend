import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { SuperAdminService } from './super-admin.service';
import {
  ActivityLogService,
  ActivityLogFilterDto,
} from '../activity-log/activity-log.service';

@ApiTags('Super Admin')
@Controller('super-admin')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiBearerAuth()
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @Get('activity-logs')
  @Roles(RoleEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get all activity logs (Super Admin only)',
    description:
      'Retrieve all activity logs across all schools and users. Only accessible by super admins.',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity logs retrieved successfully',
  })
  async getAllActivityLogs(
    @Request() req: any,
    @Query() filterDto: ActivityLogFilterDto,
  ) {
    return this.activityLogService.getActivityLogs(req.user, filterDto);
  }

  @Get('activity-logs/stats')
  @Roles(RoleEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get system-wide activity statistics (Super Admin only)',
    description:
      'Retrieve activity statistics across all schools for system monitoring.',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity statistics retrieved successfully',
  })
  async getSystemActivityStats(
    @Request() req: any,
    @Query('days') days?: number,
  ) {
    return this.activityLogService.getActivityStats(req.user, days || 30);
  }

  @Get('activity-logs/export')
  @Roles(RoleEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Export all activity logs (Super Admin only)',
    description:
      'Export all activity logs to CSV format for system-wide analysis.',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity logs exported successfully',
  })
  async exportAllActivityLogs(
    @Request() req: any,
    @Query() filterDto: ActivityLogFilterDto,
  ) {
    return this.activityLogService.exportActivityLogs(req.user, filterDto);
  }
}
