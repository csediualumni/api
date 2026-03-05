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
import { RolesService } from './roles.service';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

class CreateRoleDto {
  @IsString() @MinLength(2) name: string;
  @IsString() @IsOptional() description?: string;
}

class UpdateRoleDto {
  @IsString() @IsOptional() @MinLength(2) name?: string;
  @IsString() @IsOptional() description?: string;
}

class SetPermissionsDto {
  @IsArray() @IsString({ each: true }) permissionIds: string[];
}

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ROLES_READ)
  findAll() {
    return this.roles.findAll();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ROLES_READ)
  findOne(@Param('id') id: string) {
    return this.roles.findOne(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ROLES_WRITE)
  create(@Body() dto: CreateRoleDto) {
    return this.roles.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.ROLES_WRITE)
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.roles.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.ROLES_DELETE)
  remove(@Param('id') id: string) {
    return this.roles.remove(id);
  }

  // ── Permission assignment ──────────────────────────────────

  /** Replace all permissions on a role at once */
  @Post(':id/permissions')
  @RequirePermissions(PERMISSIONS.PERMISSIONS_ASSIGN)
  setPermissions(@Param('id') id: string, @Body() dto: SetPermissionsDto) {
    return this.roles.setPermissions(id, dto.permissionIds);
  }

  /** Add a single permission */
  @Post(':id/permissions/:permissionId')
  @RequirePermissions(PERMISSIONS.PERMISSIONS_ASSIGN)
  addPermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.roles.addPermission(id, permissionId);
  }

  /** Remove a single permission */
  @Delete(':id/permissions/:permissionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.PERMISSIONS_ASSIGN)
  removePermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.roles.removePermission(id, permissionId);
  }
}
