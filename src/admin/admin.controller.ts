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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';
import { UsersService } from '../users/users.service';
import { NewsletterService } from '../newsletter/newsletter.service';
import { IsArray, IsString, IsEmail, IsNotEmpty } from 'class-validator';

class SetRolesDto {
  @IsArray() @IsString({ each: true }) roleIds: string[];
}

class SendNewsletterDto {
  @IsString() @IsNotEmpty() subject: string;
  @IsString() @IsNotEmpty() htmlBody: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(
    private readonly users: UsersService,
    private readonly newsletter: NewsletterService,
  ) {}

  // ── Users ──────────────────────────────────────────────────

  @Get('users')
  @RequirePermissions(PERMISSIONS.USERS_READ)
  listUsers() {
    return this.users.findAll();
  }

  // ── Role assignment on users ───────────────────────────────

  /** Replace all roles on a user */
  @Post('users/:id/roles')
  @RequirePermissions(PERMISSIONS.USERS_ASSIGN_ROLE)
  setRoles(@Param('id') id: string, @Body() dto: SetRolesDto) {
    return this.users.setRoles(id, dto.roleIds);
  }

  /** Add a single role to a user */
  @Post('users/:id/roles/:roleId')
  @RequirePermissions(PERMISSIONS.USERS_ASSIGN_ROLE)
  addRole(@Param('id') id: string, @Param('roleId') roleId: string) {
    return this.users.addRole(id, roleId);
  }

  /** Remove a single role from a user */
  @Delete('users/:id/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.USERS_ASSIGN_ROLE)
  removeRole(@Param('id') id: string, @Param('roleId') roleId: string) {
    return this.users.removeRole(id, roleId);
  }

  // ── Newsletter subscriptions ───────────────────────────────

  @Get('newsletter/subscriptions')
  @RequirePermissions(PERMISSIONS.NEWSLETTER_READ)
  listSubscriptions() {
    return this.newsletter.findAll();
  }

  @Patch('newsletter/subscriptions/:id/toggle')
  @RequirePermissions(PERMISSIONS.NEWSLETTER_WRITE)
  toggleSubscription(@Param('id') id: string) {
    return this.newsletter.toggleActive(id);
  }

  @Delete('newsletter/subscriptions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.NEWSLETTER_WRITE)
  removeSubscription(@Param('id') id: string) {
    return this.newsletter.remove(id);
  }

  @Post('newsletter/send')
  @RequirePermissions(PERMISSIONS.NEWSLETTER_WRITE)
  sendNewsletter(@Body() dto: SendNewsletterDto) {
    return this.newsletter.sendBroadcast(dto.subject, dto.htmlBody);
  }
}
