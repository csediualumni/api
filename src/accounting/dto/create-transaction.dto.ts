import { IsString, IsNotEmpty, IsIn, IsOptional, IsInt, Min, IsDateString } from 'class-validator';
import type { TransactionType, TransactionReferenceType } from '../../entities/account-transaction.entity';

export class CreateTransactionDto {
  @IsIn(['income', 'expense'])
  type: TransactionType;

  @IsInt()
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  /** ISO date string YYYY-MM-DD */
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsIn(['invoice_payment', 'manual'])
  referenceType?: TransactionReferenceType;

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
