import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JWTUserPayload } from '../types/jwr-user.type';
import { ErrorMessageService } from '../services/error-message.service';
import { DEFAULT_LANGUAGE } from '../constants/language.constant';

/**
 * Decorator key for marking endpoints that allow writes in simulation mode
 * Use @AllowSimulationWrite() decorator to bypass this guard
 */
export const ALLOW_SIMULATION_WRITE_KEY = 'allowSimulationWrite';

/**
 * SimulationGuard - Blocks write operations when user is in simulation mode
 * 
 * This guard ensures that:
 * - Users in simulation mode cannot modify any real data
 * - POST, PUT, PATCH, DELETE operations are blocked (unless explicitly allowed)
 * - Read operations (GET) are always allowed
 * - Specific endpoints can be whitelisted using @AllowSimulationWrite() decorator
 */
@Injectable()
export class SimulationGuard implements CanActivate {
  private readonly logger = new Logger(SimulationGuard.name);

  // Endpoints that are always allowed even in simulation mode (for simulation control)
  private readonly whitelistedEndpoints = [
    '/api/simulation/end',
    '/api/simulation/status',
    '/api/auth/me',
    '/api/auth/refresh',
  ];

  constructor(
    private reflector: Reflector,
    private readonly errorMessageService: ErrorMessageService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JWTUserPayload;
    const method = request.method;
    const url = request.url;

    // If user is not in simulation mode, allow everything
    if (!user?.is_simulation) {
      return true;
    }

    this.logger.debug(`Simulation guard checking: ${method} ${url}`);

    // Always allow GET requests (read operations)
    if (method === 'GET') {
      return true;
    }

    // Check if endpoint is whitelisted
    if (this.isWhitelistedEndpoint(url)) {
      this.logger.debug(`Whitelisted endpoint: ${url}`);
      return true;
    }

    // Check if handler has @AllowSimulationWrite() decorator
    const allowSimulationWrite = this.reflector.get<boolean>(
      ALLOW_SIMULATION_WRITE_KEY,
      context.getHandler(),
    );

    if (allowSimulationWrite) {
      this.logger.debug(`Simulation write allowed by decorator: ${url}`);
      return true;
    }

    // Block write operations in simulation mode
    this.logger.warn(
      `Blocked write operation in simulation mode: ${method} ${url} by user ${user.original_user_id}`,
    );

    throw new ForbiddenException(
      this.errorMessageService.getMessageWithLanguage(
        'SIMULATION',
        'WRITE_BLOCKED',
        user.preferred_language || DEFAULT_LANGUAGE,
      ),
    );
  }

  private isWhitelistedEndpoint(url: string): boolean {
    const urlPath = url.split('?')[0]; // Remove query parameters
    return this.whitelistedEndpoints.some((endpoint) => urlPath.startsWith(endpoint));
  }
}

