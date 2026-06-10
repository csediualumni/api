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
import { User } from './user.entity';

export type CheckInType =
  | 'kit'
  | 'breakfast'
  | 'lunch'
  | 'snacks'
  | 'dinner'
  | 'gift'
  | 'custom';

@Entity('event_check_ins')
export class EventCheckIn {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ name: 'registration_id', type: 'varchar' })
  registrationId: string;

  @Column({ type: 'varchar' })
  type: CheckInType;

  /** Used when type = 'custom' */
  @Column({
    name: 'custom_label',
    type: 'varchar',
    nullable: true,
    default: null,
  })
  customLabel: string | null;

  @Column({ name: 'checked_by_user_id', type: 'varchar' })
  checkedByUserId: string;

  @ManyToOne(() => EventRegistration, (reg) => reg.checkIns, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'registration_id' })
  registration: EventRegistration;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'checked_by_user_id' })
  checkedBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
