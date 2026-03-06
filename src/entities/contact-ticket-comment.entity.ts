import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryColumn,
  BeforeInsert,
  JoinColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ContactTicket } from './contact-ticket.entity';

@Entity('contact_ticket_comments')
export class ContactTicketComment {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ name: 'ticket_id', type: 'varchar' })
  ticketId: string;

  @ManyToOne(() => ContactTicket, (t) => t.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: ContactTicket;

  /** Author label: admin display name or "System" */
  @Column({ name: 'author_name', type: 'varchar' })
  authorName: string;

  @Column({ type: 'text' })
  body: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
