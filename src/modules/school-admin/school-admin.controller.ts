import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  Query,
  Patch,
  Param,
} from '@nestjs/common';
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
import {
  DashboardFilterDto,
  EnhancedDashboardResponseDto,
} from './dto/dashboard-filter.dto';
import { UpdateSchoolAdminDto } from './dto/update-school-admin.dto';
import { SchoolAdminService } from './school-admin.service';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { CreateAdditionalSchoolAdminDto } from './dto/create-additional-school-admin.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

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

  // Create an additional school admin for the same school (School Admin only)
  @Post('create-additional')
  @Roles(RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create another school admin for your school' })
  @ApiBody({ type: CreateAdditionalSchoolAdminDto })
  @ApiResponse({
    status: 201,
    description: 'School admin created successfully',
  })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createAdditionalSchoolAdmin(
    @Body() body: CreateAdditionalSchoolAdminDto,
    @User() user: JWTUserPayload,
  ) {
    return this.schoolAdminService.createAdditionalSchoolAdmin(body, user);
  }

  // Get enhanced dashboard statistics for school admin and professor
  @Get('dashboard')
  @Roles(RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({
    summary:
      'Get comprehensive dashboard statistics for school admin and professor',
    description:
      'Provides detailed analytics including active students, module completion, AI feedback errors, and engagement metrics. Professors only see data for their assigned modules.',
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
            },
          ],
          ai_feedback_errors: [
            {
              error_type: 'misunderstanding_trauma_cues',
              count: 23,
              percentage: 15.3,
              affected_students: 8,
              affected_modules: 3,
            },
          ],
          engagement_metrics: {
            total_views: 1250,
            average_session_duration: 45,
            completion_rate: 78,
          },
          quiz_statistics: {
            total_quiz_attempts: 150,
            passed_quiz_attempts: 120,
            quiz_pass_rate: 80,
            average_quiz_score: 75,
            total_ai_chat_sessions: 85,
          },
        },
      },
    },
    type: EnhancedDashboardResponseDto,
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

  // Get all school admins (Super Admin only)
  @Get('all')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Get all school admins',
    description: 'Super admin only - retrieves all school admin accounts',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (starts from 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search in email, first name, or last name',
    example: 'john',
  })
  @ApiResponse({
    status: 200,
    description: 'All school admins retrieved successfully',
    schema: {
      example: {
        message: 'All school admins retrieved successfully',
        data: [
          {
            id: '507f1f77bcf86cd799439011',
            email: 'admin@school1.edu',
            first_name: 'John',
            last_name: 'Doe',
            profile_pic: '/uploads/profile1.jpg',
            phone: 1234567890,
            country_code: 1,
            preferred_language: 'en',
            school_id: {
              _id: '507f1f77bcf86cd799439012',
              name: 'Springfield High',
            },
            role: {
              _id: '507f1f77bcf86cd799439013',
              name: 'SCHOOL_ADMIN',
            },
            status: 'ACTIVE',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
        ],
        pagination_data: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNext: true,
          hasPrev: false,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Unauthorized access' })
  async getAllSchoolAdmins(
    @Query() paginationDto: PaginationDto,
    @User() user: JWTUserPayload,
    @Query('search') search?: string,
  ) {
    return this.schoolAdminService.getAllSchoolAdmins(
      user,
      paginationDto,
      search,
    );
  }

  // Get school admin details by ID
  @Get(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Get school admin details by ID',
    description:
      'Super admin can view any school admin, school admin can only view their own profile',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'School Admin ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'School admin details retrieved successfully',
    schema: {
      example: {
        message: 'School admin details retrieved successfully',
        data: {
          id: '507f1f77bcf86cd799439011',
          email: 'admin@school.edu',
          first_name: 'John',
          last_name: 'Doe',
          profile_pic: '/uploads/profile.jpg',
          phone: 1234567890,
          country_code: 1,
          preferred_language: 'en',
          school_id: {
            _id: '507f1f77bcf86cd799439012',
            name: 'Springfield High',
          },
          role: {
            _id: '507f1f77bcf86cd799439013',
            name: 'SCHOOL_ADMIN',
          },
          status: 'ACTIVE',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'School admin not found' })
  @ApiResponse({
    status: 400,
    description: 'Invalid user type or unauthorized access',
  })
  async getSchoolAdminById(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.schoolAdminService.getSchoolAdminById(id, user);
  }

  // Update school admin details
  @Patch(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Update school admin details',
    description:
      'Super admin can update any school admin including status and school_id, school admin can only update their own profile',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'School Admin ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: UpdateSchoolAdminDto })
  @ApiResponse({
    status: 200,
    description: 'School admin updated successfully',
    schema: {
      example: {
        message: 'School admin updated successfully',
        data: {
          id: '507f1f77bcf86cd799439011',
          email: 'admin@school.edu',
          first_name: 'John',
          last_name: 'Doe',
          profile_pic: '/uploads/profile.jpg',
          phone: 1234567890,
          country_code: 1,
          preferred_language: 'en',
          status: 'ACTIVE',
          school_id: {
            _id: '507f1f77bcf86cd799439012',
            name: 'Springfield High',
          },
          role: {
            _id: '507f1f77bcf86cd799439013',
            name: 'SCHOOL_ADMIN',
          },
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'School admin not found' })
  @ApiResponse({
    status: 400,
    description: 'Invalid data or unauthorized access',
  })
  async updateSchoolAdmin(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateSchoolAdminDto: UpdateSchoolAdminDto,
    @User() user: JWTUserPayload,
  ) {
    return this.schoolAdminService.updateSchoolAdmin(
      id,
      updateSchoolAdminDto,
      user,
    );
  }
}
