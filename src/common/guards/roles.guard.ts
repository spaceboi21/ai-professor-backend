import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  private readonly logger = new Logger(RoleGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      ROLE_KEY,
      context.getHandler(),
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // Allow access if no roles are defined
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role?.name) {
      this.logger.warn('Access denied: User not authenticated or missing role');
      throw new UnauthorizedException('User not authenticated or missing role');
    }

    if (!requiredRoles.includes(user.role.name)) {
      this.logger.warn(
        `Access denied: User with role '${user.role.name}' tried to access endpoint requiring roles: ${requiredRoles.join(', ')}`,
      );
      throw new UnauthorizedException(
        'Access denied. Insufficient permissions.',
      );
    }

    this.logger.log(
      `Access granted: User with role '${user.role.name}' accessing endpoint requiring roles: ${requiredRoles.join(', ')}`,
    );
    return true;
  }
}
