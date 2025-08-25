import { Global, Module } from '@nestjs/common';
import { ErrorMessageService } from './error-message.service';

@Global()
@Module({
  providers: [ErrorMessageService],
  exports: [ErrorMessageService],
})
export class ServicesModule {}
