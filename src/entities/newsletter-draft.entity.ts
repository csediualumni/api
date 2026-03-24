import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export type NewsletterDraftStatus = 'pending' | 'sent';

@Entity('newsletter_drafts')
export class NewsletterDraft {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'varchar' })
  subject: string;

  /** Auto-generated HTML body for the monthly digest */
  @Column({ type: 'text' })
  htmlBody: string;

  /** e.g. "2026-03" — one draft per calendar month */
  @Column({ name: 'digest_month', type: 'varchar', unique: true })
  digestMonth: string;

  /** 'pending' = not yet sent; 'sent' = dispatched to subscribers */
  @Column({ type: 'varchar', default: 'pending' })
  status: NewsletterDraftStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
