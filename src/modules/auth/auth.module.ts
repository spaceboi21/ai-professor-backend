import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
import { Role, RoleSchema } from 'src/database/schemas/central/role.schema';
import { UtilsModule } from 'src/common/utils';
import {
  School,
  SchoolSchema,
} from 'src/database/schemas/central/school.schema';
import {
  GlobalStudent,
  GlobalStudentSchema,
} from 'src/database/schemas/central/global-student.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { MailModule } from 'src/mail/mail.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: School.name, schema: SchoolSchema },
      { name: GlobalStudent.name, schema: GlobalStudentSchema },
    ]),
    UtilsModule,
    MailModule,
    ActivityLogModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, TenantConnectionService],
  exports: [AuthService],
})
export class AuthModule {}
