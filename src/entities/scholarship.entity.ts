import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('scholarships')
export class Scholarship {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'varchar' })
  provider: string;

  /** Display string, e.g. "36,000" or "Full Funding" */
  @Column({ type: 'varchar' })
  amount: string;

  /** e.g. "BDT/year" or "incl. tuition, living, airfare" */
  @Column({ type: 'varchar' })
  currency: string;

  /** Display string, e.g. "March 31, 2026" */
  @Column({ type: 'varchar' })
  deadline: string;

  @Column({ type: 'text' })
  eligibility: string;

  /** e.g. "Undergraduate" | "Postgraduate" | "PhD" | "Short Course" */
  @Column({ type: 'varchar' })
  level: string;

  @Column({ type: 'varchar' })
  country: string;

  /** e.g. "Merit-based" | "Government / Full" */
  @Column({ type: 'varchar' })
  type: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'varchar' })
  link: string;

  @Column({ type: 'boolean', default: false })
  featured: boolean;

  @Column({ type: 'boolean', default: false })
  urgent: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
