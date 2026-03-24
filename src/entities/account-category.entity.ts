import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AccountTransaction } from './account-transaction.entity';

export type CategoryType = 'income' | 'expense' | 'both';

@Entity('account_categories')
export class AccountCategory {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'varchar', unique: true })
  name: string;

  /** Whether this category applies to income, expense, or both */
  @Column({ type: 'varchar', default: 'both' })
  type: CategoryType;

  /** System categories cannot be deleted */
  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => AccountTransaction, (t) => t.category)
  transactions: AccountTransaction[];
}
