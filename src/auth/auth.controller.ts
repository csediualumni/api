import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { UploadService } from '../upload/upload.service';
import { UsersService, UpdateProfileDto } from '../users/users.service';
import type {
  UpsertExperienceDto,
  UpsertEducationDto,
  UpsertAchievementDto,
} from '../users/users.service';

interface GoogleOAuthUser {
  googleId: string;
  email: string;
  displayName: string;
  avatar: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
    private readonly upload: UploadService,
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
    const result = await this.auth.googleLogin(req.user as GoogleOAuthUser);
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
    const {
      password: _pw,
      resetToken: _rt,
      resetTokenExpiry: _rte,
      ...profile
    } = user;
    return profile;
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    const jwtUser = req.user as { id: string };
    return this.users.updateProfile(jwtUser.id, dto);
  }

  // ──────────────────────────────────────────────
  // Member ID generation (self-service)
  // ──────────────────────────────────────────────

  @Post('me/generate-member-id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async generateMemberId(@Req() req: Request): Promise<{ memberId: string }> {
    const jwtUser = req.user as { id: string; roles?: { name: string }[] };
    const hasMemberRole = (jwtUser.roles ?? []).some((r) => r.name === 'member');
    if (!hasMemberRole) {
      throw new ForbiddenException('Only members can generate a member ID');
    }
    const memberId = await this.users.assignMemberId(jwtUser.id);
    return { memberId };
  }

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ avatar: string }> {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!file.mimetype.startsWith('image/'))
      throw new BadRequestException('Only image files are allowed');
    const ext = (file.originalname.split('.').pop() ?? 'jpg').toLowerCase();
    const { id } = req.user as { id: string };
    const url = await this.upload.uploadFile(file.buffer, file.mimetype, ext, 'avatars');
    await this.users.updateAvatar(id, url);
    return { avatar: url };
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
