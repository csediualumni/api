import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  // ──────────────────────────────────────────────
  // Email / Password
  // ──────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.users.createWithPassword(dto.email, hashed);
    return this.buildSession(user.id, user.email);
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user || !user.password)
      throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.buildSession(user.id, user.email);
  }

  // ──────────────────────────────────────────────
  // Google OAuth
  // ──────────────────────────────────────────────

  async googleLogin(googleUser: {
    googleId: string;
    email: string;
    displayName: string;
    avatar: string;
  }) {
    let user = await this.users.findByGoogleId(googleUser.googleId);

    if (!user) {
      const existing = await this.users.findByEmail(googleUser.email);
      if (existing) {
        user = await this.users.connectGoogle(existing.id, {
          googleId: googleUser.googleId,
          displayName: googleUser.displayName,
          avatar: googleUser.avatar,
        });
      } else {
        user = await this.users.createWithGoogle(googleUser);
      }
    }

    return this.buildSession(user.id, user.email);
  }

  // ──────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────

  private async buildSession(sub: string, email: string) {
    const full = await this.users.findWithPermissions(sub);
    const permissions = full?.permissions ?? [];
    const roles = full?.roles ?? [];

    const payload = { sub, email, permissions };
    return {
      accessToken: this.jwt.sign(payload),
      user: { id: sub, email, permissions, roles },
    };
  }
}

