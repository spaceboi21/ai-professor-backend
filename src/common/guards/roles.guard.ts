import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_KEY } from '../decorators/roles.decorator';
import { ErrorMessageService } from '../services/error-message.service';
import { DEFAULT_LANGUAGE } from '../constants/language.constant';

@Injectable()
export class RoleGuard implements CanActivate {
  private readonly logger = new Logger(RoleGuard.name);

  constructor(
    private reflector: Reflector,
    private readonly errorMessageService: ErrorMessageService,
  ) {}

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
      throw new UnauthorizedException(
        this.errorMessageService.getMessageWithLanguage(
          'AUTH',
          'USER_NOT_AUTHENTICATED',
          DEFAULT_LANGUAGE,
        ),
      );
    }

    if (!requiredRoles.includes(user.role.name)) {
      this.logger.warn(
        `Access denied: User with role '${user.role.name}' tried to access endpoint requiring roles: ${requiredRoles.join(', ')}`,
      );
      throw new UnauthorizedException(
        this.errorMessageService.getMessageWithLanguage(
          'AUTH',
          'ACCESS_DENIED',
          DEFAULT_LANGUAGE,
        ),
      );
    }

    this.logger.log(
      `Access granted: User with role '${user.role.name}' accessing endpoint requiring roles: ${requiredRoles.join(', ')}`,
    );
    return true;
  }
}
