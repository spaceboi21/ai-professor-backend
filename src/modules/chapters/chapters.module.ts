import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChaptersService } from './chapters.service';
import { ChaptersController } from './chapters.controller';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
import {
  School,
  SchoolSchema,
} from 'src/database/schemas/central/school.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { ModulesModule } from '../modules/modules.module';
import { ModulesService } from '../modules/modules.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProgressModule } from '../progress/progress.module';
import { HttpModule } from '@nestjs/axios';
import { PythonService } from '../modules/python.service';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
    ]),
    ModulesModule,
    NotificationsModule,
    ProgressModule,
    HttpModule,
  ],
  controllers: [ChaptersController],
  providers: [ChaptersService, TenantConnectionService, ModulesService, PythonService],
  exports: [ChaptersService],
})
export class ChaptersModule {}
