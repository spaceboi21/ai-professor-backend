import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleModule } from '../modules/roles/role.module';
import { RoleSeederService } from './role-seeder.service';
import { ConfigModule } from '@nestjs/config';
import { SuperAdminSeederService } from './super-admin-seeder.service';
import { UserSchema, User } from 'src/database/schemas/central/user.schema';
import { UtilsModule } from 'src/common/utils';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.CENTRAL_DB_URI as string),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    RoleModule,
    UtilsModule,
  ],
  providers: [RoleSeederService, SuperAdminSeederService],
})
export class SeedModule {}
