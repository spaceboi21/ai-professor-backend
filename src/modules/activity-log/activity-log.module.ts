import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityLogController } from './activity-log.controller';
import { ActivityLogService } from './activity-log.service';
import { ActivityLogInterceptor } from 'src/common/interceptors/activity-log.interceptor';
import {
  ActivityLog,
  ActivityLogSchema,
} from 'src/database/schemas/central/activity-log.schema';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
import {
  School,
  SchoolSchema,
} from 'src/database/schemas/central/school.schema';
import { UtilsModule } from 'src/common/utils/utils.module';
import { DatabaseModule } from 'src/database/database.module';
import { CentralModule } from 'src/modules/central/central.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ActivityLog.name, schema: ActivityLogSchema },
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
    ]),
    UtilsModule,
    DatabaseModule,
    CentralModule,
  ],
  controllers: [ActivityLogController],
  providers: [ActivityLogService, ActivityLogInterceptor],
  exports: [ActivityLogService, ActivityLogInterceptor],
})
export class ActivityLogModule {}
