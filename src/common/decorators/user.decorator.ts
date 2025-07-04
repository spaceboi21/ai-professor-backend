import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JWTUserPayload } from '../types/jwr-user.type';

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as JWTUserPayload;
  },
);
