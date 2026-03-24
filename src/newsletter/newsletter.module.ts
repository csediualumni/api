import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { NewsletterSubscription } from '../entities/newsletter-subscription.entity';
import { NewsletterSend } from '../entities/newsletter-send.entity';
import { NewsletterDraft } from '../entities/newsletter-draft.entity';
import { NewsArticle } from '../entities/news-article.entity';
import { Event } from '../entities/event.entity';
import { Campaign } from '../entities/campaign.entity';
import { NewsletterService } from './newsletter.service';
import { NewsletterController } from './newsletter.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      NewsletterSubscription,
      NewsletterSend,
      NewsletterDraft,
      NewsArticle,
      Event,
      Campaign,
    ]),
    MailModule,
  ],
  controllers: [NewsletterController],
  providers: [NewsletterService],
  exports: [NewsletterService],
})
export class NewsletterModule {}
