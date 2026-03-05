import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { RolePermission } from './role-permission.entity';

@Entity('permissions')
export class Permission {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ unique: true })
  key: string;

  @Column({ nullable: true, type: 'varchar' })
  description: string | null;

  @Column({ nullable: true, type: 'varchar' })
  group: string | null;

  @OneToMany(() => RolePermission, (rp) => rp.permission)
  roles: RolePermission[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
