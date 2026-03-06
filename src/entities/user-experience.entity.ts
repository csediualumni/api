import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from './user.entity';

@Entity('user_experiences')
export class UserExperience {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (u) => u.experiences, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'varchar' })
  company: string;

  @Column({ name: 'from_year', type: 'varchar' })
  from: string;

  @Column({ name: 'to_year', type: 'varchar' })
  to: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
