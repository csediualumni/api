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
import { UserExperience } from './user-experience.entity';
import { UserEducation } from './user-education.entity';
import { UserAchievement } from './user-achievement.entity';

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

  // ── Profile fields ────────────────────────────────────────────

  @Column({ nullable: true, type: 'varchar' })
  phone: string | null;

  @Column({ nullable: true, type: 'int' })
  batch: number | null;

  @Column({ nullable: true, type: 'text' })
  bio: string | null;

  @Column({ name: 'job_title', nullable: true, type: 'varchar' })
  jobTitle: string | null;

  @Column({ nullable: true, type: 'varchar' })
  company: string | null;

  @Column({ nullable: true, type: 'varchar' })
  industry: string | null;

  @Column({ nullable: true, type: 'varchar' })
  city: string | null;

  @Column({ nullable: true, type: 'varchar' })
  country: string | null;

  @Column({ nullable: true, type: 'varchar' })
  linkedin: string | null;

  @Column({ nullable: true, type: 'varchar' })
  github: string | null;

  @Column({ nullable: true, type: 'varchar' })
  twitter: string | null;

  @Column({ nullable: true, type: 'varchar' })
  website: string | null;

  @Column({ name: 'open_to_mentoring', default: false })
  openToMentoring: boolean;

  @Column({ type: 'simple-array', nullable: true })
  skills: string[] | null;

  // ── Relations ─────────────────────────────────────────────────

  @OneToMany(() => UserRole, (ur) => ur.user)
  userRoles: UserRole[];

  @OneToMany(() => UserExperience, (e) => e.user)
  experiences: UserExperience[];

  @OneToMany(() => UserEducation, (e) => e.user)
  educations: UserEducation[];

  @OneToMany(() => UserAchievement, (a) => a.user)
  achievements: UserAchievement[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
