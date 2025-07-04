import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UtilsModule } from 'src/common/utils';
import { StudentService } from './student.service';
import {
  Student,
  StudentSchema,
} from 'src/database/schemas/tenant/student.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Student.name, schema: StudentSchema }]),
    UtilsModule,
  ],
  controllers: [StudentService],
  providers: [StudentService],
})
export class StudentModule {}
