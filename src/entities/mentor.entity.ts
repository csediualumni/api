import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('mentors')
export class Mentor {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'int' })
  batch: number;

  @Column({ type: 'varchar' })
  role: string;

  @Column({ type: 'varchar' })
  company: string;

  @Column({ type: 'varchar' })
  country: string;

  @Column({ type: 'varchar' })
  city: string;

  /** Initials shown on the avatar (e.g. "AI") */
  @Column({ type: 'varchar', nullable: true, default: null })
  initials: string | null;

  /** Tailwind bg class for avatar colour (e.g. "bg-sky-600") */
  @Column({ type: 'varchar', nullable: true, default: null })
  color: string | null;

  @Column({ type: 'simple-array', nullable: true })
  expertise: string[];

  @Column({ type: 'text' })
  bio: string;

  /** e.g. "2 hrs/week" */
  @Column({ type: 'varchar' })
  availability: string;

  @Column({ type: 'int', default: 0 })
  mentees: number;

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  rating: number;

  @Column({ type: 'boolean', default: false })
  featured: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
