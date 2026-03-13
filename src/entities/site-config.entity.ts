import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export const SITE_CONFIG_KEYS = [
  'logoUrl',
  'faviconUrl',
  'supportEmail',
  'supportPhone',
  'bkashNumber',
  'location',
  'facebookUrl',
  'twitterUrl',
  'linkedinUrl',
  'instagramUrl',
  'youtubeUrl',
  'githubUrl',
] as const;

export type SiteConfigKey = (typeof SITE_CONFIG_KEYS)[number];

@Entity('site_config')
export class SiteConfig {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
