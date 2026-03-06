import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsletterSubscription } from '../entities/newsletter-subscription.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class NewsletterService {
  constructor(
    @InjectRepository(NewsletterSubscription)
    private readonly subRepo: Repository<NewsletterSubscription>,
    private readonly mail: MailService,
  ) {}

  // ── Public ───────────────────────────────────────────────────

  async subscribe(email: string): Promise<{ message: string }> {
    const existing = await this.subRepo.findOne({ where: { email } });
    if (existing) {
      if (existing.isActive) {
        throw new ConflictException('Email is already subscribed.');
      }
      // Reactivate
      existing.isActive = true;
      await this.subRepo.save(existing);
      return { message: 'Subscription reactivated.' };
    }
    const sub = this.subRepo.create({ email });
    await this.subRepo.save(sub);
    return { message: 'Successfully subscribed.' };
  }

  async unsubscribe(token: string): Promise<{ message: string }> {
    // token = base64-encoded email for simplicity
    let email: string;
    try {
      email = Buffer.from(token, 'base64').toString('utf-8');
    } catch {
      throw new NotFoundException('Invalid unsubscribe token.');
    }
    const sub = await this.subRepo.findOne({ where: { email } });
    if (!sub) throw new NotFoundException('Subscription not found.');
    sub.isActive = false;
    await this.subRepo.save(sub);
    return { message: 'Successfully unsubscribed.' };
  }

  // ── Admin ────────────────────────────────────────────────────

  findAll(): Promise<NewsletterSubscription[]> {
    return this.subRepo.find({ order: { subscribedAt: 'DESC' } });
  }

  async toggleActive(id: string): Promise<NewsletterSubscription> {
    const sub = await this.subRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException('Subscription not found.');
    sub.isActive = !sub.isActive;
    return this.subRepo.save(sub);
  }

  async remove(id: string): Promise<void> {
    const sub = await this.subRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException('Subscription not found.');
    await this.subRepo.remove(sub);
  }

  async sendBroadcast(
    subject: string,
    htmlBody: string,
  ): Promise<{ sent: number }> {
    const subs = await this.subRepo.find({ where: { isActive: true } });
    let sent = 0;
    for (const sub of subs) {
      try {
        await this.mail.sendNewsletter(sub.email, subject, htmlBody);
        sent++;
      } catch {
        // continue best-effort
      }
    }
    return { sent };
  }

  /** Get only active subscriber emails for sending */
  async getActiveEmails(): Promise<string[]> {
    const subs = await this.subRepo.find({ where: { isActive: true } });
    return subs.map((s) => s.email);
  }
}
