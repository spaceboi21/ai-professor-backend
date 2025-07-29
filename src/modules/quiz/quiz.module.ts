import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { QuizAnalyticsService } from './quiz-analytics.service';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
import {
  School,
  SchoolSchema,
} from 'src/database/schemas/central/school.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { ProgressService } from '../progress/progress.service';
import { PythonService } from '../progress/python.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
    ]),
    HttpModule,
  ],
  controllers: [QuizController],
  providers: [
    QuizService,
    QuizAnalyticsService,
    TenantConnectionService,
    ProgressService,
    PythonService,
  ],
  exports: [QuizService, QuizAnalyticsService],
})
export class QuizModule {}
