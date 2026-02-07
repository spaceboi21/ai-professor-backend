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
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { SetNewPasswordDto } from './dto/set-new-password.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { User } from 'src/common/decorators/user.decorator';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdatePreferredLanguageDto } from './dto/update-preferred-language.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { UserMeResponseDto } from './dto/user-me-response.dto';
import {
  CheckMultipleAccountsDto,
  SelectAccountDto,
  MultipleAccountsResponseDto,
} from './dto/account-selection.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Super Admin Login endpoint
  @Post('super-admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Super Admin Login' })
  @ApiBody({ type: LoginSuperAdminDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid email or password' })
  async superAdminLogin(
    @Body() loginData: LoginSuperAdminDto,
    @Req() req: Request,
  ) {
    return this.authService.superAdminLogin(loginData, req);
  }

  // School Admin or professor Login endpoint
  @Post('school-admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'School Admin or Professor Login' })
  @ApiBody({ type: LoginSchoolAdminDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid email or password' })
  async schoolAdminLogin(
    @Body() body: LoginSchoolAdminDto,
    @Req() req: Request,
  ) {
    return this.authService.schoolAdminLogin(body, req);
  }

  // Student Login endpoint
  @Post('student/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Student Login' })
  @ApiBody({ type: LoginStudentDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid email or password' })
  async studentLogin(@Body() body: LoginStudentDto, @Req() req: Request) {
    return this.authService.studentLogin(body, req);
  }

  // Refresh Token endpoint
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh Access Token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Token refreshed successfully' },
        access_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        refresh_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        access_token_expires_in: { type: 'number', example: 900 },
        refresh_token_expires_in: { type: 'number', example: 604800 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() body: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refreshToken(body.refresh_token, req);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponse({
    status: 200,
    description: 'User info',
    type: UserMeResponseDto,
  })
  async getMe(@User() user: JWTUserPayload) {
    return this.authService.getMe(user);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset for school admin or professor or student',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset link sent successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found with this email' })
  @ApiResponse({ status: 400, description: 'Account is deactivated' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('set-new-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set new password using reset token',
    description:
      "Set new password with optional current password validation. If current_password is provided, it will be validated against the user's current password.",
  })
  @ApiBody({ type: SetNewPasswordDto })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token, or current password mismatch',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async setNewPassword(@Body() setNewPasswordDto: SetNewPasswordDto) {
    return this.authService.setNewPassword(setNewPasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('update-preferred-language')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update preferred language (All users)' })
  @ApiBody({ type: UpdatePreferredLanguageDto })
  @ApiResponse({
    status: 200,
    description: 'Preferred language updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updatePreferredLanguage(
    @User() user: JWTUserPayload,
    @Body() updatePreferredLanguageDto: UpdatePreferredLanguageDto,
  ) {
    return this.authService.updatePreferredLanguage(
      user,
      updatePreferredLanguageDto,
    );
  }

  /**
   * Check if email has multiple accounts (Step 1 of login)
   */
  @Post('check-multiple-accounts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check if email has multiple accounts',
    description: 'Step 1: Check if user needs to select account',
  })
  @ApiBody({ type: CheckMultipleAccountsDto })
  @ApiResponse({
    status: 200,
    description: 'Account check completed',
    type: MultipleAccountsResponseDto,
  })
  async checkMultipleAccounts(@Body() dto: CheckMultipleAccountsDto) {
    return this.authService.checkMultipleAccounts(dto.email);
  }

  /**
   * Unified login endpoint (handles both single and multi-account)
   */
  @Post('unified-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unified login for all user types',
    description: 'Handles single account and multi-account scenarios',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'Password123!' },
        account_id: {
          type: 'string',
          example: '507f1f77bcf86cd799439011',
        },
        remember_me: { type: 'boolean', example: false },
        preferred_language: { type: 'string', example: 'en' },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful or account selection required',
  })
  @ApiResponse({ status: 400, description: 'Invalid credentials' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async unifiedLogin(
    @Body()
    body: {
      email: string;
      password: string;
      account_id?: string;
      remember_me?: boolean;
      preferred_language?: string;
    },
    @Req() req: Request,
  ) {
    return this.authService.unifiedLogin(
      body.email,
      body.password,
      body.account_id,
      body.remember_me || false,
      body.preferred_language as any,
      req,
    );
  }

  /**
   * Select account after multi-account detection
   */
  @Post('select-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Select account when multiple accounts exist',
    description: 'Step 2: Login to selected account',
  })
  @ApiBody({ type: SelectAccountDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid account selection' })
  async selectAccount(@Body() dto: SelectAccountDto, @Req() req: Request) {
    return this.authService.unifiedLogin(
      dto.email,
      dto.password,
      dto.account_id,
      false,
      undefined,
      req,
    );
  }

  /**
   * Forgot password with multi-account support
   */
  @Post('forgot-password-multi')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Forgot password with multi-account support',
    description: 'Handles password reset for emails with multiple accounts',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset initiated or account selection required',
  })
  async forgotPasswordMulti(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPasswordMultiAccount(dto);
  }

  /**
   * Reset password for specific account
   */
  @Post('reset-password-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password for specific account',
    description: 'Resets password for a specific account when multiple exist',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        account_id: {
          type: 'string',
          example: '507f1f77bcf86cd799439011',
        },
        new_password: { type: 'string', example: 'NewPassword123!' },
        reset_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
      required: ['account_id', 'new_password', 'reset_token'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPasswordForAccount(
    @Body()
    body: {
      account_id: string;
      new_password: string;
      reset_token: string;
    },
  ) {
    return this.authService.resetPasswordForAccount(
      body.account_id,
      body.new_password,
      body.reset_token,
    );
  }
}
