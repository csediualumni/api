import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ContactTicketComment } from './contact-ticket-comment.entity';

export type ContactTicketStatus = 'open' | 'in_progress' | 'resolved';

@Entity('contact_tickets')
export class ContactTicket {
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

  @Column({ type: 'varchar' })
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', default: 'open' })
  status: ContactTicketStatus;

  @OneToMany(() => ContactTicketComment, (c) => c.ticket, { cascade: true })
  comments: ContactTicketComment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
