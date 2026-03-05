import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';
import { UsersService } from '../users/users.service';
import { IsArray, IsString } from 'class-validator';

class SetRolesDto {
  @IsArray() @IsString({ each: true }) roleIds: string[];
}

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(private readonly users: UsersService) {}

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
}
