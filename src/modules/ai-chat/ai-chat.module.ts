import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AIChatController } from './ai-chat.controller';
import { AIChatService } from './ai-chat.service';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
import {
  School,
  SchoolSchema,
} from 'src/database/schemas/central/school.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { PythonService } from './python.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
    ]),
    HttpModule,
  ],
  controllers: [AIChatController],
  providers: [AIChatService, TenantConnectionService, PythonService],
  exports: [AIChatService],
})
export class AIChatModule {}
