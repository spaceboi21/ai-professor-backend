import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import {
  ApiBearerAuth,
  ApiBody,
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
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { ModuleFilterDto } from './dto/module-filter.dto';
import { ToggleModuleVisibilityDto } from './dto/toggle-module-visibility.dto';
import {
  AssignProfessorDto,
  UnassignProfessorDto,
} from './dto/assign-professor.dto';
import { ModulesService } from './modules.service';
import { ModuleAssignmentService } from './module-assignment.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { DifficultyEnum } from 'src/common/constants/difficulty.constant';

@ApiTags('Modules')
@ApiBearerAuth()
@Controller('modules')
@UseGuards(JwtAuthGuard, RoleGuard)
export class ModulesController {
  constructor(
    private readonly modulesService: ModulesService,
    private readonly moduleAssignmentService: ModuleAssignmentService,
  ) {}

  @Post()
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Create a new module' })
  @ApiBody({ type: CreateModuleDto })
  @ApiResponse({ status: 201, description: 'Module created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createModule(
    @Body() createModuleDto: CreateModuleDto,
    @User() user: JWTUserPayload,
  ) {
    return this.modulesService.createModule(createModuleDto, user);
  }

  @Post('toggle-visibility')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Toggle module visibility (publish/unpublish)' })
  @ApiBody({ type: ToggleModuleVisibilityDto })
  @ApiResponse({
    status: 200,
    description: 'Module visibility toggled successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Module must have at least one chapter and one quiz group to be published',
  })
  @ApiResponse({ status: 404, description: 'Module not found' })
  async toggleModuleVisibility(
    @Body() publishModuleDto: ToggleModuleVisibilityDto,
    @User() user: JWTUserPayload,
  ) {
    return this.modulesService.toggleModuleVisibility(publishModuleDto, user);
  }

  @Post('assign-professors')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Assign professors to a module' })
  @ApiBody({ type: AssignProfessorDto })
  @ApiResponse({ status: 200, description: 'Professors assigned successfully' })
  @ApiResponse({ status: 404, description: 'Module or professor not found' })
  async assignProfessorsToModule(
    @Body() assignDto: AssignProfessorDto,
    @User() user: JWTUserPayload,
  ): Promise<any> {
    return this.moduleAssignmentService.assignProfessorsToModule(
      assignDto,
      user,
    );
  }

  @Post('unassign-professor')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Unassign a professor from a module' })
  @ApiBody({ type: UnassignProfessorDto })
  @ApiResponse({
    status: 200,
    description: 'Professor unassigned successfully',
  })
  @ApiResponse({ status: 404, description: 'Module or professor not found' })
  async unassignProfessorFromModule(
    @Body() unassignDto: UnassignProfessorDto,
    @User() user: JWTUserPayload,
  ) {
    return this.moduleAssignmentService.unassignProfessorFromModule(
      unassignDto,
      user,
    );
  }

  @Get(':id/assignments')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get all professors assigned to a module' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Module ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'school_id',
    required: false,
    type: String,
    description:
      'School ID (required for super admin, optional for other roles)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Module assignments retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Module not found' })
  async getModuleAssignments(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
    @Query('school_id') school_id?: string,
  ) {
    return this.moduleAssignmentService.getModuleAssignments(
      id,
      user,
      school_id,
    );
  }

  @Get('assignments/audit-logs')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Get assignment audit logs for admin accountability',
  })
  @ApiQuery({
    name: 'module_id',
    required: false,
    type: String,
    description: 'Filter by module ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'professor_id',
    required: false,
    type: String,
    description: 'Filter by professor ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'school_id',
    required: false,
    type: String,
    description:
      'School ID (required for super admin, optional for other roles)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
  })
  async getAssignmentAuditLogs(
    @User() user: JWTUserPayload,
    @Query('module_id') moduleId?: string,
    @Query('professor_id') professorId?: string,
    @Query() paginationDto?: PaginationDto,
    @Query('school_id') school_id?: string,
  ) {
    const moduleObjectId = moduleId ? new Types.ObjectId(moduleId) : undefined;
    const professorObjectId = professorId
      ? new Types.ObjectId(professorId)
      : undefined;

    return this.moduleAssignmentService.getAssignmentAuditLogs(
      user,
      moduleObjectId,
      professorObjectId,
      paginationDto,
      school_id,
    );
  }

  @Get('assignments/professor/:professorId')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get all modules assigned to a professor' })
  @ApiParam({
    name: 'professorId',
    type: String,
    description: 'Professor ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'school_id',
    required: false,
    type: String,
    description:
      'School ID (required for super admin, optional for other roles)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Professor assignments retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Professor not found' })
  async getProfessorAssignments(
    @Param('professorId', ParseObjectIdPipe) professorId: Types.ObjectId,
    @User() user: JWTUserPayload,
    @Query() paginationDto?: PaginationDto,
    @Query('school_id') school_id?: string,
  ) {
    return this.moduleAssignmentService.getProfessorAssignments(
      professorId,
      user,
      paginationDto,
      school_id,
    );
  }

  @Get('assignments/check-access/:professorId/:moduleId')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Check if a professor has access to a module' })
  @ApiParam({
    name: 'professorId',
    type: String,
    description: 'Professor ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiParam({
    name: 'moduleId',
    type: String,
    description: 'Module ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'school_id',
    required: false,
    type: String,
    description:
      'School ID (required for super admin, optional for other roles)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Access check completed successfully',
  })
  async checkProfessorModuleAccess(
    @Param('professorId', ParseObjectIdPipe) professorId: Types.ObjectId,
    @Param('moduleId', ParseObjectIdPipe) moduleId: Types.ObjectId,
    @User() user: JWTUserPayload,
    @Query('school_id') school_id?: string,
  ) {
    return this.moduleAssignmentService.checkProfessorModuleAccess(
      professorId,
      moduleId,
      user,
      school_id,
    );
  }

  @Get()
  @Roles(
    RoleEnum.SUPER_ADMIN,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.PROFESSOR,
    RoleEnum.STUDENT,
  )
  @ApiOperation({ summary: 'Get all modules with filtering and sorting' })
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
  @ApiQuery({
    name: 'text',
    required: false,
    type: String,
    description: 'Search text in title and description (case-insensitive)',
    example: 'psychology',
  })
  @ApiQuery({
    name: 'difficulty',
    required: false,
    enum: DifficultyEnum,
    description: 'Filter by difficulty level',
    example: 'INTERMEDIATE',
  })
  @ApiQuery({
    name: 'published',
    required: false,
    type: Boolean,
    description:
      'Filter by published status (only available for non-student users)',
    example: true,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['title', 'difficulty', 'duration', 'created_at', 'progress_status'],
    description:
      'Sort by field. progress_status is only available for students (ASC: IN_PROGRESS → NOT_STARTED → COMPLETED, DESC: COMPLETED → NOT_STARTED → IN_PROGRESS)',
    example: 'progress_status',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order',
    example: 'asc',
  })
  @ApiResponse({ status: 200, description: 'Modules retrieved successfully' })
  async findAllModules(
    @User() user: JWTUserPayload,
    @Query() paginationDto?: PaginationDto,
    @Query() filterDto?: ModuleFilterDto,
  ) {
    return this.modulesService.findAllModules(user, paginationDto, filterDto);
  }

  // not in use
  // @Get('overview')
  // @Roles(RoleEnum.STUDENT)
  // @ApiOperation({
  //   summary: 'Get module overview with progress statistics (Student)',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Module overview retrieved successfully',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       message: {
  //         type: 'string',
  //         example: 'Module overview retrieved successfully',
  //       },
  //       data: {
  //         type: 'object',
  //         properties: {
  //           total_modules: { type: 'number', example: 10 },
  //           completed_modules: { type: 'number', example: 3 },
  //           in_progress_modules: { type: 'number', example: 2 },
  //           not_started_modules: { type: 'number', example: 5 },
  //           overall_progress_percentage: { type: 'number', example: 35.5 },
  //           recent_modules: {
  //             type: 'array',
  //             items: {
  //               type: 'object',
  //               properties: {
  //                 _id: { type: 'string' },
  //                 title: { type: 'string' },
  //                 subject: { type: 'string' },
  //                 status: { type: 'string' },
  //                 progress_percentage: { type: 'number' },
  //                 last_accessed_at: { type: 'string' },
  //               },
  //             },
  //           },
  //         },
  //       },
  //     },
  //   },
  // })
  // @ApiResponse({ status: 400, description: 'Bad request' })
  // @ApiResponse({
  //   status: 403,
  //   description: 'Access denied - Only students can view module overview',
  // })
  // async getModuleOverview(@User() user: JWTUserPayload) {
  //   return this.modulesService.getModuleOverview(user);
  // }

  @Get(':id')
  @Roles(
    RoleEnum.SUPER_ADMIN,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.PROFESSOR,
    RoleEnum.STUDENT,
  )
  @ApiOperation({ summary: 'Get a module by id' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Module ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({ status: 200, description: 'Module retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  async findModuleById(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.modulesService.findModuleById(id, user);
  }

  @Patch(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Update a module' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Module ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: UpdateModuleDto })
  @ApiResponse({ status: 200, description: 'Module updated successfully' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  async updateModule(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateModuleDto: UpdateModuleDto,
    @User() user: JWTUserPayload,
  ) {
    return this.modulesService.updateModule(id, updateModuleDto, user);
  }

  @Delete(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Delete a module' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Module ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'school_id',
    required: false,
    type: String,
    description:
      'School ID (required for super admin, optional for other roles)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({ status: 200, description: 'Module deleted successfully' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  async removeModule(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
    @Query('school_id') school_id?: string,
  ) {
    return this.modulesService.removeModule(id, user, school_id);
  }
}
