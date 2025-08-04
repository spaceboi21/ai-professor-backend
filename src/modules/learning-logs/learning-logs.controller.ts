import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  Logger,
  Res,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { LearningLogsService } from './learning-logs.service';
import { LearningLogsFilterDto } from './dto/learning-logs-filter.dto';
import { LearningLogsResponseDto } from './dto/learning-logs-response.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateLearningLogReviewDto } from './dto/create-learning-log-review.dto';
import { LearningLogReviewResponseDto } from './dto/learning-log-review-response.dto';
import { LearningLogsExportResponseDto } from './dto/learning-logs-export-response.dto';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('Learning Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('learning-logs')
export class LearningLogsController {
  private readonly logger = new Logger(LearningLogsController.name);

  constructor(private readonly learningLogsService: LearningLogsService) {}

  @Get()
  @Roles(RoleEnum.STUDENT, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR, RoleEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get learning logs',
    description: 'Get learning logs with role-based access control. Students can only see their own logs, while school admins can see all students\' logs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Learning logs retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { 
            $ref: '#/components/schemas/LearningLogsResponseDto',
            properties: {
              student: { $ref: '#/components/schemas/StudentDetailsDto' },
              module: { $ref: '#/components/schemas/ModuleDetailsDto' },
              session: { $ref: '#/components/schemas/SessionDetailsDto' },
            }
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
            hasNext: { type: 'boolean' },
            hasPrev: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiQuery({
    name: 'module_title',
    required: false,
    type: String,
    description: 'Filter by module title',
  })
  @ApiQuery({
    name: 'module_id',
    required: false,
    type: String,
    description: 'Filter by module ID',
  })
  @ApiQuery({
    name: 'skill_gap',
    required: false,
    type: String,
    description: 'Filter by skill gap type',
  })
  @ApiQuery({
    name: 'start_date',
    required: false,
    type: String,
    description: 'Filter by start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    type: String,
    description: 'Filter by end date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'student_name',
    required: false,
    type: String,
    description: 'Filter by student name (school admin only)',
  })
  async getLearningLogs(
    @User() user: JWTUserPayload,
    @Query() filterDto: LearningLogsFilterDto,
    @Query() paginationDto: PaginationDto,
  ) {
    this.logger.log(`User ${user.id} (${user.role.name}) requesting learning logs`);
    return this.learningLogsService.getLearningLogs(user, filterDto, paginationDto);
  }

  @Get('export')
  @Roles(RoleEnum.STUDENT, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR, RoleEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Export learning logs to CSV',
    description: 'Export all learning logs to CSV format with applied filters. Students can only export their own logs, while school admins and professors can export all students\' logs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Learning logs exported successfully',
    type: LearningLogsExportResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No learning logs found for export',
  })
  @ApiQuery({
    name: 'text',
    required: false,
    type: String,
    description: 'Filter by text in module title or description (case-insensitive regex)',
  })
  @ApiQuery({
    name: 'module_id',
    required: false,
    type: String,
    description: 'Filter by specific module ID',
  })
  @ApiQuery({
    name: 'skill_gap',
    required: false,
    type: String,
    description: 'Filter by skill gap type',
  })
  @ApiQuery({
    name: 'start_date',
    required: false,
    type: String,
    description: 'Filter by start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    type: String,
    description: 'Filter by end date (YYYY-MM-DD)',
  })
  async exportLearningLogs(
    @User() user: JWTUserPayload,
    @Query() filterDto: LearningLogsFilterDto,
  ): Promise<LearningLogsExportResponseDto> {
    this.logger.log(`User ${user.id} (${user.role.name}) exporting learning logs`);
    return this.learningLogsService.exportLearningLogs(user, filterDto);
  }

  @Get('download/:filename')
  @Roles(RoleEnum.STUDENT, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR, RoleEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Download exported CSV file',
    description: 'Download a previously exported CSV file by filename.',
  })
  @ApiResponse({
    status: 200,
    description: 'File downloaded successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  @ApiParam({
    name: 'filename',
    description: 'CSV filename to download',
    example: 'learning-logs-export_2024-01-15T10-30-00-000Z.csv',
  })
  async downloadCSVFile(
    @Param('filename') filename: string,
    @Res() res: Response,
    @User() user: JWTUserPayload,
  ) {
    this.logger.log(`User ${user.id} (${user.role.name}) downloading file: ${filename}`);

    // Validate filename to prevent directory traversal
    if (!filename.endsWith('.csv') || filename.includes('..') || filename.includes('/')) {
      throw new NotFoundException('Invalid filename');
    }

    try {
      // Get file content using CSVUtil
      const { content, contentType } = await this.learningLogsService.getCSVFileContent(filename);

      // Set response headers for file download
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', content.length.toString());

      // Send the file content
      res.send(content);
    } catch (error) {
      this.logger.error(`Failed to download CSV file ${filename}: ${error.message}`);
      throw new NotFoundException('File not found or could not be downloaded');
    }
  }

  @Get('stats/skill-gaps')
  @Roles(RoleEnum.STUDENT, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR, RoleEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get skill gap statistics',
    description: 'Get statistics about skill gaps identified in learning logs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Skill gap statistics retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          skill_gap: { type: 'string' },
          count: { type: 'number' },
        },
      },
    },
  })
  async getSkillGapStats(@User() user: JWTUserPayload) {
    this.logger.log(`User ${user.id} (${user.role.name}) requesting skill gap statistics`);
    return this.learningLogsService.getSkillGapStats(user);
  }

  @Get(':id')
  @Roles(RoleEnum.STUDENT, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR, RoleEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get learning log by ID',
    description: 'Get a specific learning log by ID with role-based access control.',
  })
  @ApiResponse({
    status: 200,
    description: 'Learning log retrieved successfully',
    type: LearningLogsResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Learning log not found',
  })
  @ApiParam({
    name: 'id',
    description: 'Learning log ID',
    example: '507f1f77bcf86cd799439011',
  })
  async getLearningLogById(
    @Param('id') id: string,
    @User() user: JWTUserPayload,
  ): Promise<LearningLogsResponseDto> {
    this.logger.log(`User ${user.id} (${user.role.name}) requesting learning log ${id}`);
    return this.learningLogsService.getLearningLogById(id, user);
  }

  

  @Post(':id/review')
  @Roles(RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR, RoleEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Review a learning log',
    description: 'Create a review for a learning log. Only school admins, professors, and super admins can review learning logs.',
  })
  @ApiResponse({
    status: 201,
    description: 'Learning log review created successfully',
    type: LearningLogReviewResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data or user already reviewed this learning log',
  })
  @ApiResponse({
    status: 404,
    description: 'Learning log not found',
  })
  @ApiParam({
    name: 'id',
    description: 'Learning log ID',
    example: '507f1f77bcf86cd799439011',
  })
  async createLearningLogReview(
    @Param('id') id: string,
    @Body() createReviewDto: CreateLearningLogReviewDto,
    @User() user: JWTUserPayload,
  ): Promise<LearningLogReviewResponseDto> {
    this.logger.log(`User ${user.id} (${user.role.name}) creating review for learning log ${id}`);
    return this.learningLogsService.createLearningLogReview(id, createReviewDto, user);
  }

  @Get(':id/review')
  @Roles(RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR, RoleEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get user review for a learning log',
    description: 'Get the current user\'s review for a specific learning log.',
  })
  @ApiResponse({
    status: 200,
    description: 'Review retrieved successfully',
    type: LearningLogReviewResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  @ApiParam({
    name: 'id',
    description: 'Learning log ID',
    example: '507f1f77bcf86cd799439011',
  })
  async getLearningLogReview(
    @Param('id') id: string,
    @User() user: JWTUserPayload,
  ): Promise<LearningLogReviewResponseDto | null> {
    this.logger.log(`User ${user.id} (${user.role.name}) requesting review for learning log ${id}`);
    return this.learningLogsService.getLearningLogReview(id, user);
  }
} 