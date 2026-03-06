import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { NewsletterModule } from '../newsletter/newsletter.module';
import { ContactModule } from '../contact/contact.module';

@Module({
  imports: [UsersModule, NewsletterModule, ContactModule],
  controllers: [AdminController],
})
export class AdminModule {}
