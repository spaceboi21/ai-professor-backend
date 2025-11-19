import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';

// Controllers
import { InternshipController } from './internship.controller';

// Services
import { InternshipService } from './internship.service';
import { InternshipCaseService } from './internship-case.service';
import { InternshipSessionService } from './internship-session.service';
import { InternshipFeedbackService } from './internship-feedback.service';
import { InternshipLogbookService } from './internship-logbook.service';
import { PythonInternshipService } from './python-internship.service';

// Shared Services
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { NotificationsService } from '../notifications/notifications.service';

// Central Schemas
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
import { School, SchoolSchema } from 'src/database/schemas/central/school.schema';
import { Role, RoleSchema } from 'src/database/schemas/central/role.schema';

// Notification Schema (if NotificationsService needs it)
import {
  Notification,
  NotificationSchema,
} from 'src/database/schemas/tenant/notification.schema';

@Module({
  imports: [
    // Register central schemas
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
    // HTTP module for Python service integration
    HttpModule,
  ],
  controllers: [InternshipController],
  providers: [
    // Main services
    InternshipService,
    InternshipCaseService,
    InternshipSessionService,
    InternshipFeedbackService,
    InternshipLogbookService,
    PythonInternshipService,
    // Shared services
    TenantConnectionService,
    ErrorMessageService,
    NotificationsService,
  ],
  exports: [
    InternshipService,
    InternshipCaseService,
    InternshipSessionService,
    InternshipFeedbackService,
    InternshipLogbookService,
    PythonInternshipService,
  ],
})
export class InternshipModule {}

