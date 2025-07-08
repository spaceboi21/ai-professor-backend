import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UtilsModule } from 'src/common/utils';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import {
  Student,
  StudentSchema,
} from 'src/database/schemas/tenant/student.schema';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
import {
  School,
  SchoolSchema,
} from 'src/database/schemas/central/school.schema';
import {
  GlobalStudent,
  GlobalStudentSchema,
} from 'src/database/schemas/central/global-student.schema';
import { DatabaseModule } from 'src/database/database.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
      { name: GlobalStudent.name, schema: GlobalStudentSchema },
    ]),
    UtilsModule,
    DatabaseModule,
    MailModule,
  ],
  controllers: [StudentController],
  providers: [StudentService],
})
export class StudentModule {}
