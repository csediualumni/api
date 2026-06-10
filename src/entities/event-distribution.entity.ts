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
import { EventRegistration } from './event-registration.entity';
import { EventDistributionItem } from './event-distribution-item.entity';
import { User } from './user.entity';

export type RecipientType = 'main' | 'family';

/**
 * Records each act of distributing an item to a registrant.
 * For family members, recipientType = 'family' and quantity = number of
 * family members receiving (tracked as a total, not per individual).
 */
@Entity('event_distributions')
export class EventDistribution {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ name: 'registration_id', type: 'varchar' })
  registrationId: string;

  @Column({ name: 'distribution_item_id', type: 'varchar' })
  distributionItemId: string;

  @Column({ name: 'recipient_type', type: 'varchar' })
  recipientType: RecipientType;

  /** Quantity distributed in this record */
  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'distributed_by_user_id', type: 'varchar' })
  distributedByUserId: string;

  /** Browser/device info captured from the booth device */
  @Column({ name: 'device_info', type: 'jsonb', nullable: true, default: null })
  deviceInfo: Record<string, string> | null;

  @ManyToOne(() => EventRegistration, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'registration_id' })
  registration: EventRegistration;

  @ManyToOne(() => EventDistributionItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'distribution_item_id' })
  distributionItem: EventDistributionItem;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'distributed_by_user_id' })
  distributedBy: User;

  @CreateDateColumn({ name: 'distributed_at' })
  distributedAt: Date;
}
