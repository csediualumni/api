import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../entities/invoice.entity';
import { InvoicePayment } from '../entities/invoice-payment.entity';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, InvoicePayment]),
    MailModule,
    UsersModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
