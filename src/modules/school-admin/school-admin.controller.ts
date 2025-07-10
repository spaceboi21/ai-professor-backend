import { Body, Controller, Post, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { CreateSchoolAdminDto } from './dto/create-school-admin.dto';
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

  // Get school admin dashboard info
  @Get('dashboard')
  @Roles(RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get school admin dashboard information' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard information retrieved successfully',
  })
  async getDashboard(@User() user: JWTUserPayload) {
    return this.schoolAdminService.getDashboard(user);
  }
}
