import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Event } from './event.entity';
import { User } from './user.entity';
import { Invoice } from './invoice.entity';

export type RsvpStatus = 'registered' | 'cancelled' | 'pending_payment';

@Entity('event_rsvps')
@Unique(['eventId', 'userId'])
export class EventRsvp {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ name: 'event_id', type: 'varchar' })
  eventId: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar', default: 'registered' })
  status: RsvpStatus;

  /** Linked invoice for paid-event RSVPs; null for free events */
  @Column({ name: 'invoice_id', type: 'varchar', nullable: true, default: null })
  invoiceId: string | null;

  @ManyToOne(() => Event, (event) => event.rsvps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Invoice, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
