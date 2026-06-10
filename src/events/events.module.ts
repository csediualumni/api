import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../entities/event.entity';
import { EventRsvp } from '../entities/event-rsvp.entity';
import { EventRegistration } from '../entities/event-registration.entity';
import { EventFamilyMember } from '../entities/event-family-member.entity';
import { EventSponsor } from '../entities/event-sponsor.entity';
import { EventExpense } from '../entities/event-expense.entity';
import { EventIncome } from '../entities/event-income.entity';
import { EventCheckIn } from '../entities/event-checkin.entity';
import { Department } from '../entities/department.entity';
import { AcademicShift } from '../entities/academic-shift.entity';
import { AcademicSession } from '../entities/academic-session.entity';
import { EventDistributionItem } from '../entities/event-distribution-item.entity';
import { EventDistribution } from '../entities/event-distribution.entity';
import { User } from '../entities/user.entity';
import { UserExperience } from '../entities/user-experience.entity';
import { UserEducation } from '../entities/user-education.entity';
import { Invoice } from '../entities/invoice.entity';
import { AccountTransaction } from '../entities/account-transaction.entity';
import { AccountCategory } from '../entities/account-category.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Event,
      EventRsvp,
      EventRegistration,
      EventFamilyMember,
      EventSponsor,
      EventExpense,
      EventIncome,
      EventCheckIn,
      Department,
      AcademicShift,
      AcademicSession,
      EventDistributionItem,
      EventDistribution,
      User,
      UserExperience,
      UserEducation,
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
