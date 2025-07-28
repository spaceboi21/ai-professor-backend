import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommunityService } from './community.service';
import { CommunityController } from './community.controller';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
import {
  School,
  SchoolSchema,
} from 'src/database/schemas/central/school.schema';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
    ]),
    DatabaseModule,
  ],
  controllers: [CommunityController],
  providers: [CommunityService],
  exports: [CommunityService],
})
export class CommunityModule {}
