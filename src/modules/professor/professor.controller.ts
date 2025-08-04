import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
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
import { CreateProfessorDto } from './dto/create-professor.dto';
import {
  UpdateProfessorDto,
  UpdateProfessorPasswordDto,
} from './dto/update-professor.dto';
import { ProfessorService } from './professor.service';
import { UpdateStatusDto } from 'src/common/dto/update-status.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { SortingDto } from 'src/common/dto/sorting.dto';

@ApiTags('Professor')
@ApiBearerAuth()
@Controller('professor')
@UseGuards(JwtAuthGuard, RoleGuard)
export class ProfessorController {
  constructor(private readonly professorService: ProfessorService) {}

  @Post()
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a new professor' })
  @ApiBody({ type: CreateProfessorDto })
  @ApiResponse({ status: 201, description: 'Professor created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createProfessor(
    @Body() createProfessorDto: CreateProfessorDto,
    @User() user: JWTUserPayload,
  ) {
    return this.professorService.createProfessor(createProfessorDto, user);
  }

  @Patch(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Update professor details' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Professor ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: UpdateProfessorDto })
  @ApiResponse({ status: 200, description: 'Professor updated successfully' })
  @ApiResponse({ status: 404, description: 'Professor not found' })
  async updateProfessor(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateDto: UpdateProfessorDto,
  ) {
    return this.professorService.updateProfessor(id, updateDto);
  }

  @Patch('/password/:id')
  @Roles(RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Update professor password' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Professor ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: UpdateProfessorPasswordDto })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 404, description: 'Professor not found' })
  async updateProfessorPassword(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateDto: UpdateProfessorPasswordDto,
  ) {
    return this.professorService.updateProfessorPassword(id, updateDto);
  }

  @Get()
  @Roles(RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get all professors (School Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    enum: ['name', 'email', 'created_at', 'updated_at'],
    description: 'Field to sort by (name = first_name + last_name)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    enum: ['asc', 'desc'],
    description: 'Sort order (asc or desc)',
  })
  @ApiResponse({
    status: 200,
    description: 'Professors retrieved successfully',
  })
  async getAllProfessors(
    @Query() paginationDto: PaginationDto,
    @User() user: JWTUserPayload,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.professorService.getAllProfessors(
      paginationDto,
      user,
      search,
      status,
      sortBy,
      sortOrder,
    );
  }

  @Get(':id')
  @Roles(RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get professor by ID (School Admin only)' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Professor ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Professor retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Professor not found' })
  async getProfessorById(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.professorService.getProfessorById(id, user);
  }

  @Get(':id/assignments')
  @Roles(RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({
    summary: 'Get professor assignments (School Admin and Professor)',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Professor ID',
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
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
    @Query() paginationDto?: PaginationDto,
  ) {
    return this.professorService.getProfessorAssignments(
      id,
      user,
      paginationDto,
    );
  }

  @Get(':id/module-access/:moduleId')
  @Roles(RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Check professor access to a specific module' })
  @ApiParam({
    name: 'id',
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
  @ApiResponse({
    status: 200,
    description: 'Module access check completed',
  })
  @ApiResponse({ status: 404, description: 'Professor or module not found' })
  async checkProfessorModuleAccess(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Param('moduleId', ParseObjectIdPipe) moduleId: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.professorService.checkProfessorModuleAccess(id, moduleId, user);
  }

  @Patch(':id/status')
  @Roles(RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update professor status (School Admin only)' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Professor ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: UpdateStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Professor status updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Professor not found' })
  async updateProfessorStatus(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateStatusDto: UpdateStatusDto,
    @User() user: JWTUserPayload,
  ) {
    return this.professorService.updateProfessorStatus(
      id,
      updateStatusDto.status,
      user,
    );
  }

  @Delete(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Soft delete a professor' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Professor ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({ status: 200, description: 'Professor deleted successfully' })
  @ApiResponse({ status: 404, description: 'Professor not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete professor with assigned modules' })
  async deleteProfessor(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.professorService.deleteProfessor(id, user);
  }
}
