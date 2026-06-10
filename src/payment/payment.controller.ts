import {
  Controller,
  Post,
  Param,
  Body,
  Query,
  Res,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { Invoice } from '../entities/invoice.entity';
import { EventRegistration } from '../entities/event-registration.entity';
import { SslCommerzService } from './sslcommerz.service';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';

@Controller()
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(EventRegistration)
    private readonly registrationRepo: Repository<EventRegistration>,
    private readonly sslcz: SslCommerzService,
    private readonly mail: MailService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  private frontendUrl(path: string): string {
    const base = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:4200',
    );
    return `${base}${path}`;
  }

  private sendMailSafe(label: string, task: () => Promise<void>): void {
    task().catch((err: unknown) =>
      this.logger.error(
        `[EMAIL] Failed to send "${label}": ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
  }

  /** POST /invoices/:id/sslcommerz/init — initiates payment session */
  @Post('invoices/:id/sslcommerz/init')
  async initPayment(
    @Param('id') invoiceId: string,
  ): Promise<{ gatewayUrl: string }> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'paid')
      throw new BadRequestException('Invoice is already paid');
    if (invoice.status === 'cancelled')
      throw new BadRequestException('Invoice is cancelled');

    let customerName = invoice.donorName ?? 'Guest';
    let customerEmail = 'noreply@csediualumni.com';
    if (!invoice.isAnonymous && invoice.userId) {
      const user = await this.users.findById(invoice.userId);
      if (user) {
        customerName = user.displayName ?? customerName;
        customerEmail = user.email;
      }
    }

    const tranId = `INV-${invoiceId.slice(0, 8).toUpperCase()}-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Store transactionId on invoice so we can find it on callback
    invoice.transactionId = tranId;
    invoice.gateway = 'sslcommerz';
    await this.invoiceRepo.save(invoice);
    this.logger.log(`[INIT] Invoice id=${invoiceId} tran_id=${tranId}`);

    const result = await this.sslcz.initPayment({
      tranId,
      amount: invoice.totalAmount,
      invoiceId,
      customerName,
      customerEmail,
      customerPhone: '01700000000',
    });

    return { gatewayUrl: result.gatewayUrl };
  }

  /** POST /invoices/sslcommerz/ipn — IPN webhook from SSL Commerz */
  @Post('invoices/sslcommerz/ipn')
  async handleIpn(
    @Body() body: Record<string, string>,
  ): Promise<{ received: true }> {
    const valId = body['val_id'];
    const tranId = body['tran_id'];
    const status = body['status'];

    this.logger.log(
      `[IPN] Received status=${status} tran_id=${tranId} val_id=${valId}`,
    );

    if (status !== 'VALID' && status !== 'VALIDATED') {
      this.logger.warn(`[IPN] Non-successful status=${status}, ignoring`);
      return { received: true };
    }

    const validated = await this.sslcz.validatePayment(valId);
    if (!validated.valid) {
      this.logger.warn(`[IPN] Validation failed for val_id=${valId}`);
      return { received: true };
    }

    await this.markPaid(validated.tranId, valId);
    return { received: true };
  }

  /** POST /invoices/sslcommerz/success — browser redirect after successful payment */
  @Post('invoices/sslcommerz/success')
  async handleSuccess(
    @Query('invoiceId') invoiceId: string,
    @Body('val_id') valId: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`[SUCCESS] invoiceId=${invoiceId} val_id=${valId}`);

    if (valId) {
      try {
        const validated = await this.sslcz.validatePayment(valId);
        if (validated.valid) {
          await this.markPaid(validated.tranId, valId);
        }
      } catch (err) {
        this.logger.warn(
          `[SUCCESS] Validation attempt failed (IPN may handle it): ${String(err)}`,
        );
      }
    }

    res.redirect(this.frontendUrl(`/payment/success?invoiceId=${invoiceId}`));
  }

  /** POST /invoices/sslcommerz/fail — browser redirect on failure/cancel */
  @Post('invoices/sslcommerz/fail')
  async handleFail(
    @Query('invoiceId') invoiceId: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`[FAIL] invoiceId=${invoiceId}`);
    res.redirect(this.frontendUrl(`/payment/fail?invoiceId=${invoiceId}`));
  }

  /** Mark invoice as paid, confirm event registration if applicable */
  private async markPaid(tranId: string, valId: string): Promise<void> {
    const invoice = await this.invoiceRepo.findOne({
      where: { transactionId: tranId },
    });

    if (!invoice) {
      this.logger.warn(`[MARK_PAID] No invoice found for tran_id=${tranId}`);
      return;
    }

    if (invoice.status === 'paid') {
      this.logger.log(
        `[MARK_PAID] Invoice id=${invoice.id} already paid, skipping`,
      );
      return;
    }

    invoice.status = 'paid';
    invoice.valId = valId;
    invoice.paidAt = new Date();
    await this.invoiceRepo.save(invoice);
    this.logger.log(`[MARK_PAID] Invoice id=${invoice.id} marked paid`);

    // Auto-confirm event registration
    if (invoice.type === 'event') {
      const reg = await this.registrationRepo.findOne({
        where: { invoiceId: invoice.id },
      });
      if (reg && reg.status === 'pending_payment') {
        reg.status = 'confirmed';
        await this.registrationRepo.save(reg);
        this.logger.log(
          `[MARK_PAID] Event registration id=${reg.id} auto-confirmed`,
        );
      }
    }

    // Send confirmation email
    if (!invoice.isAnonymous && invoice.userId) {
      this.sendMailSafe(
        `payment-verified invoiceId=${invoice.id}`,
        async () => {
          const user = await this.users.findById(invoice.userId!);
          if (!user?.email) return;
          await this.mail.sendPaymentStatusUpdated(
            user.email,
            invoice.id,
            invoice.description,
            invoice.totalAmount,
            'verified',
          );
        },
      );
    }
  }
}
