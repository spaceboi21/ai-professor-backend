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
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ProfessorsService } from './professors.service';

@ApiTags('Professors')
@ApiBearerAuth()
@Controller('professors')
@UseGuards(JwtAuthGuard, RoleGuard)
export class ProfessorsController {
  constructor(private readonly professorsService: ProfessorsService) {}

  @Get()
  @Roles(RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get all professors (School Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Professors retrieved successfully',
  })
  async getAllProfessors(
    @Query() paginationDto: PaginationDto,
    @User() user: JWTUserPayload,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.professorsService.getAllProfessors(
      paginationDto,
      user,
      search,
      status,
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
    return this.professorsService.getProfessorById(id, user);
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
    @Param('id') professorId: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @User() user: JWTUserPayload,
  ) {
    return this.professorsService.updateProfessorStatus(
      professorId,
      updateStatusDto.status,
      user,
    );
  }
}
