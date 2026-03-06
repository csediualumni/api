import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.config.get<number>('SMTP_PORT', 587),
      secure: this.config.get<number>('SMTP_PORT', 587) === 465,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendPasswordReset(to: string, resetLink: string): Promise<void> {
    const from = this.config.get<string>(
      'SMTP_FROM',
      'support@csediualumni.com',
    );

    await this.transporter.sendMail({
      from: `"CSE DIU Alumni" <${from}>`,
      to,
      subject: 'Password Recovery – CSE DIU Alumni Network',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:8px;">
          <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:20px;">Password Recovery</h2>
          <p style="color:#52525b;font-size:14px;line-height:1.6;margin:0 0 20px;">
            We received a request to reset the password for your CSE DIU Alumni account associated with <strong>${to}</strong>.
          </p>
          <p style="color:#52525b;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
          </p>
          <a href="${resetLink}"
            style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
            Reset My Password
          </a>
          <p style="color:#a1a1aa;font-size:12px;margin:24px 0 0;">
            If you didn't request this, you can safely ignore this email — your password won't change.<br><br>
            CSE DIU Alumni Network &nbsp;|&nbsp; <a href="mailto:support@csediualumni.com" style="color:#2563eb;">support@csediualumni.com</a>
          </p>
        </div>
      `,
    });

    this.logger.log(`Password reset email sent to ${to}`);
  }

  async sendInvoiceCreated(
    to: string,
    invoiceId: string,
    description: string,
    amount: number,
    paymentUrl: string,
  ): Promise<void> {
    const from = this.config.get<string>(
      'SMTP_FROM',
      'support@csediualumni.com',
    );
    const formattedAmount = `৳${amount.toLocaleString()}`;
    const shortId = invoiceId.slice(0, 8).toUpperCase();

    await this.transporter.sendMail({
      from: `"CSE DIU Alumni" <${from}>`,
      to,
      subject: `Invoice Created – ${formattedAmount} – CSE DIU Alumni`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:8px;">
          <h2 style="margin:0 0 8px;color:#065f46;font-size:20px;">Invoice Created</h2>
          <p style="color:#52525b;font-size:14px;line-height:1.6;margin:0 0 16px;">
            Hi there! An invoice has been created for your donation to <strong>CSE DIU Alumni Network</strong>.
          </p>
          <div style="background:#fff;border:1px solid #e4e4e7;border-radius:8px;padding:16px 20px;margin:0 0 20px;">
            <table style="width:100%;font-size:13px;color:#3f3f46;">
              <tr><td style="padding:4px 0;color:#71717a;">Invoice ID</td><td style="padding:4px 0;font-family:monospace;font-weight:600;">${shortId}…</td></tr>
              <tr><td style="padding:4px 0;color:#71717a;">Description</td><td style="padding:4px 0;">${description}</td></tr>
              <tr><td style="padding:4px 0;color:#71717a;">Amount Due</td><td style="padding:4px 0;font-weight:700;font-size:15px;color:#065f46;">${formattedAmount}</td></tr>
            </table>
          </div>
          <p style="color:#52525b;font-size:14px;margin:0 0 20px;">
            Use the button below to complete your payment via <strong>bKash</strong> at any time.
          </p>
          <a href="${paymentUrl}"
            style="display:inline-block;padding:12px 28px;background:#059669;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
            Pay Now
          </a>
          <p style="color:#a1a1aa;font-size:12px;margin:24px 0 0;">
            You can also copy this link: <a href="${paymentUrl}" style="color:#059669;word-break:break-all;">${paymentUrl}</a><br><br>
            CSE DIU Alumni Network &nbsp;|&nbsp; <a href="mailto:support@csediualumni.com" style="color:#059669;">support@csediualumni.com</a>
          </p>
        </div>
      `,
    });

    this.logger.log(
      `Invoice created email sent to ${to} for invoice ${invoiceId}`,
    );
  }

  async sendPaymentSubmitted(
    to: string,
    invoiceId: string,
    description: string,
    amount: number,
    transactionId: string,
  ): Promise<void> {
    const from = this.config.get<string>(
      'SMTP_FROM',
      'support@csediualumni.com',
    );
    const formattedAmount = `৳${amount.toLocaleString()}`;
    const shortId = invoiceId.slice(0, 8).toUpperCase();

    await this.transporter.sendMail({
      from: `"CSE DIU Alumni" <${from}>`,
      to,
      subject: `Payment Submitted – ${formattedAmount} Under Review – CSE DIU Alumni`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:8px;">
          <h2 style="margin:0 0 8px;color:#065f46;font-size:20px;">Payment Received &amp; Under Review</h2>
          <p style="color:#52525b;font-size:14px;line-height:1.6;margin:0 0 16px;">
            Thank you! We have received your payment submission and it is currently being reviewed by our team.
          </p>
          <div style="background:#fff;border:1px solid #e4e4e7;border-radius:8px;padding:16px 20px;margin:0 0 20px;">
            <table style="width:100%;font-size:13px;color:#3f3f46;">
              <tr><td style="padding:4px 0;color:#71717a;">Invoice ID</td><td style="padding:4px 0;font-family:monospace;font-weight:600;">${shortId}…</td></tr>
              <tr><td style="padding:4px 0;color:#71717a;">Description</td><td style="padding:4px 0;">${description}</td></tr>
              <tr><td style="padding:4px 0;color:#71717a;">Amount</td><td style="padding:4px 0;font-weight:700;font-size:15px;color:#065f46;">${formattedAmount}</td></tr>
              <tr><td style="padding:4px 0;color:#71717a;">Transaction ID</td><td style="padding:4px 0;font-family:monospace;">${transactionId}</td></tr>
              <tr><td style="padding:4px 0;color:#71717a;">Status</td><td style="padding:4px 0;"><span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:99px;font-size:12px;font-weight:600;">Under Review</span></td></tr>
            </table>
          </div>
          <p style="color:#52525b;font-size:14px;margin:0 0 0;">
            We will notify you by email once your payment is verified. This usually takes 1–2 business days.
          </p>
          <p style="color:#a1a1aa;font-size:12px;margin:24px 0 0;">
            CSE DIU Alumni Network &nbsp;|&nbsp; <a href="mailto:support@csediualumni.com" style="color:#059669;">support@csediualumni.com</a>
          </p>
        </div>
      `,
    });

    this.logger.log(
      `Payment submitted email sent to ${to} for invoice ${invoiceId}`,
    );
  }

  async sendPaymentStatusUpdated(
    to: string,
    invoiceId: string,
    description: string,
    amount: number,
    newStatus: string,
    adminNote?: string | null,
  ): Promise<void> {
    const from = this.config.get<string>(
      'SMTP_FROM',
      'support@csediualumni.com',
    );
    const formattedAmount = `৳${amount.toLocaleString()}`;
    const shortId = invoiceId.slice(0, 8).toUpperCase();

    const statusLabel: Record<string, string> = {
      verified: 'Verified ✓',
      rejected: 'Rejected',
      refunded: 'Refunded',
      pending: 'Pending',
    };
    const statusColor: Record<string, string> = {
      verified: 'background:#d1fae5;color:#065f46;',
      rejected: 'background:#fee2e2;color:#991b1b;',
      refunded: 'background:#e0e7ff;color:#3730a3;',
      pending: 'background:#fef3c7;color:#92400e;',
    };

    const label = statusLabel[newStatus] ?? newStatus;
    const color = statusColor[newStatus] ?? 'background:#f4f4f5;color:#3f3f46;';

    await this.transporter.sendMail({
      from: `"CSE DIU Alumni" <${from}>`,
      to,
      subject: `Payment ${label} – CSE DIU Alumni`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:8px;">
          <h2 style="margin:0 0 8px;color:#065f46;font-size:20px;">Payment Status Updated</h2>
          <p style="color:#52525b;font-size:14px;line-height:1.6;margin:0 0 16px;">
            The status of your payment for <strong>${description}</strong> has been updated.
          </p>
          <div style="background:#fff;border:1px solid #e4e4e7;border-radius:8px;padding:16px 20px;margin:0 0 20px;">
            <table style="width:100%;font-size:13px;color:#3f3f46;">
              <tr><td style="padding:4px 0;color:#71717a;">Invoice ID</td><td style="padding:4px 0;font-family:monospace;font-weight:600;">${shortId}…</td></tr>
              <tr><td style="padding:4px 0;color:#71717a;">Amount</td><td style="padding:4px 0;font-weight:700;font-size:15px;color:#065f46;">${formattedAmount}</td></tr>
              <tr><td style="padding:4px 0;color:#71717a;">New Status</td><td style="padding:4px 0;"><span style="${color}padding:2px 8px;border-radius:99px;font-size:12px;font-weight:600;">${label}</span></td></tr>
              ${adminNote ? `<tr><td style="padding:4px 0;color:#71717a;vertical-align:top;">Note</td><td style="padding:4px 0;">${adminNote}</td></tr>` : ''}
            </table>
          </div>
          <p style="color:#a1a1aa;font-size:12px;margin:24px 0 0;">
            If you have questions, contact us at <a href="mailto:support@csediualumni.com" style="color:#059669;">support@csediualumni.com</a><br><br>
            CSE DIU Alumni Network
          </p>
        </div>
      `,
    });

    this.logger.log(
      `Payment status (${newStatus}) email sent to ${to} for invoice ${invoiceId}`,
    );
  }

  async sendNewsletter(
    to: string,
    subject: string,
    htmlBody: string,
  ): Promise<void> {
    const from = this.config.get<string>(
      'SMTP_FROM',
      'support@csediualumni.com',
    );
    const unsubToken = Buffer.from(to).toString('base64');
    const apiBase = this.config.get<string>(
      'API_URL',
      'https://csediualumni.com',
    );
    const unsubLink = `${apiBase}/newsletter/unsubscribe?token=${encodeURIComponent(unsubToken)}`;

    await this.transporter.sendMail({
      from: `"CSE DIU Alumni" <${from}>`,
      to,
      subject,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;">
          <div style="background:#1e3a5f;padding:20px 32px;">
            <h2 style="margin:0;color:#fff;font-size:18px;letter-spacing:.5px;">CSE DIU Alumni Network</h2>
          </div>
          <div style="padding:28px 32px;background:#fff;">
            ${htmlBody}
          </div>
          <div style="padding:16px 32px;background:#f4f4f5;border-top:1px solid #e4e4e7;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;">
              You're receiving this because you subscribed to the CSE DIU Alumni newsletter.
              <a href="${unsubLink}" style="color:#2563eb;">Unsubscribe</a>
            </p>
          </div>
        </div>
      `,
    });

    this.logger.log(`Newsletter email sent to ${to}`);
  }
}
