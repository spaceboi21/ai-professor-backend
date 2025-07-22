import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { BibliographyService } from './bibliography.service';
import { CreateBibliographyDto } from './dto/create-bibliography.dto';
import { UpdateBibliographyDto } from './dto/update-bibliography.dto';
import { BibliographyFilterDto } from './dto/bibliography-filter.dto';
import { ReorderBibliographyItemsDto } from './dto/reorder-bibliography.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { User } from 'src/common/decorators/user.decorator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@ApiTags('Bibliography')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('bibliography')
export class BibliographyController {
  private readonly logger = new Logger(BibliographyController.name);

  constructor(private readonly bibliographyService: BibliographyService) {}

  @Post()
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a new bibliography item' })
  @ApiResponse({
    status: 201,
    description: 'Bibliography created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Module or Chapter not found' })
  @ApiResponse({ status: 409, description: 'Sequence conflict' })
  async createBibliography(
    @Body() createBibliographyDto: CreateBibliographyDto,
    @User() user: JWTUserPayload,
  ) {
    return this.bibliographyService.createBibliography(
      createBibliographyDto,
      user,
    );
  }

  @Get()
  @Roles(
    RoleEnum.SUPER_ADMIN,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.PROFESSOR,
    RoleEnum.STUDENT,
  )
  @ApiOperation({
    summary: 'Get all bibliography items with filtering and sorting',
  })
  @ApiQuery({
    name: 'module_id',
    required: false,
    type: String,
    description: 'Optional filter by module ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'chapter_id',
    required: false,
    type: String,
    description: 'Optional filter by chapter ID',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiQuery({
    name: 'text',
    required: false,
    type: String,
    description: 'Search text in title and description',
    example: 'psychology',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['PDF', 'VIDEO', 'SLIDE', 'CASE_STUDY', 'IMAGE', 'LINK'],
    description: 'Filter by bibliography type',
    example: 'PDF',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['title', 'type', 'duration', 'sequence', 'created_at'],
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
  @ApiResponse({
    status: 200,
    description: 'Bibliography retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async findAllBibliography(
    @User() user: JWTUserPayload,
    @Query('module_id', ParseObjectIdPipe) module_id?: string | Types.ObjectId,
    @Query('chapter_id', ParseObjectIdPipe)
    chapter_id?: string | Types.ObjectId,
    @Query() paginationDto?: PaginationDto,
    @Query() filterDto?: BibliographyFilterDto,
  ) {
    // Merge query parameters into filterDto
    const mergedFilterDto = {
      ...filterDto,
      ...(module_id && { module_id }),
      ...(chapter_id && { chapter_id }),
    };

    return this.bibliographyService.findAllBibliography(
      user,
      paginationDto,
      mergedFilterDto,
    );
  }

  @Get(':id')
  @Roles(
    RoleEnum.SUPER_ADMIN,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.PROFESSOR,
    RoleEnum.STUDENT,
  )
  @ApiOperation({ summary: 'Get bibliography by ID' })
  @ApiParam({
    name: 'id',
    description: 'Bibliography ID',
    example: '507f1f77bcf86cd799439013',
  })
  @ApiResponse({
    status: 200,
    description: 'Bibliography retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Bibliography not found' })
  async findBibliographyById(
    @Param('id', ParseObjectIdPipe) id: string | Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.bibliographyService.findBibliographyById(id, user);
  }

  @Patch(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update bibliography by ID' })
  @ApiParam({
    name: 'id',
    description: 'Bibliography ID',
    example: '507f1f77bcf86cd799439013',
  })
  @ApiResponse({
    status: 200,
    description: 'Bibliography updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Bibliography not found' })
  @ApiResponse({ status: 409, description: 'Sequence conflict' })
  async updateBibliography(
    @Param('id', ParseObjectIdPipe) id: string | Types.ObjectId,
    @Body() updateBibliographyDto: UpdateBibliographyDto,
    @User() user: JWTUserPayload,
  ) {
    return this.bibliographyService.updateBibliography(
      id,
      updateBibliographyDto,
      user,
    );
  }

  @Delete(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Delete bibliography by ID (soft delete)' })
  @ApiParam({
    name: 'id',
    description: 'Bibliography ID',
    example: '507f1f77bcf86cd799439013',
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
    description: 'Bibliography deleted successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Bibliography not found' })
  async deleteBibliography(
    @Param('id', ParseObjectIdPipe) id: string | Types.ObjectId,
    @User() user: JWTUserPayload,
    @Query('school_id') school_id?: string,
  ) {
    return this.bibliographyService.deleteBibliography(id, user, school_id);
  }

  @Post('reorder')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Reorder bibliography items' })
  @ApiResponse({
    status: 200,
    description: 'Bibliography items reordered successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 404,
    description: 'One or more bibliography items not found',
  })
  async reorderBibliography(
    @Body() reorderBibliographyItemsDto: ReorderBibliographyItemsDto,
    @User() user: JWTUserPayload,
  ) {
    return this.bibliographyService.reorderBibliography(
      reorderBibliographyItemsDto,
      user,
    );
  }
}
