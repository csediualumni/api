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

@Entity('user_educations')
export class UserEducation {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (u) => u.educations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar' })
  degree: string;

  @Column({ type: 'varchar' })
  institution: string;

  @Column({ type: 'int', nullable: true })
  year: number | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
