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
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { CreateQuizGroupDto } from './dto/create-quiz-group.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { QuizFilterDto, QuizGroupFilterDto } from './dto/quiz-filter.dto';
import { UpdateQuizGroupDto } from './dto/update-quiz-group.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { QuizService } from './quiz.service';

@ApiTags('Quiz')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  // ========== QUIZ GROUP ENDPOINTS ==========

  @Post('groups')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Create a new quiz group',
    description: 'Creates a new quiz group for a module or chapter',
  })
  @ApiResponse({
    status: 201,
    description: 'Quiz group created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Module or chapter not found',
  })
  createQuizGroup(
    @Body() createQuizGroupDto: CreateQuizGroupDto,
    @User() user: JWTUserPayload,
  ) {
    return this.quizService.createQuizGroup(createQuizGroupDto, user);
  }

  @Get('groups')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.STUDENT)
  @ApiOperation({
    summary: 'Get all quiz groups',
    description: 'Retrieve paginated list of quiz groups with optional filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz groups retrieved successfully',
  })
  findAllQuizGroups(
    @Query() filterDto: QuizGroupFilterDto,
    @User() user: JWTUserPayload,
  ) {
    return this.quizService.findAllQuizGroups(user, filterDto);
  }

  @Get('groups/:id')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.STUDENT)
  @ApiOperation({
    summary: 'Get a quiz group by ID',
    description: 'Retrieve a specific quiz group with its details',
  })
  @ApiParam({
    name: 'id',
    description: 'Quiz group ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz group retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz group not found',
  })
  findQuizGroupById(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.quizService.findQuizGroupById(id, user);
  }

  @Patch('groups/:id')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Update a quiz group',
    description: 'Update an existing quiz group',
  })
  @ApiParam({
    name: 'id',
    description: 'Quiz group ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz group updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz group not found',
  })
  updateQuizGroup(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateQuizGroupDto: UpdateQuizGroupDto,
    @User() user: JWTUserPayload,
  ) {
    return this.quizService.updateQuizGroup(id, updateQuizGroupDto, user);
  }

  @Delete('groups/:id')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Delete a quiz group',
    description: 'Soft delete a quiz group and all its associated quizzes',
  })
  @ApiParam({
    name: 'id',
    description: 'Quiz group ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz group deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz group not found',
  })
  removeQuizGroup(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.quizService.removeQuizGroup(id, user);
  }

  // ========== QUIZ QUESTION ENDPOINTS ==========

  @Post('questions')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Create a new quiz question',
    description: 'Creates a new quiz question within a quiz group',
  })
  @ApiResponse({
    status: 201,
    description: 'Quiz question created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or answers not in options',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz group not found',
  })
  createQuiz(
    @Body() createQuizDto: CreateQuizDto,
    @User() user: JWTUserPayload,
  ) {
    return this.quizService.createQuiz(createQuizDto, user);
  }

  @Get('questions')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.STUDENT)
  @ApiOperation({
    summary: 'Get all quiz questions',
    description:
      'Retrieve paginated list of quiz questions with optional filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz questions retrieved successfully',
  })
  findAllQuizzes(
    @Query() filterDto: QuizFilterDto,
    @User() user: JWTUserPayload,
  ) {
    return this.quizService.findAllQuizzes(user, filterDto);
  }

  @Get('questions/:id')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.STUDENT)
  @ApiOperation({
    summary: 'Get a quiz question by ID',
    description: 'Retrieve a specific quiz question with its details',
  })
  @ApiParam({
    name: 'id',
    description: 'Quiz question ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz question retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz question not found',
  })
  findQuizById(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.quizService.findQuizById(id, user);
  }

  @Patch('questions/:id')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Update a quiz question',
    description: 'Update an existing quiz question',
  })
  @ApiParam({
    name: 'id',
    description: 'Quiz question ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz question updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz question not found',
  })
  updateQuiz(
    @Param('id') id: string,
    @Body() updateQuizDto: UpdateQuizDto,
    @User() user: JWTUserPayload,
  ) {
    return this.quizService.updateQuiz(id, updateQuizDto, user);
  }

  @Delete('questions/:id')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Delete a quiz question',
    description: 'Soft delete a quiz question',
  })
  @ApiParam({
    name: 'id',
    description: 'Quiz question ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz question deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz question not found',
  })
  removeQuiz(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.quizService.removeQuiz(id, user);
  }

  // ========== ADDITIONAL ENDPOINTS ==========

  @Get('groups/:groupId/questions')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.STUDENT)
  @ApiOperation({
    summary: 'Get all questions for a specific quiz group',
    description:
      'Retrieve all quiz questions belonging to a specific quiz group',
  })
  @ApiParam({
    name: 'groupId',
    description: 'Quiz group ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz questions retrieved successfully',
  })
  findQuizzesByGroup(
    @Param('groupId', ParseObjectIdPipe) groupId: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    const updatedFilter = { quiz_group_id: groupId };
    return this.quizService.findAllQuizzes(user, updatedFilter);
  }

  @Get('modules/:moduleId/groups')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.STUDENT)
  @ApiOperation({
    summary: 'Get all quiz groups for a specific module',
    description: 'Retrieve all quiz groups belonging to a specific module',
  })
  @ApiParam({
    name: 'moduleId',
    description: 'Module ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz groups retrieved successfully',
  })
  findQuizGroupsByModule(
    @Param('moduleId', ParseObjectIdPipe) moduleId: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    const updatedFilter = { module_id: moduleId };
    return this.quizService.findAllQuizGroups(user, updatedFilter);
  }

  @Get('chapters/:chapterId/groups')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN, RoleEnum.STUDENT)
  @ApiOperation({
    summary: 'Get all quiz groups for a specific chapter',
    description: 'Retrieve all quiz groups belonging to a specific chapter',
  })
  @ApiParam({
    name: 'chapterId',
    description: 'Chapter ID',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
    format: 'mongoId',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz groups retrieved successfully',
  })
  findQuizGroupsByChapter(
    @Param('chapterId', ParseObjectIdPipe) chapterId: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    const updatedFilter = { chapter_id: chapterId };
    return this.quizService.findAllQuizGroups(user, updatedFilter);
  }
}
