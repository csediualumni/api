import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Event } from './event.entity';

export type DistributionItemType =
  | 'kit'
  | 'breakfast'
  | 'lunch'
  | 'snacks'
  | 'dinner'
  | 'gift'
  | 'custom';

/**
 * Configures what items are available for distribution at an event
 * and how many each attendee type is entitled to.
 * Admin must configure one record per item per event.
 */
@Entity('event_distribution_items')
export class EventDistributionItem {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ name: 'event_id', type: 'varchar' })
  eventId: string;

  @Column({ type: 'varchar' })
  itemType: DistributionItemType;

  /** Used when itemType = 'custom' */
  @Column({ name: 'custom_label', type: 'varchar', nullable: true, default: null })
  customLabel: string | null;

  /** Whether the main registrant is entitled to this item */
  @Column({ name: 'applies_to_main', type: 'boolean', default: true })
  appliesToMain: boolean;

  /** Whether family members are entitled to this item */
  @Column({ name: 'applies_to_family', type: 'boolean', default: false })
  appliesToFamily: boolean;

  /** How many units the main registrant gets (typically 1) */
  @Column({ name: 'qty_per_main', type: 'int', default: 1 })
  quantityPerMain: number;

  /**
   * How many units each family member gets (1 per family member).
   * Total distributed to family = familyMembersCount * quantityPerFamily
   */
  @Column({ name: 'qty_per_family', type: 'int', default: 1 })
  quantityPerFamily: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;
}
