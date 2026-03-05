import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Role } from './role.entity';
import { Permission } from './permission.entity';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryColumn({ name: 'role_id', type: 'varchar' })
  roleId: string;

  @PrimaryColumn({ name: 'permission_id', type: 'varchar' })
  permissionId: string;

  @ManyToOne(() => Role, (r) => r.permissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Permission, (p) => p.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;
}
