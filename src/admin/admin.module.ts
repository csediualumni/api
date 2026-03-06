import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { NewsletterModule } from '../newsletter/newsletter.module';

@Module({
  imports: [UsersModule, NewsletterModule],
  controllers: [AdminController],
})
export class AdminModule {}
