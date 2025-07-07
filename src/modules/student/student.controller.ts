import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { User } from 'src/common/decorators/user.decorator';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { ApiOperation, ApiResponse, ApiBody, ApiTags, ApiBearerAuth } from '@nestjs/swagger';

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
  @ApiResponse({ status: 201, description: 'Student created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createStudent(
    @Body() createStudentDto: CreateStudentDto,
    @User() user: JWTUserPayload,
  ) {
    return this.studentService.createStudent(createStudentDto, user);
  }
}
