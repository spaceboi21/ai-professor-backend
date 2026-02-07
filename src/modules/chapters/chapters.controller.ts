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
  Request,
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
  ApiBody,
} from '@nestjs/swagger';
import { ChaptersService } from './chapters.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { ReorderChaptersDto } from './dto/reorder-chapters.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { User } from 'src/common/decorators/user.decorator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@ApiTags('Chapters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('chapters')
export class ChaptersController {
  private readonly logger = new Logger(ChaptersController.name);

  constructor(private readonly chaptersService: ChaptersService) {}

  @Post()
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a new chapter' })
  @ApiBody({ type: CreateChapterDto })
  @ApiResponse({
    status: 201,
    description: 'Chapter created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  @ApiResponse({
    status: 409,
    description: 'Sequence conflict or duplicate chapter title',
  })
  async createChapter(
    @Body() createChapterDto: CreateChapterDto,
    @User() user: JWTUserPayload,
  ) {
    return this.chaptersService.createChapter(createChapterDto, user);
  }

  @Get()
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Get all chapters or chapters by module' })
  @ApiResponse({
    status: 200,
    description: 'Chapters retrieved successfully',
  })
  @ApiQuery({
    name: 'module_id',
    required: false,
    type: String,
    description: 'Optional filter by module ID',
    example: '507f1f77bcf86cd799439011',
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
  @ApiResponse({ status: 400, description: 'Bad request' })
  async findAllChapters(
    @User() user: JWTUserPayload,
    @Query('module_id') module_id_raw?: string,
    @Query() paginationDto?: PaginationDto,
  ) {
    // Only validate module_id if it's provided
    let module_id: string | Types.ObjectId | undefined = undefined;
    if (module_id_raw && module_id_raw !== 'undefined') {
      // Validate it's a valid ObjectId
      if (!Types.ObjectId.isValid(module_id_raw)) {
        throw new BadRequestException(`Invalid module_id: ${module_id_raw}`);
      }
      module_id = module_id_raw;
    }
    
    return this.chaptersService.findAllChapters(user, module_id, paginationDto);
  }

  @Get(':id')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Get a chapter by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Chapter ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Chapter retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Chapter not found' })
  async findChapterById(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.chaptersService.findChapterById(id, user);
  }

  @Patch(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update a chapter' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Chapter ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: UpdateChapterDto })
  @ApiResponse({
    status: 200,
    description: 'Chapter updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Chapter not found' })
  @ApiResponse({
    status: 409,
    description: 'Sequence conflict or duplicate chapter title',
  })
  async updateChapter(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateChapterDto: UpdateChapterDto,
    @User() user: JWTUserPayload,
  ) {
    return this.chaptersService.updateChapter(id, updateChapterDto, user);
  }

  @Delete(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Delete a chapter' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Chapter ID',
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
    description: 'Chapter deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Chapter not found' })
  async removeChapter(
    @Param('id', ParseObjectIdPipe) id: string,
    @User() user: JWTUserPayload,
    @Query('school_id') school_id?: string,
  ) {
    return this.chaptersService.removeChapter(id, user, school_id);
  }

  @Post('reorder')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Reorder chapters' })
  @ApiBody({ type: ReorderChaptersDto })
  @ApiResponse({
    status: 200,
    description: 'Chapters reordered successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'One or more chapters not found' })
  async reorderChapters(
    @Body() reorderChaptersDto: ReorderChaptersDto,
    @User() user: JWTUserPayload,
  ) {
    return this.chaptersService.reorderChapters(reorderChaptersDto, user);
  }
}
