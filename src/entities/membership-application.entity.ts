import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export type MembershipApplicationStatus =
  | 'payment_required'
  | 'payment_submitted'
  | 'approved'
  | 'rejected';

@Entity('membership_applications')
export class MembershipApplication {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  /** The applicant */
  @Column({ name: 'user_id', type: 'varchar', unique: true, nullable: false })
  userId: string;

  /** Linked invoice for the ৳500 membership fee */
  @Column({ name: 'invoice_id', type: 'varchar', nullable: true })
  invoiceId: string | null;

  /**
   * Application workflow status.
   * payment_required → (user submits payment) → payment_submitted
   * payment_submitted → (admin decision) → approved | rejected
   * payment_required  → (admin decision) → approved | rejected  (out-of-band payment)
   */
  @Column({ type: 'varchar', default: 'payment_required' })
  status: MembershipApplicationStatus;

  /** When the applicant accepted the terms & community policy */
  @Column({ name: 'terms_accepted_at', type: 'timestamp' })
  termsAcceptedAt: Date;

  /** Set when an admin approves or rejects the application */
  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  /** Admin user ID who performed the review */
  @Column({ name: 'reviewed_by', type: 'varchar', nullable: true })
  reviewedBy: string | null;

  /** Populated when status = 'rejected' */
  @Column({ name: 'rejection_reason', type: 'varchar', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
