import { Global, Module } from '@nestjs/common';
import { ErrorMessageService } from './services/error-message.service';
import { EmailEncryptionService } from './services/email-encryption.service';
import { UtilsModule } from './utils/utils.module';

@Global()
@Module({
  imports: [UtilsModule],
  providers: [ErrorMessageService, EmailEncryptionService],
  exports: [ErrorMessageService, EmailEncryptionService],
})
export class CommonModule {}
