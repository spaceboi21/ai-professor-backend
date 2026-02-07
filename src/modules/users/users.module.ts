import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';
import { Role, RoleSchema } from 'src/database/schemas/central/role.schema';
import { School, SchoolSchema } from 'src/database/schemas/central/school.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { BcryptUtil, EmailEncryptionUtil } from 'src/common/utils';
import { EmailEncryptionService } from 'src/common/services/email-encryption.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: School.name, schema: SchoolSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, BcryptUtil, EmailEncryptionUtil, EmailEncryptionService],
  exports: [UsersService],
})
export class UsersModule {}
