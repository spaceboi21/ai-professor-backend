import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnchorTagService } from './anchor-tag.service';
import { StudentAnchorTagAttemptService } from './student-anchor-tag-attempt.service';
import {
  AnchorTag,
  AnchorTagSchema,
} from 'src/database/schemas/tenant/anchor-tag.schema';
import {
  StudentAnchorTagAttempt,
  StudentAnchorTagAttemptSchema,
} from 'src/database/schemas/tenant/student-anchor-tag-attempt.schema';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
import {
  School,
  SchoolSchema,
} from 'src/database/schemas/central/school.schema';
import {
  ActivityLog,
  ActivityLogSchema,
} from 'src/database/schemas/central/activity-log.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { ProgressModule } from '../progress/progress.module';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { AnchorTagController } from './anchor-tag.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
    ]),
    ProgressModule,
  ],
  controllers: [AnchorTagController],
  providers: [
    AnchorTagService,
    StudentAnchorTagAttemptService,
    TenantConnectionService,
    ErrorMessageService,
  ],
  exports: [AnchorTagService, StudentAnchorTagAttemptService],
})
export class AnchorTagModule {}
