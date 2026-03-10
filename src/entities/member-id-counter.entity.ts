import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Tracks the last-assigned sequential number for each year's member IDs.
 * A single-row-per-year table updated with an atomic upsert guarantees
 * uniqueness under any level of concurrency without application-level locking.
 */
@Entity('member_id_counter')
export class MemberIdCounter {
  @PrimaryColumn({ type: 'int' })
  year: number;

  @Column({ name: 'last_seq', type: 'int', default: 0 })
  lastSeq: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
