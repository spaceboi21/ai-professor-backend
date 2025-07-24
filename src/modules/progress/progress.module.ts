import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
import {
  School,
  SchoolSchema,
} from 'src/database/schemas/central/school.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { PythonService } from './python.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
    ]),
    HttpModule,
  ],
  controllers: [ProgressController],
  providers: [ProgressService, TenantConnectionService, PythonService],
  exports: [ProgressService],
})
export class ProgressModule {}
