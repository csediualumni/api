import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../entities/event.entity';
import { EventRsvp } from '../entities/event-rsvp.entity';
import { EventRegistration } from '../entities/event-registration.entity';
import { EventFamilyMember } from '../entities/event-family-member.entity';
import { EventSponsor } from '../entities/event-sponsor.entity';
import { EventExpense } from '../entities/event-expense.entity';
import { EventIncome } from '../entities/event-income.entity';
import { EventCheckIn } from '../entities/event-checkin.entity';
import { Invoice } from '../entities/invoice.entity';
import { AccountTransaction } from '../entities/account-transaction.entity';
import { AccountCategory } from '../entities/account-category.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Event,
      EventRsvp,
      EventRegistration,
      EventFamilyMember,
      EventSponsor,
      EventExpense,
      EventIncome,
      EventCheckIn,
      Invoice,
      AccountTransaction,
      AccountCategory,
    ]),
  ],
  providers: [EventsService],
  controllers: [EventsController],
  exports: [EventsService],
})
export class EventsModule {}
