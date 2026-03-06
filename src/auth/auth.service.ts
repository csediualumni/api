import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
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

  async forgotPassword(email: string): Promise<{ message: string }> {
    const genericMessage =
      'If an account with that email exists, a password recovery link has been sent.';

    const user = await this.users.findByEmail(email);
    if (!user || !user.password) {
      // Google-only accounts or non-existent — return generic message
      return { message: genericMessage };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.users.setResetToken(user.id, token, expiry);

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:4200');
    const resetLink = `${frontendUrl}/auth/reset-password?token=${token}`;

    await this.mail.sendPasswordReset(email, resetLink);

    return { message: genericMessage };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.users.findByResetToken(token);
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new BadRequestException(
        'This reset link is invalid or has expired. Please request a new one.',
      );
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.users.updatePassword(user.id, hashed);

    return { message: 'Password updated successfully. You can now sign in.' };
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

