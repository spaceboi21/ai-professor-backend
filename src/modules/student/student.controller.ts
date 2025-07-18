import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Query,
  Param,
  Patch,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { ResetStudentPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { User } from 'src/common/decorators/user.decorator';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiTags,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { SortingDto } from 'src/common/dto/sorting.dto';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { UpdateStatusDto } from 'src/common/dto/update-status.dto';
import { Types } from 'mongoose';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { readFileSync } from 'fs';
import { StatusEnum } from 'src/common/constants/status.constant';
import {
  StudentResponseDto,
  StudentListResponseDto,
  BulkCreateStudentResponseDto,
} from './dto/student-response.dto';

@ApiTags('Student')
@ApiBearerAuth()
@Controller('students')
@UseGuards(JwtAuthGuard, RoleGuard)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a new student' })
  @ApiBody({ type: CreateStudentDto })
  @ApiResponse({
    status: 201,
    description: 'Student created successfully',
    type: StudentResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createStudent(
    @Body() createStudentDto: CreateStudentDto,
    @User() user: JWTUserPayload,
  ) {
    return this.studentService.createStudent(createStudentDto, user);
  }

  @Post('bulk')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Bulk create students from CSV file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'CSV file containing student data (first_name, last_name, email). School ID is determined by user role and parameters.',
        },
      },
    },
  })
  @ApiQuery({
    name: 'school_id',
    required: false,
    type: String,
    description:
      'School ID (required for SUPER_ADMIN, ignored for SCHOOL_ADMIN who use their own school)',
  })
  @ApiResponse({
    status: 201,
    description: 'Bulk student creation completed',
    type: BulkCreateStudentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid CSV format or data' })
  @ApiResponse({ status: 409, description: 'Some emails already exist' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/students',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `students-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (
          file.mimetype === 'text/csv' ||
          file.originalname.endsWith('.csv')
        ) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only CSV files are allowed'), false);
        }
      },
      limits: {
        fileSize: parseInt(process.env.MAXIMUM_FILE_SIZE || '5') * 1024 * 1024, // 5MB default
      },
    }),
  )
  async bulkCreateStudents(
    @UploadedFile() file: Express.Multer.File,
    @User() user: JWTUserPayload,
    @Query('school_id') school_id?: string,
  ) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    // Validate school_id for SUPER_ADMIN
    if (user.role.name === RoleEnum.SUPER_ADMIN && !school_id) {
      throw new BadRequestException('School ID is required for super admin');
    }

    // Read the file from disk since we're using diskStorage
    const fileBuffer = readFileSync(file.path);

    const result = await this.studentService.bulkCreateStudents(
      fileBuffer,
      user,
      school_id,
    );

    return {
      message: 'Bulk student creation completed',
      data: result,
    };
  }

  @Get()
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get all students' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: StatusEnum })
  @ApiQuery({
    name: 'school_id',
    required: false,
    type: String,
    description:
      'School ID (required for SUPER_ADMIN, optional for SCHOOL_ADMIN)',
  })
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
    description: 'Students retrieved successfully',
    type: StudentListResponseDto,
  })
  async getAllStudents(
    @Query() paginationDto: PaginationDto,
    @User() user: JWTUserPayload,
    @Query('search') search?: string,
    @Query('status') status?: StatusEnum,
    @Query('school_id') school_id?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.studentService.getAllStudents(
      paginationDto,
      user,
      search,
      status,
      school_id,
      sortBy,
      sortOrder,
    );
  }

  @Get(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get student by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Student ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'school_id',
    required: false,
    type: String,
    description:
      'School ID (required for SUPER_ADMIN, optional for SCHOOL_ADMIN)',
  })
  @ApiResponse({
    status: 200,
    description: 'Student retrieved successfully',
    type: StudentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getStudentById(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
    @Query('school_id') school_id?: string,
  ) {
    return this.studentService.getStudentById(id, user, school_id);
  }

  @Patch(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update student details (including status)' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Student ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: UpdateStudentDto })
  @ApiQuery({
    name: 'school_id',
    required: false,
    type: String,
    description:
      'School ID (required for SUPER_ADMIN, optional for SCHOOL_ADMIN)',
  })
  @ApiResponse({
    status: 200,
    description: 'Student updated successfully',
    type: StudentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async updateStudent(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateStudentDto: UpdateStudentDto,
    @User() user: JWTUserPayload,
    @Query('school_id') school_id?: string,
  ) {
    return this.studentService.updateStudent(
      id,
      updateStudentDto,
      user,
      school_id,
    );
  }

  @Delete(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Delete student (soft delete)' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Student ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'school_id',
    required: false,
    type: String,
    description:
      'School ID (required for SUPER_ADMIN, optional for SCHOOL_ADMIN)',
  })
  @ApiResponse({
    status: 200,
    description: 'Student deleted successfully',
    type: StudentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async deleteStudent(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
    @Query('school_id') school_id?: string,
  ) {
    return this.studentService.deleteStudent(id, user, school_id);
  }

  @Patch(':id/status')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update student status' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Student ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: UpdateStatusDto })
  @ApiQuery({
    name: 'school_id',
    required: false,
    type: String,
    description:
      'School ID (required for SUPER_ADMIN, optional for SCHOOL_ADMIN)',
  })
  @ApiResponse({
    status: 200,
    description: 'Student status updated successfully',
    type: StudentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async updateStudentStatus(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateStatusDto: UpdateStatusDto,
    @User() user: JWTUserPayload,
    @Query('school_id') school_id?: string,
  ) {
    console.log({ user });
    return this.studentService.updateStudentStatus(
      id,
      updateStatusDto.status,
      user,
      school_id,
    );
  }

  // Reset password endpoint for students
  @Post('reset-password')
  @Roles(RoleEnum.STUDENT)
  @ApiOperation({ summary: 'Reset password for authenticated student' })
  @ApiBody({ type: ResetStudentPasswordDto })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @ApiResponse({ status: 400, description: 'Invalid old password' })
  async resetPassword(
    @Body() resetPasswordDto: ResetStudentPasswordDto,
    @User() user: JWTUserPayload,
  ) {
    return this.studentService.resetPassword(
      user.id.toString(),
      resetPasswordDto,
    );
  }
}
