import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CentralModule } from './modules/central/central.module';
import { DatabaseModule } from './database/database.module';
import { RoleModule } from './modules/roles/role.module';
import { SeedModule } from './seeders/seed.module';
import { UtilsModule } from './common/utils';
import { JwtModule } from '@nestjs/jwt';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.CENTRAL_DB_URI as string),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRY') || '24h',
        },
      }),
      inject: [ConfigService],
    }),
    CentralModule,
    DatabaseModule,
    RoleModule,
    SeedModule,
    UtilsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
