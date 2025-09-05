import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnchorChatController } from './anchor-chat.controller';
import { AnchorChatService } from './anchor-chat.service';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
import {
  School,
  SchoolSchema,
} from 'src/database/schemas/central/school.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { AnchorChatPythonService } from './python.service';
import { HttpModule } from '@nestjs/axios';
import { ErrorMessageService } from 'src/common/services/error-message.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
    ]),
    HttpModule,
  ],
  controllers: [AnchorChatController],
  providers: [
    AnchorChatService,
    TenantConnectionService,
    AnchorChatPythonService,
    ErrorMessageService,
  ],
  exports: [AnchorChatService, AnchorChatPythonService],
})
export class AnchorChatModule {}
