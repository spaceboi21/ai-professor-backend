import { Global, Module } from '@nestjs/common';
import { ErrorMessageService } from './services/error-message.service';
import { EmailEncryptionService } from './services/email-encryption.service';
import { TranslationService } from './services/translation.service';
import { UtilsModule } from './utils/utils.module';

@Global()
@Module({
  imports: [UtilsModule],
  providers: [ErrorMessageService, EmailEncryptionService, TranslationService],
  exports: [ErrorMessageService, EmailEncryptionService, TranslationService],
})
export class CommonModule {}
