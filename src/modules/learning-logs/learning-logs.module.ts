import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
import { School, SchoolSchema } from 'src/database/schemas/central/school.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { LearningLogsController } from './learning-logs.controller';
import { LearningLogsService } from './learning-logs.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
    ]),
  ],
  controllers: [LearningLogsController],
  providers: [LearningLogsService, TenantConnectionService],
  exports: [LearningLogsService],
})
export class LearningLogsModule {} 