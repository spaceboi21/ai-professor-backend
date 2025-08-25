import { Global, Module } from '@nestjs/common';
import { EmailEncryptionService } from './services/email-encryption.service';
import { UtilsModule } from './utils/utils.module';
import { ServicesModule } from './services/services.module';

@Global()
@Module({
  imports: [UtilsModule, ServicesModule],
  providers: [EmailEncryptionService],
  exports: [EmailEncryptionService, ServicesModule],
})
export class CommonModule {}
