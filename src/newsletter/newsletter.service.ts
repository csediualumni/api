import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { NewsletterSubscription } from '../entities/newsletter-subscription.entity';
import { NewsletterSend, NewsletterSendType } from '../entities/newsletter-send.entity';
import { NewsletterDraft } from '../entities/newsletter-draft.entity';
import { NewsArticle } from '../entities/news-article.entity';
import { Event } from '../entities/event.entity';
import { Campaign } from '../entities/campaign.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    @InjectRepository(NewsletterSubscription)
    private readonly subRepo: Repository<NewsletterSubscription>,
    @InjectRepository(NewsletterSend)
    private readonly sendRepo: Repository<NewsletterSend>,
    @InjectRepository(NewsletterDraft)
    private readonly draftRepo: Repository<NewsletterDraft>,
    @InjectRepository(NewsArticle)
    private readonly newsRepo: Repository<NewsArticle>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
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

  // ── Admin — Subscriptions ─────────────────────────────────────

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

  // ── Admin — Send & History ────────────────────────────────────

  async sendBroadcast(
    subject: string,
    htmlBody: string,
    sentByName?: string,
    type: NewsletterSendType = 'manual',
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

    // Record the send in history
    const record = this.sendRepo.create({
      subject,
      htmlBody,
      recipientCount: sent,
      type,
      sentByName: sentByName ?? null,
    });
    await this.sendRepo.save(record);

    return { sent };
  }

  findAllSends(): Promise<NewsletterSend[]> {
    return this.sendRepo.find({ order: { sentAt: 'DESC' } });
  }

  /** Get only active subscriber emails for sending */
  async getActiveEmails(): Promise<string[]> {
    const subs = await this.subRepo.find({ where: { isActive: true } });
    return subs.map((s) => s.email);
  }

  // ── Admin — Monthly Drafts ─────────────────────────────────────

  findAllDrafts(): Promise<NewsletterDraft[]> {
    return this.draftRepo.find({ order: { createdAt: 'DESC' } });
  }

  async getDraft(id: string): Promise<NewsletterDraft> {
    const draft = await this.draftRepo.findOne({ where: { id } });
    if (!draft) throw new NotFoundException('Draft not found.');
    return draft;
  }

  async deleteDraft(id: string): Promise<void> {
    const draft = await this.draftRepo.findOne({ where: { id } });
    if (!draft) throw new NotFoundException('Draft not found.');
    await this.draftRepo.remove(draft);
  }

  async sendDraft(id: string, sentByName?: string): Promise<{ sent: number }> {
    const draft = await this.getDraft(id);
    const result = await this.sendBroadcast(
      draft.subject,
      draft.htmlBody,
      sentByName,
      'monthly_digest',
    );
    draft.status = 'sent';
    await this.draftRepo.save(draft);
    return result;
  }

  // ── Scheduled: auto-generate monthly digest draft ─────────────

  /** Runs at 08:00 on the 1st of every month */
  @Cron('0 8 1 * *')
  async generateMonthlyDraft(): Promise<void> {
    const now = new Date();
    // Target = previous calendar month
    const targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const targetMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1; // 0-indexed

    const digestMonth = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
    const monthLabel = new Date(targetYear, targetMonth, 1).toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    // Guard: skip if a draft already exists for this month
    const existing = await this.draftRepo.findOne({ where: { digestMonth } });
    if (existing) {
      this.logger.log(`Monthly draft for ${digestMonth} already exists — skipping.`);
      return;
    }

    const start = new Date(targetYear, targetMonth, 1);
    const end = new Date(targetYear, targetMonth + 1, 1); // exclusive upper bound

    const [articles, events, campaigns] = await Promise.all([
      this.newsRepo.find({
        where: { createdAt: Between(start, end) },
        order: { createdAt: 'DESC' },
      }),
      this.eventRepo.find({
        where: { createdAt: Between(start, end) },
        order: { createdAt: 'DESC' },
      }),
      this.campaignRepo.find({
        where: { createdAt: Between(start, end) },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const subject = `CSE DIU Alumni Newsletter — ${monthLabel}`;
    const htmlBody = this._buildDigestHtml(monthLabel, articles, events, campaigns);

    const draft = this.draftRepo.create({ subject, htmlBody, digestMonth });
    await this.draftRepo.save(draft);
    this.logger.log(
      `Monthly digest draft created for ${digestMonth} (${articles.length} articles, ${events.length} events, ${campaigns.length} campaigns).`,
    );
  }

  // ── Template builder ──────────────────────────────────────────

  private _buildDigestHtml(
    monthLabel: string,
    articles: NewsArticle[],
    events: Event[],
    campaigns: Campaign[],
  ): string {
    const sectionTitle = (icon: string, title: string) =>
      `<h2 style="font-size:16px;font-weight:700;color:#111;margin:32px 0 12px;padding-bottom:8px;border-bottom:2px solid #e5e7eb;">${icon} ${title}</h2>`;

    const emptyNote = (msg: string) =>
      `<p style="color:#9ca3af;font-size:13px;font-style:italic;">${msg}</p>`;

    // What's New (editable placeholder)
    const whatsNew = `
      <div style="background:#f0f9ff;border-left:4px solid #3b82f6;padding:14px 18px;border-radius:4px;margin-bottom:8px;">
        <p style="font-weight:700;font-size:14px;color:#1e40af;margin:0 0 6px 0;">
          ✏️ What's New in the Platform — ${monthLabel}
        </p>
        <p style="color:#374151;font-size:14px;line-height:1.6;margin:0;">
          [<em>Replace this block with a short description of new alumni portal features, improvements, or announcements for ${monthLabel}.</em>]
        </p>
      </div>`;

    // News & Blogs
    let newsSection = sectionTitle('📰', 'News &amp; Blogs');
    if (articles.length === 0) {
      newsSection += emptyNote('No news articles published this month.');
    } else {
      newsSection += articles
        .map(
          (a) => `
        <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #f3f4f6;">
          <p style="margin:0 0 2px;font-weight:600;font-size:14px;color:#111;">${a.title}</p>
          <p style="margin:0;font-size:12px;color:#6b7280;">${a.category} &bull; ${a.date}</p>
          ${a.summary ? `<p style="margin:4px 0 0;font-size:13px;color:#374151;line-height:1.5;">${a.summary}</p>` : ''}
        </div>`,
        )
        .join('');
    }

    // Events
    let eventsSection = sectionTitle('📅', 'Upcoming &amp; New Events');
    if (events.length === 0) {
      eventsSection += emptyNote('No events published this month.');
    } else {
      eventsSection += events
        .map(
          (e) => `
        <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #f3f4f6;">
          <p style="margin:0 0 2px;font-weight:600;font-size:14px;color:#111;">${e.title}</p>
          <p style="margin:0;font-size:12px;color:#6b7280;">${e.mode} &bull; ${e.location}, ${e.city}</p>
          ${e.description ? `<p style="margin:4px 0 0;font-size:13px;color:#374151;line-height:1.5;">${e.description.slice(0, 160)}${e.description.length > 160 ? '…' : ''}</p>` : ''}
        </div>`,
        )
        .join('');
    }

    // Campaigns
    let campaignsSection = sectionTitle('🎯', 'Active Campaigns');
    if (campaigns.length === 0) {
      campaignsSection += emptyNote('No campaigns published this month.');
    } else {
      campaignsSection += campaigns
        .map(
          (c) => `
        <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #f3f4f6;">
          <p style="margin:0 0 2px;font-weight:600;font-size:14px;color:#111;">${c.title}</p>
          <p style="margin:0;font-size:12px;color:#6b7280;">${c.category} &bull; ${c.status === 'active' ? 'Active' : c.status === 'upcoming' ? 'Upcoming' : 'Completed'}</p>
          ${c.tagline ? `<p style="margin:4px 0 0;font-size:13px;color:#374151;line-height:1.5;">${c.tagline}</p>` : ''}
        </div>`,
        )
        .join('');
    }

    return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;color:#1f2937;line-height:1.6;">
  <p style="font-size:15px;color:#374151;">Hi there,</p>
  <p style="font-size:14px;color:#374151;">Here is your monthly update from the <strong>CSE DIU Alumni Portal</strong> for <strong>${monthLabel}</strong>. Stay connected with your fellow alumni and explore what's new.</p>

  ${whatsNew}
  ${newsSection}
  ${eventsSection}
  ${campaignsSection}

  <p style="font-size:14px;color:#374151;margin-top:24px;">Stay connected, and thank you for being part of the CSE DIU Alumni family!</p>
</div>`.trim();
  }
}
