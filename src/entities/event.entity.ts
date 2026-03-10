import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { EventRsvp } from './event-rsvp.entity';

export type EventMode = 'In-Person' | 'Online' | 'Hybrid';
export type EventStatus = 'upcoming' | 'ongoing' | 'past';

@Entity('events')
export class Event {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  description: string;

  /** Start date/time of the event (stored as UTC timestamp) */
  @Column({ type: 'timestamptz' })
  date: Date;

  /** Display-friendly time string, e.g. "5:00 PM – 10:00 PM" */
  @Column({ type: 'varchar' })
  time: string;

  @Column({ type: 'varchar' })
  location: string;

  @Column({ type: 'varchar' })
  city: string;

  @Column({ type: 'varchar', default: 'In-Person' })
  mode: EventMode;

  @Column({ type: 'varchar', default: 'Reunion' })
  category: string;

  /** Admin-controlled status — not automatically derived from date */
  @Column({ type: 'varchar', default: 'upcoming' })
  status: EventStatus;

  /** Total available seats; null = unlimited */
  @Column({ type: 'int', nullable: true, default: null })
  seats: number | null;

  /** External or internal registration URL (optional) */
  @Column({
    type: 'varchar',
    nullable: true,
    default: null,
    name: 'registration_url',
  })
  registrationUrl: string | null;

  /** Image URL for the event cover (optional) */
  @Column({ type: 'text', nullable: true, default: null, name: 'image_url' })
  imageUrl: string | null;

  /** Tailwind bg class used as placeholder when there is no imageUrl */
  @Column({ type: 'varchar', default: 'bg-zinc-200' })
  color: string;

  @Column({ type: 'boolean', default: false })
  featured: boolean;

  /** Controls display order (lower = first) */
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  /**
   * Ticket price in BDT (integer). null or 0 = free event.
   * When set, RSVP creates a pending Invoice before confirming registration.
   */
  @Column({ name: 'ticket_price', type: 'int', nullable: true, default: null })
  ticketPrice: number | null;

  @OneToMany(() => EventRsvp, (rsvp) => rsvp.event)
  rsvps: EventRsvp[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
