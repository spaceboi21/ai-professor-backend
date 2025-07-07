import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SchoolAdminController } from './school-admin.controller';
import { SchoolAdminService } from './school-admin.service';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
import {
  School,
  SchoolSchema,
} from 'src/database/schemas/central/school.schema';
import { UtilsModule } from 'src/common/utils';
import { MailModule } from 'src/mail/mail.module';
import {
  GlobalStudent,
  GlobalStudentSchema,
} from 'src/database/schemas/central/global-student.schema';

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
  controllers: [SchoolAdminController],
  providers: [SchoolAdminService],
})
export class SchoolAdminModule {}
