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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { AnchorTagService } from './anchor-tag.service';
import { StudentAnchorTagAttemptService } from './student-anchor-tag-attempt.service';
import { CreateAnchorTagDto } from './dto/create-anchor-tag.dto';
import { UpdateAnchorTagDto } from './dto/update-anchor-tag.dto';
import { AnchorTagFilterDto } from './dto/anchor-tag-filter.dto';
import { SubmitAnchorTagAnswerDto } from './dto/submit-anchor-tag-answer.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { AnchorTagAttemptStatusEnum } from 'src/common/constants/anchor-tag.constant';
import { User } from 'src/common/decorators/user.decorator';

@ApiTags('Anchor Tags')
@Controller('anchor-tags')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiBearerAuth()
export class AnchorTagController {
  constructor(
    private readonly anchorTagService: AnchorTagService,
    private readonly studentAnchorTagAttemptService: StudentAnchorTagAttemptService,
  ) {}

  @Post()
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a new anchor tag' })
  @ApiResponse({
    status: 201,
    description: 'Anchor tag created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data provided',
  })
  @ApiResponse({
    status: 404,
    description:
      'Not found - Module, chapter, bibliography, or quiz group not found',
  })
  create(
    @Body() createAnchorTagDto: CreateAnchorTagDto,
    @User() user: JWTUserPayload,
  ) {
    return this.anchorTagService.createAnchorTag(createAnchorTagDto, user);
  }

  @Get()
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.STUDENT)
  @ApiOperation({
    summary: 'Get all anchor tags with pagination and filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Anchor tags retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - School not found',
  })
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query() filterDto: AnchorTagFilterDto,
    @User() user: JWTUserPayload,
  ) {
    return this.anchorTagService.findAllAnchorTags(
      user,
      paginationDto,
      filterDto,
    );
  }

  @Get('bibliography/:bibliographyId')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Get anchor tags by bibliography ID' })
  @ApiResponse({
    status: 200,
    description: 'Anchor tags retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - School or bibliography not found',
  })
  findByBibliography(
    @Param('bibliographyId') bibliographyId: string,
    @User() user: JWTUserPayload,
  ) {
    return this.anchorTagService.getAnchorTagsByBibliography(
      bibliographyId,
      user,
    );
  }

  @Get(':id')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Get anchor tag by ID' })
  @ApiResponse({
    status: 200,
    description: 'Anchor tag retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Anchor tag or school not found',
  })
  findOne(@Param('id') id: string, @User() user: JWTUserPayload) {
    return this.anchorTagService.findAnchorTagById(id, user);
  }

  @Patch(':id')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update anchor tag by ID' })
  @ApiResponse({
    status: 200,
    description: 'Anchor tag updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data provided',
  })
  @ApiResponse({
    status: 404,
    description:
      'Not found - Anchor tag, school, or related entities not found',
  })
  update(
    @Param('id') id: string,
    @Body() updateAnchorTagDto: UpdateAnchorTagDto,
    @User() user: JWTUserPayload,
  ) {
    return this.anchorTagService.updateAnchorTag(id, updateAnchorTagDto, user);
  }

  @Delete(':id')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Delete anchor tag by ID' })
  @ApiResponse({
    status: 200,
    description: 'Anchor tag deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Anchor tag or school not found',
  })
  remove(@Param('id') id: string, @User() user: JWTUserPayload) {
    return this.anchorTagService.removeAnchorTag(id, user);
  }

  // Student endpoints for anchor tag interactions
  @Post(':id/start')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Start an anchor tag attempt' })
  @ApiResponse({
    status: 201,
    description: 'Anchor tag attempt started successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Anchor tag, school, or student not found',
  })
  startAttempt(@Param('id') id: string, @User() user: JWTUserPayload) {
    return this.studentAnchorTagAttemptService.startAnchorTagAttempt(id, user);
  }

  @Post(':id/submit')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Submit an answer for an anchor tag' })
  @ApiResponse({
    status: 200,
    description: 'Answer submitted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data or no in-progress attempt',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Anchor tag, school, student, or quiz not found',
  })
  submitAnswer(
    @Param('id') id: string,
    @Body() submitAnswerDto: SubmitAnchorTagAnswerDto,
    @User() user: JWTUserPayload,
  ) {
    return this.studentAnchorTagAttemptService.submitAnchorTagAnswer(
      id,
      submitAnswerDto,
      user,
    );
  }

  @Post(':id/skip')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Skip an anchor tag (only for optional tags)' })
  @ApiResponse({
    status: 200,
    description: 'Anchor tag skipped successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Cannot skip mandatory anchor tags',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Anchor tag, school, or student not found',
  })
  skipAnchorTag(@Param('id') id: string, @User() user: JWTUserPayload) {
    return this.studentAnchorTagAttemptService.skipAnchorTag(id, user);
  }

  @Get('student/attempts')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Get student anchor tag attempts' })
  @ApiResponse({
    status: 200,
    description: 'Student anchor tag attempts retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - School or student not found',
  })
  getStudentAttempts(
    @Query()
    filterDto: {
      anchor_tag_id?: string;
      bibliography_id?: string;
      module_id?: string;
      chapter_id?: string;
      status?: AnchorTagAttemptStatusEnum;
    },
    @User() user: JWTUserPayload,
  ) {
    return this.studentAnchorTagAttemptService.getStudentAnchorTagAttempts(
      user,
      filterDto,
    );
  }
}
