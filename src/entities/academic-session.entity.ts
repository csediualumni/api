import { BeforeInsert, Column, Entity, PrimaryColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/** Academic sessions e.g. 2018-19, 2019-20 */
@Entity('academic_sessions')
export class AcademicSession {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  /** Year range format: "2018-19" */
  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
