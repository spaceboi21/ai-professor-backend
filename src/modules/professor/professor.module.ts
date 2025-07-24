import { Module } from '@nestjs/common';
import { ProfessorService } from './professor.service';
import { ProfessorController } from './professor.controller';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Student,
  StudentSchema,
} from 'src/database/schemas/tenant/student.schema';
import {
  School,
  SchoolSchema,
} from 'src/database/schemas/central/school.schema';
import {
  GlobalStudent,
  GlobalStudentSchema,
} from 'src/database/schemas/central/global-student.schema';
import { UtilsModule } from 'src/common/utils';
import { DatabaseModule } from 'src/database/database.module';
import { MailModule } from 'src/mail/mail.module';
import { ModulesModule } from '../modules/modules.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
      { name: GlobalStudent.name, schema: GlobalStudentSchema },
    ]),
    UtilsModule,
    MailModule,
    ModulesModule,
  ],
  controllers: [ProfessorController],
  providers: [ProfessorService],
})
export class ProfessorModule {}
