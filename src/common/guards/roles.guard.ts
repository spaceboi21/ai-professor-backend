import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
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
      throw new UnauthorizedException('User not authenticated or missing role');
    }

    if (!requiredRoles.includes(user.role.name)) {
      throw new UnauthorizedException(
        'Access denied. Insufficient permissions.',
      );
    }

    return true;
  }
}
