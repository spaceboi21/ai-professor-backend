import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  UseGuards,
  ParseIntPipe,
  Query,
  Post,
  Delete,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { UpdateStatusDto } from 'src/common/dto/update-status.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UsersService } from './users.service';
import {
  CreateMultiAccountDto,
  UpdateAccountStatusDto,
  GetAccountsByEmailDto,
  UpdateAccountIdentifiersDto,
} from './dto/create-multi-account.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RoleGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get all users (Super Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
  })
  async getAllUsers(
    @Query() paginationDto: PaginationDto,
    @User() user: JWTUserPayload,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.usersService.getAllUsers(
      paginationDto,
      search,
      role,
      status,
      user,
    );
  }

  @Get(':id')
  @Roles(RoleEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get user by ID (Super Admin only)' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.usersService.getUserById(id, user);
  }

  @Patch(':id/status')
  @Roles(RoleEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update user status (Super Admin only)' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: UpdateStatusDto })
  @ApiResponse({
    status: 200,
    description: 'User status updated successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserStatus(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateStatusDto: UpdateStatusDto,
    @User() user: JWTUserPayload,
  ) {
    return this.usersService.updateUserStatus(id, updateStatusDto.status, user);
  }

  /**
   * Multi-Account Management Endpoints
   */

  @Post('multi-account/create')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Create new account (supports multiple accounts per email)',
    description: 'Allows creating additional accounts under the same email with different roles/schools',
  })
  @ApiBody({ type: CreateMultiAccountDto })
  @ApiResponse({
    status: 201,
    description: 'Account created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Account with same email, school, and role already exists',
  })
  async createMultiAccount(
    @Body() dto: CreateMultiAccountDto,
    @User() user: JWTUserPayload,
  ) {
    return this.usersService.createMultiAccount(
      dto.email,
      dto.password,
      dto.first_name,
      dto.last_name,
      dto.role_id,
      dto.school_id,
      dto.username,
      dto.account_code,
      dto.preferred_language,
      user.id.toString(),
    );
  }

  @Post('multi-account/get-by-email')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Get all accounts associated with an email',
    description: 'Retrieve all accounts linked to a specific email address',
  })
  @ApiBody({ type: GetAccountsByEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Accounts retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'No accounts found with this email',
  })
  async getAccountsByEmail(
    @Body() dto: GetAccountsByEmailDto,
    @User() user: JWTUserPayload,
  ) {
    return this.usersService.getAccountsByEmail(dto.email, user);
  }

  @Patch('multi-account/status')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Update account status (activate/deactivate specific account)',
    description: 'Change status of a specific account independently',
  })
  @ApiBody({ type: UpdateAccountStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Account status updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async updateAccountStatus(
    @Body() dto: UpdateAccountStatusDto,
    @User() user: JWTUserPayload,
  ) {
    return this.usersService.updateAccountStatus(
      dto.account_id,
      dto.status as any,
      user,
    );
  }

  @Patch('multi-account/identifiers')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Update account identifiers (username, account_code)',
    description: 'Update secondary identifiers for a specific account',
  })
  @ApiBody({ type: UpdateAccountIdentifiersDto })
  @ApiResponse({
    status: 200,
    description: 'Account identifiers updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async updateAccountIdentifiers(
    @Body() dto: UpdateAccountIdentifiersDto,
    @User() user: JWTUserPayload,
  ) {
    return this.usersService.updateAccountIdentifiers(
      dto.account_id,
      dto.username,
      dto.account_code,
      user,
    );
  }

  @Delete('multi-account/:accountId')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Delete specific account (soft delete)',
    description: 'Soft delete a specific account while preserving others with same email',
  })
  @ApiParam({
    name: 'accountId',
    type: String,
    description: 'Account ID to delete',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Account deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async deleteAccount(
    @Param('accountId') accountId: string,
    @User() user: JWTUserPayload,
  ) {
    return this.usersService.deleteAccount(accountId, user);
  }
}
