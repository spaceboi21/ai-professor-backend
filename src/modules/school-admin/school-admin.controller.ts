import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CreateSchoolAdminDto } from './dto/create-school-admin.dto';
import { SchoolAdminService } from './school-admin.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { User } from 'src/common/decorators/user.decorator';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';

@Controller('school-admin')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(RoleEnum.SUPER_ADMIN)
export class SchoolAdminController {
  constructor(private readonly schoolAdminService: SchoolAdminService) {}

  // Create a new school admin
  @Post('')
  async createSchoolAdmin(
    @Body() body: CreateSchoolAdminDto,
    @User() user: JWTUserPayload,
  ) {
    return this.schoolAdminService.createSchoolAdmin(body, user);
  }
}
