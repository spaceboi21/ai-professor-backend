import { MiddlewareConsumer, Module, NestModule, Logger } from '@nestjs/common';
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
import { PassportModule } from '@nestjs/passport';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { SchoolAdminModule } from './modules/school-admin/school-admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { JwtStrategy } from './common/strategies/jwt.strategy';
import { StudentModule } from './modules/student/student.module';
import { MailModule } from './mail/mail.module';
import { ProfessorModule } from './modules/professor/professor.module';
import { UploadModule } from './modules/upload/upload.module';
import { ModulesModule } from './modules/modules/modules.module';
import { ChaptersModule } from './modules/chapters/chapters.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('MongoDB');
        // Support both MONGODB_URI and CENTRAL_DB_URI for test case compatibility
        const mongoUri =
          configService.get<string>('MONGODB_URI') ||
          configService.get<string>('CENTRAL_DB_URI');

        if (!mongoUri) {
          logger.error('❌ MongoDB URI not found in environment variables');
          throw new Error('MongoDB URI is required');
        }

        logger.log('🔌 Attempting to connect to MongoDB...');

        return {
          uri: mongoUri,
          connectionFactory: (connection) => {
            connection.on('connected', () => {
              logger.log('✅ MongoDB connected successfully');
            });
            connection.on('error', (error) => {
              logger.error('❌ MongoDB connection error:', error.message);
            });
            connection.on('disconnected', () => {
              logger.warn('⚠️ MongoDB disconnected');
            });
            return connection;
          },
        };
      },
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
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
    PassportModule,
    CentralModule,
    DatabaseModule,
    RoleModule,
    SeedModule,
    UtilsModule,
    SchoolAdminModule,
    AuthModule,
    SuperAdminModule,
    StudentModule,
    MailModule,
    ProfessorModule,
    UploadModule,
    ModulesModule,
    ChaptersModule,
  ],
  controllers: [AppController],
  providers: [AppService, JwtStrategy],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
