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
import { Invoice } from './invoice.entity';

export type PaymentStatus = 'pending' | 'verified' | 'rejected' | 'refunded';

@Entity('invoice_payments')
export class InvoicePayment {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ name: 'invoice_id', type: 'varchar' })
  invoiceId: string;

  @ManyToOne(() => Invoice, (inv) => inv.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  /** Amount paid in this transaction (BDT) */
  @Column({ type: 'int' })
  amount: number;

  /** Gateway transaction ID (set by payment gateway) */
  @Column({ name: 'transaction_id', type: 'varchar' })
  transactionId: string;

  /** Payment gateway used (e.g. 'sslcommerz') */
  @Column({ type: 'varchar', default: 'sslcommerz' })
  gateway: string;

  /** SSL Commerz validation ID returned after successful payment */
  @Column({ name: 'val_id', type: 'varchar', nullable: true })
  valId: string | null;

  @Column({ type: 'varchar', default: 'pending' })
  status: PaymentStatus;

  /** Admin note (verification, rejection reason, refund note) */
  @Column({ name: 'admin_note', type: 'varchar', nullable: true })
  adminNote: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
