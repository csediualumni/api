import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountCategory } from '../entities/account-category.entity';
import { AccountTransaction } from '../entities/account-transaction.entity';
import { AuditReport } from '../entities/audit-report.entity';
import { InvoicePayment } from '../entities/invoice-payment.entity';
import { Invoice } from '../entities/invoice.entity';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    UploadModule,
    TypeOrmModule.forFeature([
      AccountCategory,
      AccountTransaction,
      AuditReport,
      InvoicePayment,
      Invoice,
    ]),
  ],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
