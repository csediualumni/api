import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export type ApplicationStatus = 'pending' | 'reviewing' | 'accepted' | 'rejected';

@Entity('mentor_applications')
export class MentorApplication {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'int', nullable: true, default: null })
  batch: number | null;

  /** Area of mentorship e.g. "Data Science & AI" */
  @Column({ type: 'varchar' })
  area: string;

  @Column({ type: 'text' })
  goals: string;

  /** "mentee" | "mentor" */
  @Column({ type: 'varchar', default: 'mentee' })
  type: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: ApplicationStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
