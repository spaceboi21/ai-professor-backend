import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  School,
  SchoolSchema,
} from 'src/database/schemas/central/school.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: School.name, schema: SchoolSchema }]),
  ],
  providers: [TenantService],
  exports: [TenantService],
})
export class CentralModule {}
