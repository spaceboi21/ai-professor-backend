import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { EnrollmentService } from './enrollment.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { SimulationGuard } from 'src/common/guards/simulation.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  EnrollStudentModulesDto,
  EnrollStudentAcademicYearDto,
  BulkEnrollStudentsDto,
  WithdrawEnrollmentDto,
  GetEnrollmentHistoryDto,
  GetStudentEnrollmentStatusDto,
} from './dto/enroll-student.dto';
import {
  EnrollmentResponseDto,
  StudentEnrollmentStatusDto,
  EnrollmentHistoryResponseDto,
  ModuleEnrollmentSummaryDto,
  AvailableStudentDto,
  AvailableModuleDto,
} from './dto/enrollment-response.dto';

@ApiTags('Enrollment Management')
@ApiBearerAuth()
@Controller('enrollment')
@UseGuards(JwtAuthGuard, RoleGuard, SimulationGuard)
export class EnrollmentController {
  private readonly logger = new Logger(EnrollmentController.name);

  constructor(private readonly enrollmentService: EnrollmentService) {}

  // ========== ENROLLMENT OPERATIONS ==========

  @Post('enroll-modules')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enroll student in individual modules',
    description: 'Enroll a student in one or more individual modules. Creates progress records and sends notifications.',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrollment completed successfully',
    type: EnrollmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Student or module not found' })
  async enrollStudentInModules(
    @Body() dto: EnrollStudentModulesDto,
    @User() user: JWTUserPayload,
  ): Promise<EnrollmentResponseDto> {
    this.logger.log(`Enrolling student ${dto.student_id} in modules`);
    return this.enrollmentService.enrollStudentInModules(dto, user);
  }

