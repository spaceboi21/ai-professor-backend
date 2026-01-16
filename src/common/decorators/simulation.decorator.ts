import { SetMetadata } from '@nestjs/common';
import { ALLOW_SIMULATION_WRITE_KEY } from '../guards/simulation.guard';

/**
 * Decorator to allow write operations in simulation mode for specific endpoints
 * 
 * Use this decorator on endpoints that should be allowed to perform writes
 * even when the user is in simulation mode. This is typically used for:
 * - Simulation control endpoints (start, end)
 * - Endpoints that explicitly handle simulation data separately
 * 
 * @example
 * ```typescript
 * @Post('simulation-specific-action')
 * @AllowSimulationWrite()
 * async doSomething() { ... }
 * ```
 */
export const AllowSimulationWrite = () => SetMetadata(ALLOW_SIMULATION_WRITE_KEY, true);

/**
 * Helper decorator to mark an endpoint as simulation-aware
 * This can be used to add custom logic for simulation mode
 */
export const SimulationAware = () => SetMetadata('simulationAware', true);

