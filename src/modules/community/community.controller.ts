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
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { LikeEntityTypeEnum } from 'src/database/schemas/tenant/forum-like.schema';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';

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
}
