import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
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
import { UpdateStatusDto } from 'src/common/dto/update-status.dto';
import { UpdateSchoolDetailsDto } from 'src/modules/school-admin/dto/update-school-details.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { SchoolsService } from './schools.service';

@ApiTags('Schools')
@ApiBearerAuth()
@Controller('schools')
@UseGuards(JwtAuthGuard, RoleGuard)
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get()
  @Roles(RoleEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all schools (Super Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Schools retrieved successfully',
  })
  async getAllSchools(
    @Query() paginationDto: PaginationDto,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.schoolsService.getAllSchools(paginationDto, search, status);
  }

  @Get(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get school by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'School ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'School retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'School not found' })
  async getSchoolById(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.schoolsService.getSchoolById(id, user);
  }

  @Patch(':id/status')
  @Roles(RoleEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update school status (Super Admin only)' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'School ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: UpdateStatusDto })
  @ApiResponse({
    status: 200,
    description: 'School status updated successfully',
  })
  @ApiResponse({ status: 404, description: 'School not found' })
  async updateSchoolStatus(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.schoolsService.updateSchoolStatus(id, updateStatusDto.status);
  }

  @Patch(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update school details' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'School ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: UpdateSchoolDetailsDto })
  @ApiResponse({
    status: 200,
    description: 'School details updated successfully',
  })
  @ApiResponse({ status: 404, description: 'School not found' })
  async updateSchoolDetails(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateSchoolDetailsDto: UpdateSchoolDetailsDto,
    @User() user: JWTUserPayload,
  ) {
    return this.schoolsService.updateSchoolDetails(
      id,
      updateSchoolDetailsDto,
      user,
    );
  }
}
