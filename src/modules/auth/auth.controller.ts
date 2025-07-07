import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginSuperAdminDto } from './dto/super-admin-login.dto';
import { LoginSchoolAdminDto } from './dto/school-admin-login.dto';
import { LoginStudentDto } from './dto/student-login.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { User } from 'src/common/decorators/user.decorator';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';

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

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@User() user: JWTUserPayload) {
    return this.authService.getMe(user);
  }
}
