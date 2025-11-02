import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';

import conversionConfig from '../../configs/conversion.config';
import { ConversionController } from './controllers/conversion.controller';
import { ConversionService } from './services/conversion.service';
import { LibreOfficeDetectorService } from './services/libreoffice-detector.service';
import { FileManagerService } from './services/file-manager.service';
import { ConversionEngineService } from './services/conversion-engine.service';

@Module({
  imports: [
    ConfigModule.forFeature(conversionConfig),
    MulterModule.register({
      storage: require('multer').memoryStorage(),
      limits: {
        fileSize: 500 * 1024 * 1024, // 500 MB
      },
    }),
  ],
  controllers: [ConversionController],
  providers: [
    ConversionService,
    LibreOfficeDetectorService,
    FileManagerService,
    ConversionEngineService,
  ],
  exports: [
    ConversionService,
    LibreOfficeDetectorService,
  ],
})
export class ConversionModule {}
