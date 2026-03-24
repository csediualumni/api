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
import { AccountCategory } from './account-category.entity';
import { User } from './user.entity';

export type TransactionType = 'income' | 'expense';
export type TransactionReferenceType = 'invoice_payment' | 'manual';

@Entity('account_transactions')
export class AccountTransaction {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'varchar' })
  type: TransactionType;

  /** Amount in BDT (integer, no decimals) */
  @Column({ type: 'int' })
  amount: number;

  @Column({ name: 'category_id', type: 'varchar' })
  categoryId: string;

  @ManyToOne(() => AccountCategory, (c) => c.transactions, { eager: true })
  @JoinColumn({ name: 'category_id' })
  category: AccountCategory;

  @Column({ type: 'varchar' })
  description: string;

  /** User-supplied date of the transaction (date only, no time zone) */
  @Column({ type: 'date' })
  date: string;

  /** For auto-imported entries: links to the InvoicePayment.id */
  @Column({ name: 'reference_id', type: 'varchar', nullable: true })
  referenceId: string | null;

  @Column({ name: 'reference_type', type: 'varchar', default: 'manual' })
  referenceType: TransactionReferenceType;

  /** URL of uploaded receipt document (for expenses) */
  @Column({ name: 'receipt_url', type: 'varchar', nullable: true })
  receiptUrl: string | null;

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