  @Post('enroll-academic-year')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enroll student in academic year',
    description: 'Enroll a student in all published modules for a specific academic year (1-5). Preserves existing progress and skips completed/enrolled modules.',
  })
  @ApiResponse({
    status: 200,
    description: 'Academic year enrollment completed successfully',
    type: EnrollmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Student not found or no modules for year' })
  async enrollStudentInAcademicYear(
    @Body() dto: EnrollStudentAcademicYearDto,
    @User() user: JWTUserPayload,
  ): Promise<EnrollmentResponseDto> {
    this.logger.log(`Enrolling student ${dto.student_id} in academic year ${dto.academic_year}`);
    return this.enrollmentService.enrollStudentInAcademicYear(dto, user);
  }

  @Post('bulk-enroll')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk enroll multiple students',
    description: 'Enroll multiple students in modules or academic years in a single operation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk enrollment completed successfully',
    type: EnrollmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async bulkEnrollStudents(
    @Body() dto: BulkEnrollStudentsDto,
    @User() user: JWTUserPayload,
  ): Promise<EnrollmentResponseDto> {
    this.logger.log(`Bulk enrolling ${dto.enrollments.length} students`);
    return this.enrollmentService.bulkEnrollStudents(dto, user);
  }

  @Post('withdraw')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Withdraw enrollment',
    description: 'Withdraw/unenroll a student from a module.',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrollment withdrawn successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async withdrawEnrollment(
    @Body() dto: WithdrawEnrollmentDto,
    @User() user: JWTUserPayload,
  ): Promise<{ message: string; enrollment_id: string }> {
    this.logger.log(`Withdrawing enrollment ${dto.enrollment_id}`);
    return this.enrollmentService.withdrawEnrollment(dto, user);
  }

  // ========== ENROLLMENT STATUS & HISTORY ==========

  @Get('status')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({
    summary: 'Get student enrollment status',
    description: 'Get detailed enrollment status for a specific student including all enrolled modules and progress.',
  })
  @ApiQuery({ name: 'student_id', required: true, description: 'Student ID' })
  @ApiQuery({ name: 'school_id', required: false, description: 'School ID (required for super admin)' })
  @ApiResponse({
    status: 200,
    description: 'Enrollment status retrieved successfully',
    type: StudentEnrollmentStatusDto,
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getStudentEnrollmentStatus(
    @Query('student_id') studentId: string,
    @Query('school_id') schoolId: string,
    @User() user: JWTUserPayload,
  ): Promise<StudentEnrollmentStatusDto> {
    return this.enrollmentService.getStudentEnrollmentStatus(
      { student_id: studentId, school_id: schoolId },
      user,
    );
  }

  @Get('history')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({
    summary: 'Get enrollment history',
    description: 'Get enrollment history with optional filters for student, module, type, date range, etc.',
  })
  @ApiQuery({ name: 'student_id', required: false, description: 'Filter by student ID' })
  @ApiQuery({ name: 'module_id', required: false, description: 'Filter by module ID' })
  @ApiQuery({ name: 'enrollment_type', required: false, enum: ['INDIVIDUAL', 'ACADEMIC_YEAR', 'BULK'], description: 'Filter by enrollment type' })
  @ApiQuery({ name: 'academic_year', required: false, description: 'Filter by academic year (1-5)' })
  @ApiQuery({ name: 'enrolled_by', required: false, description: 'Filter by enrolled_by user ID' })
  @ApiQuery({ name: 'start_date', required: false, description: 'Filter by start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'end_date', required: false, description: 'Filter by end date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'school_id', required: false, description: 'School ID (required for super admin)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Enrollment history retrieved successfully',
    type: EnrollmentHistoryResponseDto,
  })
  async getEnrollmentHistory(
    @Query('student_id') studentId: string,
    @Query('module_id') moduleId: string,
    @Query('enrollment_type') enrollmentType: string,
    @Query('academic_year') academicYear: string,
    @Query('enrolled_by') enrolledBy: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('school_id') schoolId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @User() user: JWTUserPayload,
  ): Promise<EnrollmentHistoryResponseDto> {
    const dto: GetEnrollmentHistoryDto = {
      student_id: studentId,
      module_id: moduleId,
      enrollment_type: enrollmentType as any,
      academic_year: academicYear ? parseInt(academicYear, 10) : undefined,
      enrolled_by: enrolledBy,
      start_date: startDate,
      end_date: endDate,
      school_id: schoolId,
    };

    const pagination: PaginationDto = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };

    return this.enrollmentService.getEnrollmentHistory(dto, pagination, user);
  }

  // ========== AVAILABLE STUDENTS & MODULES ==========

  @Get('students')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({
    summary: 'Get available students for enrollment',
    description: 'Search and list students available for enrollment with their current enrollment status.',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name, email, or student code' })
  @ApiQuery({ name: 'module_id', required: false, description: 'Check if student is enrolled in this module' })
  @ApiQuery({ name: 'school_id', required: false, description: 'School ID (required for super admin)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Students retrieved successfully',
    type: [AvailableStudentDto],
  })
  async getAvailableStudents(
    @Query('search') search: string,
    @Query('module_id') moduleId: string,
    @Query('school_id') schoolId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @User() user: JWTUserPayload,
  ): Promise<{ message: string; data: AvailableStudentDto[]; total: number; page: number; limit: number }> {
    const pagination: PaginationDto = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };

    return this.enrollmentService.getAvailableStudents(
      moduleId,
      search,
      pagination,
      user,
      schoolId,
    );
  }

  @Get('modules')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({
    summary: 'Get available modules for enrollment',
    description: 'List published modules available for enrollment with enrollment counts.',
  })
  @ApiQuery({ name: 'student_id', required: false, description: 'Check enrollment status for this student' })
  @ApiQuery({ name: 'year', required: false, description: 'Filter by academic year (1-5)' })
  @ApiQuery({ name: 'school_id', required: false, description: 'School ID (required for super admin)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Modules retrieved successfully',
    type: [AvailableModuleDto],
  })
  async getAvailableModules(
    @Query('student_id') studentId: string,
    @Query('year') year: string,
    @Query('school_id') schoolId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @User() user: JWTUserPayload,
  ): Promise<{ message: string; data: AvailableModuleDto[]; total: number; page: number; limit: number }> {
    const pagination: PaginationDto = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };

    return this.enrollmentService.getAvailableModules(
      studentId,
      year ? parseInt(year, 10) : undefined,
      pagination,
      user,
      schoolId,
    );
  }

  @Get('summary')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({
    summary: 'Get module enrollment summary',
    description: 'Get summary of enrollments for all modules including active, completed, and withdrawn counts.',
  })
  @ApiQuery({ name: 'school_id', required: false, description: 'School ID (required for super admin)' })
  @ApiResponse({
    status: 200,
    description: 'Module enrollment summary retrieved successfully',
    type: [ModuleEnrollmentSummaryDto],
  })
  async getModuleEnrollmentSummary(
    @Query('school_id') schoolId: string,
    @User() user: JWTUserPayload,
  ): Promise<{ message: string; data: ModuleEnrollmentSummaryDto[] }> {
    const summaries = await this.enrollmentService.getModuleEnrollmentSummary(user, schoolId);
    return {
      message: 'Module enrollment summary retrieved successfully',
      data: summaries,
    };
  }
}

