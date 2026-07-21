import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * No-login testing build: every request is treated as the seeded demo
 * account instead of requiring a real bearer token. This removes the
 * frontend's dependency on ever calling /auth/login.
 *
 * Run `npm run prisma:seed` once so this user exists (see prisma/seed.ts).
 *
 * To restore real authentication for a production deployment, put back:
 *   export class JwtAuthGuard extends AuthGuard('jwt') {}
 */
const DEMO_EMAIL = 'demo@example.com';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private demoUserId: string | null = null;

  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.demoUserId) {
      const user = await this.prisma.user.findUnique({
        where: { email: DEMO_EMAIL },
      });
      if (!user) {
        throw new ServiceUnavailableException(
          'Demo user not found — run "npm run prisma:seed" in /backend first.',
        );
      }
      this.demoUserId = user.id;
    }

    const request = context.switchToHttp().getRequest();
    request.user = { userId: this.demoUserId, email: DEMO_EMAIL };
    return true;
  }
}
