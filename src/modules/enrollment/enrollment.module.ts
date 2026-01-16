import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { School, SchoolSchema } from 'src/database/schemas/central/school.schema';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { ServicesModule } from 'src/common/services/services.module';
import { ActivityLogModule } from 'src/modules/activity-log/activity-log.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: School.name, schema: SchoolSchema },
      { name: User.name, schema: UserSchema },
    ]),
    ServicesModule,
    ActivityLogModule,
    MailModule,
  ],
  controllers: [EnrollmentController],
  providers: [EnrollmentService, TenantConnectionService],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}

