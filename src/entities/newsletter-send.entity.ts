import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export type NewsletterSendType = 'manual' | 'monthly_digest';

@Entity('newsletter_sends')
export class NewsletterSend {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'varchar' })
  subject: string;

  /** Full HTML body snapshot for archival */
  @Column({ type: 'text' })
  htmlBody: string;

  @Column({ name: 'recipient_count', type: 'int', default: 0 })
  recipientCount: number;

  /** 'manual' = sent by admin via compose form; 'monthly_digest' = sent from auto-generated draft */
  @Column({ type: 'varchar', default: 'manual' })
  type: NewsletterSendType;

  /** Display name or email of the admin who triggered the send */
  @Column({ name: 'sent_by_name', type: 'varchar', nullable: true, default: null })
  sentByName: string | null;

  @CreateDateColumn({ name: 'sent_at' })
  sentAt: Date;
}
