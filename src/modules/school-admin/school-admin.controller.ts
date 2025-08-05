import { Body, Controller, Post, Get, UseGuards, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { CreateSchoolAdminDto } from './dto/create-school-admin.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
import { SchoolAdminService } from './school-admin.service';
@ApiTags('School Admin')
@ApiBearerAuth()
@Controller('school-admin')
@UseGuards(JwtAuthGuard, RoleGuard)
export class SchoolAdminController {
  constructor(private readonly schoolAdminService: SchoolAdminService) {}

  // Create a new school admin
  @Post('')
  @Roles(RoleEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new school and school admin' })
  @ApiBody({ type: CreateSchoolAdminDto })
  @ApiResponse({
    status: 201,
    description: 'School and Admin user created successfully',
  })
  @ApiResponse({ status: 409, description: 'Email or school already exists' })
  async createSchoolAdmin(
    @Body() body: CreateSchoolAdminDto,
    @User() user: JWTUserPayload,
  ) {
    return this.schoolAdminService.createSchoolAdmin(body, user);
  }

  // Get enhanced dashboard statistics for school admin and professor
  @Get('dashboard')
  @Roles(RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ 
    summary: 'Get comprehensive dashboard statistics for school admin and professor',
    description: 'Provides detailed analytics including active students, module completion, AI feedback errors, and engagement metrics. Professors only see data for their assigned modules.'
  })
  @ApiQuery({
    name: 'from_date',
    required: false,
    type: String,
    description: 'Filter by start date (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'to_date',
    required: false,
    type: String,
    description: 'Filter by end date (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @ApiQuery({
    name: 'module_id',
    required: false,
    type: String,
    description: 'Filter by specific module ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'cohort',
    required: false,
    type: String,
    description: 'Filter by cohort/class name',
    example: 'Class of 2024',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
    schema: {
      example: {
        message: 'Dashboard statistics retrieved successfully',
        data: {
          overview: {
            active_students: 45,
            total_students: 60,
            average_completion_percentage: 78,
            total_modules: 8,
            active_modules: 6,
          },
          module_performance: [
            {
              module_id: '507f1f77bcf86cd799439011',
              title: 'Child Development Psychology',
              completion_percentage: 85,
              active_students: 12,
              average_time_spent: 120,
            }
          ],
          ai_feedback_errors: [
            {
              error_type: 'misunderstanding_trauma_cues',
              count: 23,
              percentage: 15.3,
              affected_students: 8,
              affected_modules: 3,
            }
          ],
          engagement_metrics: {
            total_views: 1250,
            average_session_duration: 45,
            completion_rate: 78,
          },
        },
      },
    },
  })
  async getDashboard(
    @User() user: JWTUserPayload,
    @Query() filterDto: DashboardFilterDto,
  ) {
    return this.schoolAdminService.getEnhancedDashboard(user, filterDto);
  }

  // Reset password endpoint
  @Post('reset-password')
  @Roles(RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({
    summary: 'Reset password for authenticated school admin or professor',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Invalid old password' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @User() user: JWTUserPayload,
  ) {
    return this.schoolAdminService.resetPassword(
      user.id.toString(),
      resetPasswordDto,
    );
  }
}
