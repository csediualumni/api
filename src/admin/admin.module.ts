import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { NewsletterModule } from '../newsletter/newsletter.module';
import { ContactModule } from '../contact/contact.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { CommitteesModule } from '../committees/committees.module';
import { EventsModule } from '../events/events.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UsersModule, NewsletterModule, ContactModule, MilestonesModule, CommitteesModule, EventsModule, UploadModule],
  controllers: [AdminController],
})
export class AdminModule {}
