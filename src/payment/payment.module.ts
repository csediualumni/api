import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../entities/invoice.entity';
import { EventRegistration } from '../entities/event-registration.entity';
import { PaymentController } from './payment.controller';
import { SslCommerzService } from './sslcommerz.service';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, EventRegistration]),
    MailModule,
    UsersModule,
  ],
  controllers: [PaymentController],
  providers: [SslCommerzService],
})
export class PaymentModule {}
