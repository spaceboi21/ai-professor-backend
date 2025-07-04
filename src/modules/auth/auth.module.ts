import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
import { UtilsModule } from 'src/common/utils';
import {
  School,
  SchoolSchema,
} from 'src/database/schemas/central/school.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
    ]),
    UtilsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
