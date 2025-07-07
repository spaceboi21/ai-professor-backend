import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginSuperAdminDto } from './dto/super-admin-login.dto';
import { LoginSchoolAdminDto } from './dto/school-admin-login.dto';
import { LoginStudentDto } from './dto/student-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Super Admin Login endpoint
  @Post('super-admin/login')
  @HttpCode(HttpStatus.OK)
  async superAdminLogin(@Body() loginData: LoginSuperAdminDto) {
    return this.authService.superAdminLogin(loginData);
  }

  // School Admin Login endpoint
  @Post('school-admin/login')
  @HttpCode(HttpStatus.OK)
  async loginSchoolAdmin(@Body() body: LoginSchoolAdminDto) {
    return this.authService.schoolAdminLogin(body);
  }

  // Student Login endpoint
  @Post('student/login')
  @HttpCode(HttpStatus.OK)
  async loginStudent(@Body() body: LoginStudentDto) {
    return this.authService.studentLogin(body);
  }
}
