import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { GalleryItem } from './gallery-item.entity';

@Entity('gallery_albums')
export class GalleryAlbum {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  /** Cover image URL (first image or manually chosen) */
  @Column({
    type: 'text',
    nullable: true,
    default: null,
    name: 'cover_image_url',
  })
  coverImageUrl: string | null;

  /** Category label, e.g. Reunion, Convocation, Workshop, Sports, Cultural */
  @Column({ type: 'varchar', default: 'General' })
  category: string;

  @Column({ type: 'int', default: new Date().getFullYear() })
  year: number;

  /** Hide album from public gallery */
  @Column({ type: 'boolean', default: true, name: 'is_published' })
  isPublished: boolean;

  /** Controls display order (lower = first) */
  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder: number;

  @OneToMany(() => GalleryItem, (item) => item.album, { cascade: true })
  items: GalleryItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
