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
  ManageModuleAssignmentsDto,
} from './dto/assign-professor.dto';
import {
  UpdateModuleSequenceDto,
  BulkUpdateModuleSequenceDto,
} from './dto/update-module-sequence.dto';
import { ModulesService } from './modules.service';
import {
  ModuleAssignmentService,
  ManageModuleAssignmentsResponse,
} from './module-assignment.service';
import { DatabaseAuditService } from './database-audit.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { DifficultyEnum } from 'src/common/constants/difficulty.constant';
import { MigrateChaptersDto, DeleteOrphanedModulesDto } from './dto/migrate-chapters.dto';

@ApiTags('Modules')
@ApiBearerAuth()
@Controller('modules')
@UseGuards(JwtAuthGuard, RoleGuard)
export class ModulesController {
  constructor(
    private readonly modulesService: ModulesService,
    private readonly moduleAssignmentService: ModuleAssignmentService,
    private readonly databaseAuditService: DatabaseAuditService,
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

  @Post('manage-assignments')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Manage module assignments (assign/unassign)' })
  @ApiBody({ type: ManageModuleAssignmentsDto })
  @ApiResponse({
    status: 200,
    description: 'Module assignments managed successfully',
  })
  @ApiResponse({ status: 404, description: 'Module or professor not found' })
  async manageModuleAssignments(
    @Body() manageAssignmentsDto: ManageModuleAssignmentsDto,
    @User() user: JWTUserPayload,
  ): Promise<ManageModuleAssignmentsResponse> {
    return this.moduleAssignmentService.manageModuleAssignments(
      manageAssignmentsDto,
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
    enum: ['title', 'difficulty', 'duration', 'created_at', 'progress_status', 'sequence'],
    description:
      'Sort by field. progress_status is only available for students (ASC: IN_PROGRESS → NOT_STARTED → COMPLETED, DESC: COMPLETED → NOT_STARTED → IN_PROGRESS). sequence sorts by module sequence number.',
    example: 'sequence',
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

  @Get('pre-defined-modules')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({
    summary:
      'Get modules from Python service (for super admin and school admin and professor)',
  })
  @ApiResponse({
    status: 200,
    description: 'Modules retrieved successfully from Python service',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        total_modules: { type: 'number', example: 0 },
        modules: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              module_id: { type: 'string', example: 'string' },
              module_title: { type: 'string', example: 'string' },
              author: { type: 'string', example: 'string' },
              teaching_unit: { type: 'string', example: 'string' },
              semester: { type: 'string', example: 'string' },
              difficulty_level: { type: 'string', example: 'string' },
              estimated_duration: { type: 'number', example: 0 },
              pedagogical_tags: {
                type: 'array',
                items: { type: 'string' },
                example: [],
              },
              keywords: {
                type: 'array',
                items: { type: 'string' },
                example: [],
              },
              theoretical_concepts: {
                type: 'array',
                items: { type: 'string' },
                example: [],
              },
              bibliography: {
                type: 'array',
                items: { type: 'string' },
                example: [],
              },
              prerequisites: {
                type: 'array',
                items: { type: 'string' },
                example: [],
              },
              description: { type: 'string', example: 'string' },
              upload_date: { type: 'string', example: 'string' },
              namespace: { type: 'string', example: 'string' },
              total_chunks: { type: 'number', example: 0 },
              vector_count: { type: 'number', example: 0 },
            },
          },
        },
        index_name: { type: 'string', example: 'string' },
        total_vectors: { type: 'number', example: 0 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Python service error',
  })
  async getModulesFromPythonService(@User() user: JWTUserPayload) {
    return this.modulesService.getModulesFromPythonService();
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

  @Patch('sequence')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Update module sequence' })
  @ApiBody({ type: UpdateModuleSequenceDto })
  @ApiResponse({ status: 200, description: 'Module sequence updated successfully' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async updateModuleSequence(
    @Body() updateSequenceDto: UpdateModuleSequenceDto,
    @User() user: JWTUserPayload,
  ) {
    return this.modulesService.updateModuleSequence(
      updateSequenceDto.module_id,
      updateSequenceDto.sequence,
      user,
      updateSequenceDto.school_id,
    );
  }

  @Patch('sequence/bulk')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Bulk update module sequences' })
  @ApiBody({ type: BulkUpdateModuleSequenceDto })
  @ApiResponse({ status: 200, description: 'Module sequences updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async bulkUpdateModuleSequences(
    @Body() bulkUpdateDto: BulkUpdateModuleSequenceDto,
    @User() user: JWTUserPayload,
  ) {
    return this.modulesService.bulkUpdateModuleSequences(
      bulkUpdateDto.updates,
      user,
      bulkUpdateDto.school_id,
    );
  }

  // ==================== DATABASE AUDIT & MAINTENANCE ENDPOINTS ====================

  @Get('audit/database')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: '[ADMIN] Audit school database for module/chapter issues',
    description:
      'Scans the school database to identify: orphaned modules (0 chapters), duplicate module titles, and data integrity issues. Use this before running migrations or cleanup.',
  })
  @ApiResponse({
    status: 200,
    description: 'Database audit completed successfully',
    schema: {
      example: {
        school_id: '507f1f77bcf86cd799439011',
        school_name: 'Psychology University',
        total_modules: 15,
        modules_with_chapters: 12,
        modules_without_chapters: 3,
        orphaned_modules: [
          {
            module_id: '690bee8cafd51a0922669890',
            title: 'Introduction to Psychology',
            chapter_count: 0,
            created_at: '2024-01-15T10:30:00Z',
            year: 1,
          },
        ],
        duplicate_module_titles: [
          {
            title: 'introduction to psychology',
            modules: [
              {
                module_id: '68bd8c756d00b1177b17ee7c',
                title: 'Introduction to Psychology',
                chapter_count: 4,
                created_at: '2023-12-01T10:00:00Z',
                year: 1,
              },
              {
                module_id: '690bee8cafd51a0922669890',
                title: 'Introduction to Psychology',
                chapter_count: 0,
                created_at: '2024-01-15T10:30:00Z',
                year: 1,
              },
            ],
            total_duplicates: 2,
            has_chapters_conflict: true,
          },
        ],
        recommendations: [
          'Found 3 modules with 0 chapters. Consider deleting or migrating data.',
          'Found 1 duplicate module titles where some have chapters and some don\'t. Use the migration endpoint to consolidate.',
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async auditDatabase(@User() user: JWTUserPayload) {
    return this.databaseAuditService.auditSchoolModules(user);
  }

  @Post('audit/migrate-chapters')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: '[ADMIN] Migrate chapters from one module to another',
    description:
      'Moves all chapters from a source module to a target module. Useful for consolidating duplicate modules. Optionally deletes the source module after migration.',
  })
  @ApiBody({ type: MigrateChaptersDto })
  @ApiResponse({
    status: 200,
    description: 'Chapters migrated successfully',
    schema: {
      example: {
        success: true,
        message: 'Successfully migrated 4 chapters from Introduction to Psychology to Introduction to Psychology',
        chapters_migrated: 4,
        source_module_id: '68bd8c756d00b1177b17ee7c',
        target_module_id: '690bee8cafd51a0922669890',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  async migrateChapters(
    @Body() migrateDto: MigrateChaptersDto,
    @User() user: JWTUserPayload,
  ) {
    return this.databaseAuditService.migrateChapters(
      migrateDto.source_module_id,
      migrateDto.target_module_id,
      user,
      migrateDto.delete_source_module || false,
    );
  }

  @Delete('audit/orphaned-modules')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: '[ADMIN] Delete orphaned modules (modules with 0 chapters)',
    description:
      'Removes all modules that have no associated chapters. By default, performs soft delete (sets deleted_at). Use hard_delete=true to permanently remove.',
  })
  @ApiBody({ type: DeleteOrphanedModulesDto })
  @ApiResponse({
    status: 200,
    description: 'Orphaned modules deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Successfully soft-deleted 3 orphaned modules',
        modules_deleted: 3,
        deleted_module_ids: [
          '690bee8cafd51a0922669890',
          '690bee8cafd51a0922669891',
          '690bee8cafd51a0922669892',
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async deleteOrphanedModules(
    @Body() deleteDto: DeleteOrphanedModulesDto,
    @User() user: JWTUserPayload,
  ) {
    return this.databaseAuditService.deleteOrphanedModules(
      user,
      deleteDto.hard_delete || false,
    );
  }

}
