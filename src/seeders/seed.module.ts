import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleModule } from '../modules/roles/role.module';
import { RoleSeederService } from './role-seeder.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.CENTRAL_DB_URI as string),
    RoleModule,
  ],
  providers: [RoleSeederService],
})
export class SeedModule {}
