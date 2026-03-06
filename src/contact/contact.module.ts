import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactTicket } from '../entities/contact-ticket.entity';
import { ContactTicketComment } from '../entities/contact-ticket-comment.entity';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContactTicket, ContactTicketComment]),
    MailModule,
  ],
  controllers: [ContactController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
