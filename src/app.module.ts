import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { CentralModule } from './modules/central/central.module';
import { DatabaseModule } from './database/database.module';
import { RoleModule } from './modules/roles/role.module';
import { SeedModule } from './seeders/seed.module';
import { UtilsModule } from './common/utils';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.CENTRAL_DB_URI as string),
    CentralModule,
    DatabaseModule,
    RoleModule,
    SeedModule,
    UtilsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
