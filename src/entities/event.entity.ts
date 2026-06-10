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

/** A single item in the event day schedule */
export interface EventTimelineItem {
  time: string;       // e.g. "9:00 AM"
  title: string;      // e.g. "Breakfast"
  description?: string;
}

/** A single guest with optional photo and designation */
export interface EventGuest {
  name: string;
  designation?: string;
  image?: string;
}

/** Named guests of honour */
export interface EventGuestList {
  president?: EventGuest;
  chiefGuest?: EventGuest;
  specialGuests?: EventGuest[];
}

/** A contact person for the event (name, image, phone, email) */
export interface EventContactPerson {
  name: string;
  image?: string;
  phone?: string;
  email?: string;
}

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
   * When set, registration creates a pending Invoice before confirming.
   */
  @Column({ name: 'ticket_price', type: 'int', nullable: true, default: null })
  ticketPrice: number | null;

  /** Whether the event is visible on the public site */
  @Column({ type: 'boolean', default: false })
  published: boolean;

  /** Day-of schedule items, ordered as they should appear */
  @Column({ type: 'jsonb', nullable: true, default: null })
  timeline: EventTimelineItem[] | null;

  /** Named guests of honour (president, chief guest, special guests) */
  @Column({ name: 'guest_list', type: 'jsonb', nullable: true, default: null })
  guestList: EventGuestList | null;

  /** Rich HTML describing event activities */
  @Column({ type: 'text', nullable: true, default: null })
  activities: string | null;

  /** If true, registrants may bring additional family members */
  @Column({ name: 'allow_family_members', type: 'boolean', default: false })
  allowFamilyMembers: boolean;

  /** Fee per additional family member in BDT; null = same as ticket price */
  @Column({ name: 'family_member_fee', type: 'int', nullable: true, default: null })
  familyMemberFee: number | null;

  /** If true, registrants can add an optional donation when registering */
  @Column({ name: 'donation_enabled', type: 'boolean', default: false })
  donationEnabled: boolean;

  /** Contact persons for the event (name, image, phone, email) */
  @Column({ name: 'contact_persons', type: 'jsonb', nullable: true, default: null })
  contactPersons: EventContactPerson[] | null;

  @Column({ name: 'registration_open_at', type: 'timestamptz', nullable: true, default: null })
  registrationOpenAt: Date | null;

  @Column({ name: 'registration_close_at', type: 'timestamptz', nullable: true, default: null })
  registrationCloseAt: Date | null;

  @OneToMany(() => EventRsvp, (rsvp) => rsvp.event)
  rsvps: EventRsvp[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
