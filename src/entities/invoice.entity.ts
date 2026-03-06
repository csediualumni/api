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
import { InvoicePayment } from './invoice-payment.entity';

export type InvoiceStatus = 'pending' | 'partial' | 'paid' | 'cancelled' | 'refunded';
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

  /** Optional short label e.g. campaign title */
  @Column({ name: 'campaign_title', type: 'varchar', nullable: true })
  campaignTitle: string | null;

  /** Target amount for this invoice in BDT (integer paise-free) */
  @Column({ name: 'total_amount', type: 'int' })
  totalAmount: number;

  @Column({ type: 'varchar', default: 'pending' })
  status: InvoiceStatus;

  /** Authenticated user who created the invoice (nullable for anonymous) */
  @Column({ name: 'user_id', type: 'varchar', nullable: true })
  userId: string | null;

  /** Donor's name for non-anonymous, non-logged-in donors */
  @Column({ name: 'donor_name', type: 'varchar', nullable: true })
  donorName: string | null;

  /** Message left by donor */
  @Column({ name: 'donor_message', type: 'varchar', nullable: true })
  donorMessage: string | null;

  @Column({ name: 'is_anonymous', type: 'boolean', default: false })
  isAnonymous: boolean;

  /** Arbitrary extra metadata (campaign ID, batch, etc.) */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @OneToMany(() => InvoicePayment, (p) => p.invoice, { cascade: true })
  payments: InvoicePayment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
