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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
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
            'CSV file containing student data (first_name, last_name, email)',
        },
      },
    },
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
  ) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    // Read the file from disk since we're using diskStorage
    const fileBuffer = readFileSync(file.path);

    const result = await this.studentService.bulkCreateStudents(
      fileBuffer,
      user,
    );

    return {
      message: 'Bulk student creation completed',
      data: result,
    };
  }

  @Get()
  @Roles(RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get all students (School Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: StatusEnum })
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
  ) {
    return this.studentService.getAllStudents(
      paginationDto,
      user,
      search,
      status,
    );
  }

  @Get(':id')
  @Roles(RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get student by ID (School Admin only)' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Student ID',
    example: '507f1f77bcf86cd799439011',
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
  ) {
    return this.studentService.getStudentById(id, user);
  }

  @Patch(':id/status')
  @Roles(RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update student status (School Admin only)' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Student ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: UpdateStatusDto })
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
  ) {
    return this.studentService.updateStudentStatus(
      id,
      updateStatusDto.status,
      user,
    );
  }
}
