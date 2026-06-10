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
import { TShirtSize } from './event-registration.entity';

@Entity('event_family_members')
export class EventFamilyMember {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ name: 'registration_id', type: 'varchar' })
  registrationId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({
    name: 't_shirt_size',
    type: 'varchar',
    nullable: true,
    default: null,
  })
  tShirtSize: TShirtSize | null;

  @ManyToOne(() => EventRegistration, (reg) => reg.familyMembers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'registration_id' })
  registration: EventRegistration;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
