import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
      { name: GlobalStudent.name, schema: GlobalStudentSchema },
    ]),
    UtilsModule,
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, TenantConnectionService],
})
export class AuthModule {}
