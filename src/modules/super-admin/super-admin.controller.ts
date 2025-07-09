import { Controller, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { UpdateStatusDto } from 'src/common/dto/update-status.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/constants/roles.constant';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(RoleEnum.SUPER_ADMIN)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Patch('users/:id/status')
  async updateUserStatus(
    @Param('id') userId: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.superAdminService.updateUserStatus(
      userId,
      updateStatusDto.status,
    );
  }

  @Patch('schools/:id/status')
  async updateSchoolStatus(
    @Param('id') schoolId: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.superAdminService.updateSchoolStatus(
      schoolId,
      updateStatusDto.status,
    );
  }
}
