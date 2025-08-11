import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  Res,
  NotFoundException,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { CommunityService } from './community.service';
import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { ReportContentDto } from './dto/report-content.dto';
import { DiscussionFilterDto } from './dto/discussion-filter.dto';
import { CreateForumAttachmentDto } from './dto/forum-attachment.dto';
import { DeleteForumAttachmentDto } from './dto/delete-forum-attachment.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { LikeEntityTypeEnum } from 'src/database/schemas/tenant/forum-like.schema';
import { AttachmentEntityTypeEnum } from 'src/database/schemas/tenant/forum-attachment.schema';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { PinDiscussionDto } from './dto/pin-discussion.dto';
import { SchoolMembersFilterDto } from './dto/school-members-filter.dto';
import { ExportDiscussionsDto } from './dto/export-discussions.dto';
import { ExportDiscussionsResponseDto } from './dto/export-discussions-response.dto';
import { Response } from 'express';

@ApiTags('Community')
@Controller('community')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiBearerAuth()
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Post('discussions')
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.PROFESSOR,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Create a new forum discussion' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Discussion created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - insufficient permissions',
  })
  async createDiscussion(
    @Body() createDiscussionDto: CreateDiscussionDto,
    @Request() req: any,
  ) {
    return this.communityService.createDiscussion(
      createDiscussionDto,
      req.user as JWTUserPayload,
    );
  }

  @Get('discussions')
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.PROFESSOR,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.SUPER_ADMIN,
  )
  @ApiOperation({
    summary: 'Get all discussions with filtering and pagination',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Discussions retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - insufficient permissions',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['discussion', 'question', 'case_study', 'announcement', 'meeting'],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'archived', 'reported', 'deleted'],
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'tags', required: false, type: [String] })
  @ApiQuery({ name: 'author_id', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAllDiscussions(
    @Query() filterDto: DiscussionFilterDto,
    @Query() paginationDto: PaginationDto,
    @Request() req: any,
  ) {
    return this.communityService.findAllDiscussions(
      req.user as JWTUserPayload,
      filterDto,
      paginationDto,
    );
  }

  @Get('discussions/:id')
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.PROFESSOR,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get a single discussion by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Discussion retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Discussion not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Discussion ID' })
  async findDiscussionById(@Param('id') id: string, @Request() req: any) {
    return this.communityService.findDiscussionById(
      id,
      req.user as JWTUserPayload,
    );
  }

  @Post('replies')
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.PROFESSOR,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Create a reply to a discussion' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Reply created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - insufficient permissions',
  })
  async createReply(
    @Body() createReplyDto: CreateReplyDto,
    @Request() req: any,
  ) {
    return this.communityService.createReply(
      createReplyDto,
      req.user as JWTUserPayload,
    );
  }

  @Get('discussions/:id/replies')
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.PROFESSOR,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get replies for a discussion' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Replies retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Discussion ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findRepliesByDiscussionId(
    @Param('id') id: string,
    @Query() paginationDto: PaginationDto,
    @Request() req: any,
  ) {
    return this.communityService.findRepliesByDiscussionId(
      id,
      req.user as JWTUserPayload,
      paginationDto,
    );
  }

  @Get('replies/:id/sub-replies')
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.PROFESSOR,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get sub-replies for a specific reply' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sub-replies retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Parent reply not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Reply ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findSubRepliesByReplyId(
    @Param('id') id: string,
    @Query() paginationDto: PaginationDto,
    @Request() req: any,
  ) {
    return this.communityService.findSubRepliesByReplyId(
      id,
      req.user as JWTUserPayload,
      paginationDto,
    );
  }

  @Post('like/:entityType/:entityId')
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.PROFESSOR,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Like or unlike a discussion or reply' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Like toggled successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - insufficient permissions',
  })
  @ApiParam({
    name: 'entityType',
    enum: LikeEntityTypeEnum,
    description: 'Type of entity (discussion or reply)',
  })
  @ApiParam({ name: 'entityId', description: 'Entity ID' })
  async toggleLike(
    @Param('entityType') entityType: LikeEntityTypeEnum,
    @Param('entityId') entityId: string,
    @Request() req: any,
  ) {
    return this.communityService.toggleLike(
      entityType,
      entityId,
      req.user as JWTUserPayload,
    );
  }

  @Post('report')
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.PROFESSOR,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Report inappropriate content' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Content reported successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Content already reported by this user',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - insufficient permissions',
  })
  async reportContent(
    @Body() reportContentDto: ReportContentDto,
    @Request() req: any,
  ) {
    return this.communityService.reportContent(
      reportContentDto,
      req.user as JWTUserPayload,
    );
  }

  @Get('reports')
  @Roles(RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all reports (admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reports retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - admin only',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getReports(@Query() paginationDto: PaginationDto, @Request() req: any) {
    return this.communityService.getReports(
      req.user as JWTUserPayload,
      paginationDto,
    );
  }

  @Post('discussions/:id/archive')
  @Roles(RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Archive a discussion (admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Discussion archived successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - admin only',
  })
  @ApiParam({ name: 'id', description: 'Discussion ID' })
  async archiveDiscussion(@Param('id') id: string, @Request() req: any) {
    return this.communityService.archiveDiscussion(
      id,
      req.user as JWTUserPayload,
    );
  }

  @Get('unread-counts')
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.PROFESSOR,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get unread counts for forum content' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Unread counts retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - insufficient permissions',
  })
  async getUnreadCounts(@Request() req: any) {
    return this.communityService.getUnreadCounts(req.user as JWTUserPayload);
  }

  @Post('discussions/toggle-pin')
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.PROFESSOR,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Toggle pin status for a discussion' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pin status toggled successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Discussion not found or not accessible',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - insufficient permissions',
  })
  async togglePin(
    @Body() pinDiscussionDto: PinDiscussionDto,
    @Request() req: any,
  ) {
    return this.communityService.togglePin(
      pinDiscussionDto,
      req.user as JWTUserPayload,
    );
  }

  @Get('discussions/pinned')
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.PROFESSOR,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get pinned discussions for the current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pinned discussions retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - insufficient permissions',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPinnedDiscussions(
    @Query() paginationDto: PaginationDto,
    @Request() req: any,
  ) {
    return this.communityService.getPinnedDiscussions(
      req.user as JWTUserPayload,
      paginationDto,
    );
  }

  @Get('discussions/:id/pin-status')
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.PROFESSOR,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.SUPER_ADMIN,
  )
  @ApiOperation({
    summary: 'Check if a discussion is pinned by the current user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pin status retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Discussion ID' })
  async isDiscussionPinned(@Param('id') id: string, @Request() req: any) {
    return this.communityService.isDiscussionPinned(
      id,
      req.user as JWTUserPayload,
    );
  }

  @Get('mentions')
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.PROFESSOR,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get all school members for mention autocomplete' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'School members retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - insufficient permissions',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term for name or email',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['STUDENT', 'PROFESSOR', 'SCHOOL_ADMIN'],
    description: 'Filter by member role',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: String,
    description: 'Limit number of results (default: 50, max: 100)',
  })
  async getSchoolMembersForMentions(
    @Query() filterDto: SchoolMembersFilterDto,
    @Request() req: any,
  ) {
    return this.communityService.getSchoolMembersForMentions(
      req.user as JWTUserPayload,
      filterDto,
    );
  }

  @Post('discussions/export')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Export discussions to CSV format',
    description:
      'Export discussions with filters to CSV format. Students cannot access this functionality.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Discussions exported successfully',
    type: ExportDiscussionsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - Students cannot export discussions',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No discussions found for export',
  })
  async exportDiscussions(
    @Body() exportDto: ExportDiscussionsDto,
    @Request() req: any,
  ) {
    return this.communityService.exportDiscussions(
      req.user as JWTUserPayload,
      exportDto,
    );
  }

  @Post('discussions/export-direct')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Export discussions to CSV format (direct download)',
    description:
      'Export discussions with filters to CSV format and download directly without saving to server. Students cannot access this functionality.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CSV file downloaded successfully',
    headers: {
      'Content-Type': {
        description: 'Content type of the exported file',
        example: 'text/csv',
      },
      'Content-Disposition': {
        description: 'File attachment header with filename',
        example:
          'attachment; filename="discussions-export_2024-01-15T10-30-00-000Z.csv"',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - Students cannot export discussions',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No discussions found for export',
  })
  async exportDiscussionsDirect(
    @Body() exportDto: ExportDiscussionsDto,
    @Res() res: Response,
    @Request() req: any,
  ) {
    const exportData = await this.communityService.exportDiscussionsDirect(
      req.user as JWTUserPayload,
      exportDto,
    );

    res.setHeader('Content-Type', exportData.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${exportData.filename}"`,
    );
    res.setHeader('Content-Length', exportData.content.length.toString());

    res.send(exportData.content);
  }

  @Post('discussions/export-base64')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Export discussions to CSV format (base64 encoded)',
    description:
      'Export discussions with filters to CSV format and return as base64 encoded string. Students cannot access this functionality.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CSV data returned as base64 encoded string',
    schema: {
      type: 'object',
      properties: {
        base64Content: {
          type: 'string',
          description: 'Base64 encoded CSV content',
        },
        filename: {
          type: 'string',
          description: 'Generated filename',
        },
        recordCount: {
          type: 'number',
          description: 'Number of records exported',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - Students cannot export discussions',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No discussions found for export',
  })
  async exportDiscussionsBase64(
    @Body() exportDto: ExportDiscussionsDto,
    @Request() req: any,
  ) {
    return this.communityService.exportDiscussionsBase64(
      req.user as JWTUserPayload,
      exportDto,
    );
  }

  @Get('download/:filename')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Download exported CSV file',
    description: 'Download a previously exported CSV file by filename.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File downloaded successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'File not found',
  })
  @ApiParam({
    name: 'filename',
    description: 'CSV filename to download',
    example: 'discussions-export_2024-01-15T10-30-00-000Z.csv',
  })
  async downloadExportedFile(
    @Param('filename') filename: string,
    @Res() res: Response,
    @Request() req: any,
  ) {
    // Validate filename to prevent directory traversal
    if (
      !filename.endsWith('.csv') ||
      filename.includes('..') ||
      filename.includes('/') ||
      !filename.includes('discussions-export')
    ) {
      throw new NotFoundException('Invalid filename');
    }

    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = `/tmp/ai-professor-exports/${filename}`;

      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('File not found');
      }

      const fileContent = fs.readFileSync(filePath);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.setHeader('Content-Length', fileContent.length.toString());

      res.send(fileContent);
    } catch (error) {
      throw new NotFoundException('File not found or could not be downloaded');
    }
  }

  // Forum Attachment Endpoints

  @Post('discussions/:id/attachments')
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.PROFESSOR,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Create a forum attachment for a discussion' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Attachment created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiParam({ name: 'id', description: 'Discussion ID' })
  async createDiscussionAttachment(
    @Param('id') discussionId: string,
    @Body() createAttachmentDto: CreateForumAttachmentDto,
    @Request() req: any,
  ) {
    // Set the discussion_id from the URL parameter
    createAttachmentDto.discussion_id = discussionId;
    createAttachmentDto.entity_type = AttachmentEntityTypeEnum.DISCUSSION;

    return this.communityService.createForumAttachment(
      createAttachmentDto,
      req.user as JWTUserPayload,
    );
  }

  @Post('replies/:id/attachments')
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.PROFESSOR,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Create a forum attachment for a reply' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Attachment created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiParam({ name: 'id', description: 'Reply ID' })
  async createReplyAttachment(
    @Param('id') replyId: string,
    @Body() createAttachmentDto: CreateForumAttachmentDto,
    @Request() req: any,
  ) {
    // Set the reply_id from the URL parameter
    createAttachmentDto.reply_id = replyId;
    createAttachmentDto.entity_type = AttachmentEntityTypeEnum.REPLY;

    return this.communityService.createForumAttachment(
      createAttachmentDto,
      req.user as JWTUserPayload,
    );
  }

  @Get('discussions/:id/attachments')
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.PROFESSOR,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get attachments for a discussion' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Attachments retrieved successfully',
  })
  @ApiParam({ name: 'id', description: 'Discussion ID' })
  async getDiscussionAttachments(
    @Param('id') discussionId: string,
    @Request() req: any,
  ) {
    return this.communityService.getDiscussionAttachments(
      discussionId,
      req.user as JWTUserPayload,
    );
  }

  @Get('replies/:id/attachments')
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.PROFESSOR,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get attachments for a reply' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Attachments retrieved successfully',
  })
  @ApiParam({ name: 'id', description: 'Reply ID' })
  async getReplyAttachments(@Param('id') replyId: string, @Request() req: any) {
    return this.communityService.getReplyAttachments(
      replyId,
      req.user as JWTUserPayload,
    );
  }

  @Delete('attachments/:id')
  @Roles(
    RoleEnum.STUDENT,
    RoleEnum.PROFESSOR,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Delete a forum attachment' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Attachment deleted successfully',
  })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  async deleteAttachment(
    @Param('id') attachmentId: string,
    @Request() req: any,
  ) {
    return this.communityService.deleteForumAttachment(
      { attachment_id: attachmentId },
      req.user as JWTUserPayload,
    );
  }
}
