import { SetMetadata } from '@nestjs/common';
import { PermissionKey } from '../permissions.constants';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...perms: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, perms);
