import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { UsersService } from '../users/users.service';
import type {
  UpdateProfileDto,
  UpsertExperienceDto,
  UpsertEducationDto,
  UpsertAchievementDto,
} from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  // ──────────────────────────────────────────────
  // Email / Password
  // ──────────────────────────────────────────────

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() body: { email: string }) {
    return this.auth.forgotPassword(body.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() body: { token: string; password: string }) {
    return this.auth.resetPassword(body.token, body.password);
  }

  // ──────────────────────────────────────────────
  // Google OAuth
  // ──────────────────────────────────────────────

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  googleAuth() {
    // Passport redirects to Google automatically
  }

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const result = await this.auth.googleLogin(req.user as any);
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:4200',
    );
    // Redirect with token so Angular can store it
    res.redirect(
      `${frontendUrl}/auth/callback?token=${result.accessToken}&userId=${result.user.id}&email=${encodeURIComponent(result.user.email)}`,
    );
  }

  // ──────────────────────────────────────────────
  // Profile (protected)
  // ──────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    const jwtUser = req.user as { id: string };
    const user = await this.users.findByIdWithProfile(jwtUser.id);
    if (!user) return jwtUser;
    const { password: _pw, resetToken: _rt, resetTokenExpiry: _rte, ...profile } = user;
    return profile;
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    const jwtUser = req.user as { id: string };
    return this.users.updateProfile(jwtUser.id, dto);
  }

  // ──────────────────────────────────────────────
  // Experience
  // ──────────────────────────────────────────────

  @Post('me/experience')
  @UseGuards(JwtAuthGuard)
  addExperience(@Req() req: Request, @Body() dto: UpsertExperienceDto) {
    const { id } = req.user as { id: string };
    return this.users.addExperience(id, dto);
  }

  @Patch('me/experience/:entryId')
  @UseGuards(JwtAuthGuard)
  updateExperience(
    @Req() req: Request,
    @Param('entryId') entryId: string,
    @Body() dto: UpsertExperienceDto,
  ) {
    const { id } = req.user as { id: string };
    return this.users.updateExperience(id, entryId, dto);
  }

  @Delete('me/experience/:entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  deleteExperience(@Req() req: Request, @Param('entryId') entryId: string) {
    const { id } = req.user as { id: string };
    return this.users.deleteExperience(id, entryId);
  }

  // ──────────────────────────────────────────────
  // Education
  // ──────────────────────────────────────────────

  @Post('me/education')
  @UseGuards(JwtAuthGuard)
  addEducation(@Req() req: Request, @Body() dto: UpsertEducationDto) {
    const { id } = req.user as { id: string };
    return this.users.addEducation(id, dto);
  }

  @Patch('me/education/:entryId')
  @UseGuards(JwtAuthGuard)
  updateEducation(
    @Req() req: Request,
    @Param('entryId') entryId: string,
    @Body() dto: UpsertEducationDto,
  ) {
    const { id } = req.user as { id: string };
    return this.users.updateEducation(id, entryId, dto);
  }

  @Delete('me/education/:entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  deleteEducation(@Req() req: Request, @Param('entryId') entryId: string) {
    const { id } = req.user as { id: string };
    return this.users.deleteEducation(id, entryId);
  }

  // ──────────────────────────────────────────────
  // Achievements
  // ──────────────────────────────────────────────

  @Post('me/achievements')
  @UseGuards(JwtAuthGuard)
  addAchievement(@Req() req: Request, @Body() dto: UpsertAchievementDto) {
    const { id } = req.user as { id: string };
    return this.users.addAchievement(id, dto);
  }

  @Patch('me/achievements/:entryId')
  @UseGuards(JwtAuthGuard)
  updateAchievement(
    @Req() req: Request,
    @Param('entryId') entryId: string,
    @Body() dto: UpsertAchievementDto,
  ) {
    const { id } = req.user as { id: string };
    return this.users.updateAchievement(id, entryId, dto);
  }

  @Delete('me/achievements/:entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  deleteAchievement(@Req() req: Request, @Param('entryId') entryId: string) {
    const { id } = req.user as { id: string };
    return this.users.deleteAchievement(id, entryId);
  }
}
