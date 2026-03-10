import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export type NewsCategory =
  | 'Announcement'
  | 'Achievement'
  | 'Events'
  | 'Research'
  | 'Career'
  | 'Community';

@Entity('news_articles')
export class NewsArticle {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar' })
  category: NewsCategory;

  @Column({ type: 'varchar' })
  author: string;

  /** Display-friendly date string, e.g. "March 5, 2026" */
  @Column({ type: 'varchar' })
  date: string;

  @Column({ type: 'varchar', name: 'read_time' })
  readTime: string;

  @Column({ type: 'varchar' })
  icon: string;

  /** Tailwind bg class used as card background accent, e.g. "bg-violet-100" */
  @Column({ type: 'varchar' })
  color: string;

  @Column({ type: 'boolean', default: false })
  pinned: boolean;

  @Column({ type: 'boolean', default: false })
  featured: boolean;

  /** Controls display order (lower = first). null = natural create-date order. */
  @Column({ name: 'sort_order', type: 'int', nullable: true, default: null })
  sortOrder: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
