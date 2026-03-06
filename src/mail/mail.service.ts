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
}
