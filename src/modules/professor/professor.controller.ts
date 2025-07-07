import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { CreateProfessorDto } from './dto/create-professor.dto';
import {
  UpdateProfessorDto,
  UpdateProfessorPasswordDto,
} from './dto/update-professor.dto';
import { ProfessorService } from './professor.service';

@ApiTags('Professor')
@ApiBearerAuth()
@Controller('professor')
@UseGuards(JwtAuthGuard, RoleGuard)
export class ProfessorController {
  constructor(private readonly professorService: ProfessorService) {}

  @Post()
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a new professor' })
  @ApiBody({ type: CreateProfessorDto })
  @ApiResponse({ status: 201, description: 'Professor created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createProfessor(
    @Body() createProfessorDto: CreateProfessorDto,
    @User() user: JWTUserPayload,
  ) {
    return this.professorService.createProfessor(createProfessorDto, user);
  }

  @Patch(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Update professor details' })
  @ApiBody({ type: UpdateProfessorDto })
  @ApiResponse({ status: 200, description: 'Professor updated successfully' })
  @ApiResponse({ status: 404, description: 'Professor not found' })
  async updateProfessor(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateDto: UpdateProfessorDto,
  ) {
    return this.professorService.updateProfessor(id, updateDto);
  }

  @Patch('/password/:id')
  @Roles(RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Update professor password' })
  @ApiBody({ type: UpdateProfessorPasswordDto })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 404, description: 'Professor not found' })
  async updateProfessorPassword(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateDto: UpdateProfessorPasswordDto,
  ) {
    return this.professorService.updateProfessorPassword(id, updateDto);
  }
}
