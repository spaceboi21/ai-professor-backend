import { Global, Module } from '@nestjs/common';
import { ErrorMessageService } from './error-message.service';
import { SimulationGuard } from '../guards/simulation.guard';

@Global()
@Module({
  providers: [ErrorMessageService, SimulationGuard],
  exports: [ErrorMessageService, SimulationGuard],
})
export class ServicesModule {}
