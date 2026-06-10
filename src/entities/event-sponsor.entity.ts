import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Event } from './event.entity';

export type SponsorTier =
  | 'title'
  | 'platinum'
  | 'gold'
  | 'silver'
  | 'bronze'
  | 'supporter';

@Entity('event_sponsors')
export class EventSponsor {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ name: 'event_id', type: 'varchar' })
  eventId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true, default: null })
  logoUrl: string | null;

  @Column({
    name: 'website_url',
    type: 'varchar',
    nullable: true,
    default: null,
  })
  websiteUrl: string | null;

  /** Sponsorship tier controls display order and visual treatment */
  @Column({ type: 'varchar', default: 'supporter' })
  tier: SponsorTier;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
