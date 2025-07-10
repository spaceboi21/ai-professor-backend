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
import { ModulesService } from './modules.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { DifficultyEnum } from 'src/common/constants/difficulty.constant';

@ApiTags('Modules')
@ApiBearerAuth()
@Controller('modules')
@UseGuards(JwtAuthGuard, RoleGuard)
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

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
    name: 'sortBy',
    required: false,
    enum: ['title', 'difficulty', 'created_at', 'duration'],
    description: 'Sort by field',
    example: 'title',
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
  @ApiResponse({ status: 200, description: 'Module deleted successfully' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  async removeModule(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.modulesService.removeModule(id, user);
  }
}
