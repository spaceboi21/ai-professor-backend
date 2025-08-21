import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { CSVStorageService } from './csv-storage.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService, CSVStorageService],
  exports: [UploadService, CSVStorageService],
})
export class UploadModule {}
