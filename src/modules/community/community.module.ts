import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { CommunityService } from './community.service';
import { CommunityController } from './community.controller';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
import {
  School,
  SchoolSchema,
} from 'src/database/schemas/central/school.schema';
import { ChatMessage, ChatMessageSchema } from 'src/database/schemas/tenant/chat-message.schema';
import { Student, StudentSchema } from 'src/database/schemas/tenant/student.schema';
import { DatabaseModule } from 'src/database/database.module';
import { NotificationsModule } from 'src/modules/notifications/notifications.module';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: Student.name, schema: StudentSchema },
    ]),
    DatabaseModule,
    NotificationsModule,
  ],
  controllers: [CommunityController, ChatController],
  providers: [CommunityService, ChatService, ChatGateway, JwtService, ConfigService],
  exports: [CommunityService, ChatService],
})
export class CommunityModule {}
