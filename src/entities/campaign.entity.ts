import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type CampaignStatus = 'active' | 'completed' | 'upcoming';

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'varchar' })
  tagline: string;

  @Column({ type: 'text' })
  description: string;

  /** Fundraising target in BDT (integer) */
  @Column({ name: 'goal', type: 'int' })
  goal: number;

  @Column({ type: 'varchar', default: 'active' })
  status: CampaignStatus;

  /** Human-readable deadline e.g. "June 30, 2026" */
  @Column({ type: 'varchar', nullable: true })
  deadline: string | null;

  @Column({ type: 'varchar' })
  category: string;

  /** FontAwesome icon class e.g. "fa-graduation-cap" */
  @Column({ type: 'varchar' })
  icon: string;

  /** Tailwind bg colour class e.g. "bg-blue-600" */
  @Column({ type: 'varchar' })
  color: string;

  @Column({ type: 'boolean', default: false })
  featured: boolean;

  /** Bullet-point list of how funds are used */
  @Column({ type: 'jsonb', default: [] })
  impact: string[];

  /** Latest news / progress updates (optional) */
  @Column({ type: 'jsonb', nullable: true })
  updates: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
