import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Role } from './role.entity';

/**
 * Maps a free-text committee designation (e.g. "President", "Treasurer")
 * to a Role that should be auto-assigned when a member with that designation
 * is added to a *current* committee, and revoked when they are removed.
 */
@Entity('designation_role_mappings')
export class DesignationRoleMapping {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  /** The exact designation string used in CommitteeMember.designation */
  @Column({ unique: true })
  designation: string;

  @Column({ name: 'role_id', type: 'varchar', nullable: true })
  roleId: string | null;

  @ManyToOne(() => Role, { onDelete: 'SET NULL', nullable: true, eager: false })
  @JoinColumn({ name: 'role_id' })
  role: Role | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
