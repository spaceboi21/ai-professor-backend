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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Super Admin Login endpoint
  @Post('super-admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Super Admin Login' })
  @ApiBody({ type: LoginSuperAdminDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 400, description: 'Invalid credentials' })
  async superAdminLogin(@Body() loginData: LoginSuperAdminDto) {
    return this.authService.superAdminLogin(loginData);
  }

  // School Admin or professor Login endpoint
  @Post('school-admin/login')
  @HttpCode(HttpStatus.OK)
   @ApiOperation({ summary: 'School Admin or Professor Login' })
  @ApiBody({ type: LoginSchoolAdminDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 400, description: 'Invalid credentials' })
  async loginSchoolAdmin(@Body() body: LoginSchoolAdminDto) {
    return this.authService.schoolAdminLogin(body);
  }

  // Student Login endpoint
  @Post('student/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Student Login' })
  @ApiBody({ type: LoginStudentDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 400, description: 'Invalid credentials' })
  async loginStudent(@Body() body: LoginStudentDto) {
    return this.authService.studentLogin(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponse({ status: 200, description: 'User info' })
  async getMe(@User() user: JWTUserPayload) {
    return this.authService.getMe(user);
  }
}
