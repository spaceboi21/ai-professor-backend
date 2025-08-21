import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  School,
  SchoolSchema,
} from 'src/database/schemas/central/school.schema';
import { User, UserSchema } from 'src/database/schemas/central/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: School.name, schema: SchoolSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [TenantService],
  exports: [TenantService, MongooseModule],
})
export class CentralModule {}
