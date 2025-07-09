import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { CreateSchoolAdminDto } from './dto/create-school-admin.dto';
import { UpdateSchoolDetailsDto } from './dto/update-school-details.dto';
import { SchoolAdminService } from './school-admin.service';
import { UpdateStatusDto } from 'src/common/dto/update-status.dto';
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

  // update school details
  @Patch('/school/:id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update school details' })
  @ApiBody({ type: UpdateSchoolDetailsDto })
  @ApiResponse({
    status: 200,
    description: 'School details updated successfully',
  })
  @ApiResponse({ status: 404, description: 'School not found' })
  async updateSchoolDetails(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() body: UpdateSchoolDetailsDto,
    @User() user: JWTUserPayload,
  ) {
    return this.schoolAdminService.updateSchoolDetails(body, user.id, id);
  }

  // Update student status
  @Patch('/students/:id/status')
  @Roles(RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update student status' })
  @ApiBody({ type: UpdateStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Student status updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async updateStudentStatus(
    @Param('id') studentId: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @User() user: JWTUserPayload,
  ) {
    return this.schoolAdminService.updateStudentStatus(studentId, updateStatusDto.status, user);
  }

  // Update professor status
  @Patch('/professors/:id/status')
  @Roles(RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update professor status' })
  @ApiBody({ type: UpdateStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Professor status updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Professor not found' })
  async updateProfessorStatus(
    @Param('id') professorId: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @User() user: JWTUserPayload,
  ) {
    return this.schoolAdminService.updateProfessorStatus(professorId, updateStatusDto.status, user);
  }
}
