import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from './user.entity';

export type JobType = 'Full-time' | 'Part-time' | 'Internship' | 'Remote' | 'Contract';

@Entity('job_postings')
export class JobPosting {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'varchar' })
  company: string;

  @Column({ type: 'varchar' })
  location: string;

  @Column({ type: 'varchar' })
  country: string;

  /** JobType: Full-time | Part-time | Internship | Remote | Contract */
  @Column({ type: 'varchar' })
  type: JobType;

  @Column({ type: 'varchar' })
  industry: string;

  @Column({ type: 'varchar' })
  experience: string;

  /** Display string, e.g. "BDT 1.5L – 2.5L/month" */
  @Column({ type: 'varchar', nullable: true, default: null })
  salary: string | null;

  /** Display string, e.g. "Mar 4, 2026" */
  @Column({ type: 'varchar' })
  posted: string;

  /** Display string, e.g. "Mar 31, 2026" */
  @Column({ type: 'varchar' })
  deadline: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'simple-array', nullable: true })
  skills: string[];

  @Column({ type: 'boolean', default: false })
  featured: boolean;

  // ── Relation to the user who posted this job ──────────────────
  @Column({ name: 'posted_by_id', type: 'varchar', nullable: true, default: null })
  postedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'posted_by_id' })
  postedBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
