import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';
import { SimulationSession, SimulationSessionSchema } from 'src/database/schemas/central/simulation-session.schema';
import { School, SchoolSchema } from 'src/database/schemas/central/school.schema';
import { DatabaseModule } from 'src/database/database.module';
import { CommonModule } from 'src/common/common.module';
import { UtilsModule } from 'src/common/utils/utils.module';
import { ActivityLogModule } from 'src/modules/activity-log/activity-log.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SimulationSession.name, schema: SimulationSessionSchema },
      { name: School.name, schema: SchoolSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRY') || '15m',
        },
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    CommonModule,
    UtilsModule,
    ActivityLogModule,
  ],
  controllers: [SimulationController],
  providers: [SimulationService],
  exports: [SimulationService],
})
export class SimulationModule {}

