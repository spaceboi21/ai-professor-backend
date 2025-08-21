import { Module } from '@nestjs/common';
import { EncryptionController } from './encryption.controller';
import { EncryptionService } from './encryption.service';
import { EmailEncryptionService } from 'src/common/services/email-encryption.service';
import { UtilsModule } from 'src/common/utils';

@Module({
  imports: [UtilsModule],
  controllers: [EncryptionController],
  providers: [EncryptionService, EmailEncryptionService],
  exports: [EncryptionService],
})
export class EncryptionModule {}
