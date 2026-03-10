import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { GalleryAlbum } from './gallery-album.entity';

export type GalleryItemType = 'image' | 'video';

@Entity('gallery_items')
export class GalleryItem {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  /** 'image' = S3-hosted file; 'video' = external URL (YouTube, Vimeo, etc.) */
  @Column({ type: 'varchar', default: 'image' })
  type: GalleryItemType;

  /** S3 public URL for images; YouTube/Vimeo URL for videos */
  @Column({ type: 'text' })
  url: string;

  /** Optional thumbnail for video items */
  @Column({
    type: 'text',
    nullable: true,
    default: null,
    name: 'thumbnail_url',
  })
  thumbnailUrl: string | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  caption: string | null;

  /** Display order within the album (lower = first) */
  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder: number;

  @Column({ name: 'album_id', type: 'varchar' })
  albumId: string;

  @ManyToOne(() => GalleryAlbum, (album) => album.items, {
    onDelete: 'CASCADE',
  })
  album: GalleryAlbum;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
