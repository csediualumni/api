import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { NewsletterModule } from '../newsletter/newsletter.module';
import { ContactModule } from '../contact/contact.module';
import { MilestonesModule } from '../milestones/milestones.module';

@Module({
  imports: [UsersModule, NewsletterModule, ContactModule, MilestonesModule],
  controllers: [AdminController],
})
export class AdminModule {}
