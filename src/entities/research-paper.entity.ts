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

export type VenueType = 'journal' | 'conference' | 'preprint';

@Entity('research_papers')
export class ResearchPaper {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'varchar' })
  title: string;

  /** Comma-separated list stored as simple-array */
  @Column({ type: 'simple-array' })
  authors: string[];

  @Column({ type: 'text' })
  abstract: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'varchar' })
  venue: string;

  @Column({ type: 'varchar', name: 'venue_type' })
  venueType: VenueType;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'varchar', nullable: true, default: null })
  doi: string | null;

  @Column({ type: 'varchar' })
  link: string;

  @Column({ type: 'int', default: 0 })
  citations: number;

  @Column({ type: 'boolean', default: false })
  featured: boolean;

  @Column({ name: 'submitted_by_id', type: 'varchar', nullable: true, default: null })
  submittedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'submitted_by_id' })
  submittedBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
