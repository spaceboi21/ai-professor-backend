import { Global, Module } from '@nestjs/common';
import { ErrorMessageService } from './services/error-message.service';

@Global()
@Module({
  providers: [ErrorMessageService],
  exports: [ErrorMessageService],
})
export class CommonModule {}
