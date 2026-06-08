import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Event } from './event.entity';
import { User } from './user.entity';

@Entity('event_income')
export class EventIncome {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ name: 'event_id', type: 'varchar' })
  eventId: string;

  @Column({ type: 'varchar' })
  title: string;

  /** Amount in BDT (integer) */
  @Column({ type: 'int' })
  amount: number;

  /** e.g. "Sponsorship", "Walk-in", "Donation", "Other" */
  @Column({ type: 'varchar', nullable: true, default: null })
  category: string | null;

  @Column({ type: 'text', nullable: true, default: null })
  note: string | null;

  @Column({ name: 'income_date', type: 'date' })
  incomeDate: string;

  @Column({ name: 'added_by_user_id', type: 'varchar' })
  addedByUserId: string;

  /**
   * Optional FK to account_transactions if this income was also
   * recorded in the accounting module.
   */
  @Column({
    name: 'account_transaction_id',
    type: 'varchar',
    nullable: true,
    default: null,
  })
  accountTransactionId: string | null;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'added_by_user_id' })
  addedBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
