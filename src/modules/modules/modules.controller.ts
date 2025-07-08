import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { ModulesService } from './modules.service';

@ApiTags('Modules')
@ApiBearerAuth()
@Controller('modules')
@UseGuards(JwtAuthGuard, RoleGuard)
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Post()
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Create a new module' })
  @ApiBody({ type: CreateModuleDto })
  @ApiResponse({ status: 201, description: 'Module created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createModule(
    @Body() createModuleDto: CreateModuleDto,
    @User() user: JWTUserPayload,
  ) {
    return this.modulesService.createModule(createModuleDto, user);
  }

  @Get()
  @Roles(
    RoleEnum.SUPER_ADMIN,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.PROFESSOR,
    RoleEnum.STUDENT,
  )
  @ApiOperation({ summary: 'Get all modules' })
  @ApiResponse({ status: 200, description: 'Modules retrieved successfully' })
  async findAllModules(@User() user: JWTUserPayload) {
    return this.modulesService.findAllModules(user);
  }

  @Get(':id')
  @Roles(
    RoleEnum.SUPER_ADMIN,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.PROFESSOR,
    RoleEnum.STUDENT,
  )
  @ApiOperation({ summary: 'Get a module by id' })
  @ApiResponse({ status: 200, description: 'Module retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  async findModuleById(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.modulesService.findModuleById(id, user);
  }

  @Patch(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Update a module' })
  @ApiBody({ type: UpdateModuleDto })
  @ApiResponse({ status: 200, description: 'Module updated successfully' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  async updateModule(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateModuleDto: UpdateModuleDto,
    @User() user: JWTUserPayload,
  ) {
    return this.modulesService.updateModule(id, updateModuleDto, user);
  }

  @Delete(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.PROFESSOR)
  @ApiOperation({ summary: 'Delete a module' })
  @ApiResponse({ status: 200, description: 'Module deleted successfully' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  async removeModule(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return this.modulesService.removeModule(id, user);
  }
}
