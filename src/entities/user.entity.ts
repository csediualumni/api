import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from './user-role.entity';

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true, type: 'varchar' })
  password: string | null;

  @Column({ name: 'google_id', unique: true, nullable: true, type: 'varchar' })
  googleId: string | null;

  @Column({ name: 'display_name', nullable: true, type: 'varchar' })
  displayName: string | null;

  @Column({ nullable: true, type: 'varchar' })
  avatar: string | null;

  @Column({ name: 'reset_token', nullable: true, type: 'varchar' })
  resetToken: string | null;

  @Column({ name: 'reset_token_expiry', nullable: true, type: 'timestamptz' })
  resetTokenExpiry: Date | null;

  @OneToMany(() => UserRole, (ur) => ur.user)
  userRoles: UserRole[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
