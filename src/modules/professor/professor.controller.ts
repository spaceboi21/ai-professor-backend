import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ProfessorService } from './professor.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { User } from 'src/common/decorators/user.decorator';
import { CreateProfessorDto } from './dto/create-professor.dto';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';

@Controller('professor')
@UseGuards(JwtAuthGuard, RoleGuard)
export class ProfessorController {
  constructor(private readonly professorService: ProfessorService) {}

  @Post()
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)
  async createStudent(
    @Body() createProfessorDto: CreateProfessorDto,
    @User() user: JWTUserPayload,
  ) {
    return this.professorService.createProfessor(createProfessorDto, user);
  }
}
