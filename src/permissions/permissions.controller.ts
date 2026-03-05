import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly svc: PermissionsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PERMISSIONS_READ)
  findAll() {
    return this.svc.findAll();
  }
}
