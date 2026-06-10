import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Event } from './event.entity';
import { User } from './user.entity';
import { Invoice } from './invoice.entity';
import { EventFamilyMember } from './event-family-member.entity';
import { EventCheckIn } from './event-checkin.entity';

export type RegistrationStatus = 'pending_payment' | 'confirmed' | 'cancelled';
export type TShirtSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';

@Entity('event_registrations')
export class EventRegistration {
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

  @Column({ type: 'varchar', default: 'pending_payment' })
  status: RegistrationStatus;

  /** Linked invoice covering ticket + family fees + donation */
  @Column({
    name: 'invoice_id',
    type: 'varchar',
    nullable: true,
    default: null,
  })
  invoiceId: string | null;

  @Column({
    name: 't_shirt_size',
    type: 'varchar',
    nullable: true,
    default: null,
  })
  tShirtSize: TShirtSize | null;

  /** Number of additional family members (not counting the primary registrant) */
  @Column({ name: 'family_members_count', type: 'int', default: 0 })
  familyMembersCount: number;

  /** Optional donation amount in BDT on top of ticket price */
  @Column({ name: 'donation_amount', type: 'int', default: 0 })
  donationAmount: number;

  /** Internal notes (can be added by booth volunteers) */
  @Column({ type: 'text', nullable: true, default: null })
  notes: string | null;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Invoice, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice | null;

  @OneToMany(() => EventFamilyMember, (fm) => fm.registration, {
    cascade: true,
  })
  familyMembers: EventFamilyMember[];

  @OneToMany(() => EventCheckIn, (ci) => ci.registration, { cascade: true })
  checkIns: EventCheckIn[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
