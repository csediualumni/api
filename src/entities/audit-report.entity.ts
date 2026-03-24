import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from './user.entity';

@Entity('audit_reports')
export class AuditReport {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  /** Month number 1–12 */
  @Column({ type: 'int' })
  month: number;

  @Column({ type: 'int' })
  year: number;

  /** Opening balance manually entered by treasurer (in BDT) */
  @Column({ name: 'opening_balance', type: 'int', default: 0 })
  openingBalance: number;

  /** Snapshot of total income for the month (set at publish time) */
  @Column({ name: 'total_income', type: 'int', default: 0 })
  totalIncome: number;

  /** Snapshot of total expense for the month (set at publish time) */
  @Column({ name: 'total_expense', type: 'int', default: 0 })
  totalExpense: number;

  /** Computed: openingBalance + totalIncome - totalExpense */
  @Column({ name: 'closing_balance', type: 'int', default: 0 })
  closingBalance: number;

  /** Optional narrative or notes for the report */
  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished: boolean;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
