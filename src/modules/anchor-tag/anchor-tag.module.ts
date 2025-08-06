import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import {
  ActivityLog,
  ActivityLogSchema,
} from 'src/database/schemas/central/activity-log.schema';
import {
  School,
  SchoolSchema,
} from 'src/database/schemas/central/school.schema';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { ProgressModule } from '../progress/progress.module';
import { AnchorTagController } from './anchor-tag.controller';
import { AnchorTagService } from './anchor-tag.service';
import { StudentAnchorTagAttemptService } from './student-anchor-tag-attempt.service';
import { PythonService } from './python.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
    ]),
    HttpModule,
    ProgressModule,
    NotificationsModule,
  ],
  controllers: [AnchorTagController],
  providers: [
    AnchorTagService,
    StudentAnchorTagAttemptService,
    PythonService,
    TenantConnectionService,
    ErrorMessageService,
  ],
  exports: [AnchorTagService, StudentAnchorTagAttemptService, PythonService],
})
export class AnchorTagModule {}
