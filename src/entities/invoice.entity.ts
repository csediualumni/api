import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export type InvoiceStatus =
  | 'pending'
  | 'paid'
  | 'cancelled'
  | 'refunded';
export type InvoiceType = 'donation' | 'event' | 'membership' | 'other';

@Entity('invoices')
export class Invoice {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'varchar', default: 'donation' })
  type: InvoiceType;

  @Column({ type: 'varchar' })
  description: string;

  @Column({ name: 'campaign_title', type: 'varchar', nullable: true })
  campaignTitle: string | null;

  @Column({ name: 'total_amount', type: 'int' })
  totalAmount: number;

  @Column({ type: 'varchar', default: 'pending' })
  status: InvoiceStatus;

  @Column({ name: 'user_id', type: 'varchar', nullable: true })
  userId: string | null;

  @Column({ name: 'donor_name', type: 'varchar', nullable: true })
  donorName: string | null;

  @Column({ name: 'donor_message', type: 'varchar', nullable: true })
  donorMessage: string | null;

  @Column({ name: 'is_anonymous', type: 'boolean', default: false })
  isAnonymous: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  // ── Single payment fields (one SSLCommerz transaction per invoice) ──────────
  @Column({ name: 'transaction_id', type: 'varchar', nullable: true })
  transactionId: string | null;

  @Column({ name: 'val_id', type: 'varchar', nullable: true })
  valId: string | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  gateway: string | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Column({ name: 'admin_note', type: 'varchar', nullable: true })
  adminNote: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
