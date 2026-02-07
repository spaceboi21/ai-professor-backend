import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ModulesService } from './modules.service';
import { ModulesController } from './modules.controller';
import { ModuleAssignmentService } from './module-assignment.service';
import { DatabaseAuditService } from './database-audit.service';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
import {
  School,
  SchoolSchema,
} from 'src/database/schemas/central/school.schema';
import { DatabaseModule } from 'src/database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationsService } from '../notifications/notifications.service';
import { PythonService } from './python.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
    ]),
    DatabaseModule,
    NotificationsModule,
    HttpModule,
  ],
  controllers: [ModulesController],
  providers: [
    ModulesService,
    ModuleAssignmentService,
    DatabaseAuditService,
    NotificationsService,
    PythonService,
  ],
  exports: [ModulesService, ModuleAssignmentService],
})
export class ModulesModule {}
