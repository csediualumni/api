import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthGuard but never rejects. If a valid Bearer token is present,
 * req.user is populated; otherwise req.user remains undefined.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Attempt JWT validation but always let the request continue
    return super.canActivate(context) as Promise<boolean>;
  }

  // Override handleRequest so that a missing/invalid token doesn't throw
  handleRequest<T>(_err: unknown, user: T): T {
    return user; // user is undefined when not authenticated – that's fine
  }
}
