import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { SimulationGuard } from 'src/common/guards/simulation.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AllowSimulationWrite } from 'src/common/decorators/simulation.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { PaginationDto } from 'src/common/dto/pagination.dto';

import { SimulationService } from './simulation.service';
import { StartSimulationDto } from './dto/start-simulation.dto';
import {
  SimulationTokenResponseDto,
  EndSimulationResponseDto,
  AvailableStudentsListDto,
  SimulationHistoryDto,
} from './dto/simulation-response.dto';

@ApiTags('Student View Simulation')
@ApiBearerAuth()
@Controller('simulation')
@UseGuards(JwtAuthGuard, RoleGuard, SimulationGuard)
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({
    summary: 'Start student view simulation',
    description: `
    Enables Teachers and Administrators to access the platform exactly as a student experiences it.
    
    **Features:**
    - View student dashboard and learning modules
    - Navigate quizzes and AI chat (simulation only)
    - All actions are in READ-ONLY mode
    - No real data updates to student progress
    - No quiz scores saved
    - No learning logs modified
    - All simulation activities are logged separately
    
    **Access Control:**
    - SUPER_ADMIN: Must provide school_id
    - SCHOOL_ADMIN: Simulates students in their school
    - PROFESSOR: Simulates students in their school
    
    **Returns:** A special JWT token that marks the session as simulation mode.
    `,
  })
  @ApiBody({ type: StartSimulationDto })
  @ApiResponse({
    status: 200,
    description: 'Simulation started successfully',
    type: SimulationTokenResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Already in simulation or missing required fields',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only Teachers and Admins can start simulation',
  })
  @ApiResponse({
    status: 404,
    description: 'Student or school not found',
  })
  async startSimulation(
    @Body() startSimulationDto: StartSimulationDto,
    @User() user: JWTUserPayload,
    @Req() req: Request,
  ): Promise<SimulationTokenResponseDto> {
    return this.simulationService.startSimulation(startSimulationDto, user, req);
  }

  @Post('end')
  @HttpCode(HttpStatus.OK)
  @AllowSimulationWrite() // Allow this endpoint to work in simulation mode
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR, RoleEnum.STUDENT)
  @ApiOperation({
    summary: 'End student view simulation',
    description: `
    Exits the student view simulation and returns to the original Teacher/Admin role.
    
    **What happens:**
    - Simulation session is marked as ended
    - Session duration and activities are recorded
    - New tokens are generated for the original user role
    - User can instantly return to Teacher/Admin dashboard
    
    **Note:** Can be called with either simulation token OR original token (fallback).
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Simulation ended successfully',
    type: EndSimulationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Not in simulation mode or session already ended',
  })
  @ApiResponse({
    status: 404,
    description: 'Simulation session not found',
  })
  async endSimulation(@User() user: JWTUserPayload): Promise<EndSimulationResponseDto> {
    return this.simulationService.endSimulation(user);
  }

  @Get('status')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR, RoleEnum.STUDENT)
  @ApiOperation({
    summary: 'Get current simulation status',
    description: `
    Checks if the current user is in simulation mode.
    
    **Returns:**
    - Whether user is in simulation mode
    - Simulation session details if active
    - Original user role information
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Simulation status retrieved successfully',
    schema: {
      example: {
        message: 'Currently in simulation mode',
        is_simulation: true,
        session: {
          _id: '507f1f77bcf86cd799439011',
          simulation_mode: 'READ_ONLY_IMPERSONATION',
          simulated_student_id: '507f1f77bcf86cd799439012',
          simulated_student_name: 'John Doe',
          started_at: '2024-01-15T10:00:00.000Z',
          original_user_role: 'SCHOOL_ADMIN',
        },
      },
    },
  })
  async getSimulationStatus(@User() user: JWTUserPayload) {
    return this.simulationService.getSimulationStatus(user);
  }

  @Get('students')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({
    summary: 'Get students available for simulation',
    description: `
    Retrieves a list of students that can be simulated.
    
    **Features:**
    - Paginated list of active students
    - Search by name, email, or student code
    - Indicates if student is a dummy/test account
    
    **Access Control:**
    - SUPER_ADMIN: Must provide school_id
    - SCHOOL_ADMIN/PROFESSOR: Returns students from their school
    `,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name, email, or student code',
    example: 'john',
  })
  @ApiQuery({
    name: 'school_id',
    required: false,
    type: String,
    description: 'School ID (required for SUPER_ADMIN)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Students retrieved successfully',
    type: AvailableStudentsListDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Missing school_id for super admin',
  })
  async getAvailableStudents(
    @User() user: JWTUserPayload,
    @Query() paginationDto: PaginationDto,
    @Query('search') search?: string,
    @Query('school_id') schoolId?: string,
  ): Promise<AvailableStudentsListDto> {
    return this.simulationService.getAvailableStudents(user, paginationDto, search, schoolId);
  }

  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({
    summary: 'Cleanup stuck simulation sessions',
    description: `
    Ends all active simulation sessions for the current user.
    Use this if you have stuck sessions that prevent starting new simulations.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Cleanup completed successfully',
    schema: {
      example: {
        message: 'Cleanup completed',
        sessions_ended: 2,
      },
    },
  })
  async cleanupSimulations(@User() user: JWTUserPayload) {
    return this.simulationService.cleanupStuckSessions(user);
  }

  @Get('history')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({
    summary: 'Get simulation history',
    description: `
    Retrieves the history of simulation sessions for audit purposes.
    
    **Access Control:**
    - SUPER_ADMIN: Sees all simulation sessions
    - SCHOOL_ADMIN: Sees simulations in their school
    - PROFESSOR: Sees their own simulations
    
    **Includes:**
    - Session start/end times
    - Duration
    - Pages visited
    - Activities performed (modules, quizzes, AI chats viewed)
    `,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Simulation history retrieved successfully',
    type: SimulationHistoryDto,
  })
  async getSimulationHistory(
    @User() user: JWTUserPayload,
    @Query() paginationDto: PaginationDto,
  ): Promise<SimulationHistoryDto> {
    return this.simulationService.getSimulationHistory(user, paginationDto);
  }
}

