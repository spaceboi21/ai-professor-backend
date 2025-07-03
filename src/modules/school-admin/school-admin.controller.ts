import { Body, Controller, Post, HttpStatus, HttpCode } from '@nestjs/common';
import { CreateSchoolAdminDto } from './dto/create-school-admin.dto';
import { SchoolAdminService } from './school-admin.service';

@Controller('school-admin')
export class SchoolAdminController {
  constructor(private readonly schoolAdminService: SchoolAdminService) {}

  @Post('create-school-admin')
  @HttpCode(HttpStatus.CREATED)
  async createSchoolAdmin(@Body() body: CreateSchoolAdminDto) {
    return this.schoolAdminService.createSchoolAdmin(body);
  }
}
