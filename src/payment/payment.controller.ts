import {
  Controller,
  Post,
  Get,
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
import { InvoicePayment } from '../entities/invoice-payment.entity';
import { SslCommerzService } from './sslcommerz.service';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';

@Controller()
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoicePayment)
    private readonly paymentRepo: Repository<InvoicePayment>,
    private readonly sslcz: SslCommerzService,
    private readonly mail: MailService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  private frontendUrl(path: string): string {
    const base = this.config.get<string>('FRONTEND_URL', 'http://localhost:4200');
    return `${base}${path}`;
  }

  private sendMailSafe(label: string, task: () => Promise<void>): void {
    task().catch((err: unknown) =>
      this.logger.error(
        `[EMAIL] Failed to send "${label}": ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
  }

  private dueAmount(invoice: Invoice): number {
    const paid = invoice.payments
      .filter((p) => p.status === 'verified')
      .reduce((s, p) => s + p.amount, 0);
    return Math.max(0, invoice.totalAmount - paid);
  }

  private recalcStatus(invoice: Invoice): Invoice['status'] {
    const verifiedTotal = invoice.payments
      .filter((p) => p.status === 'verified')
      .reduce((s, p) => s + p.amount, 0);
    if (verifiedTotal <= 0) return 'pending';
    if (verifiedTotal >= invoice.totalAmount) return 'paid';
    return 'partial';
  }

  /** POST /invoices/:id/sslcommerz/init — initiates payment session */
  @Post('invoices/:id/sslcommerz/init')
  async initPayment(@Param('id') invoiceId: string): Promise<{ gatewayUrl: string }> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
      relations: { payments: true },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'paid') throw new BadRequestException('Invoice is already paid');
    if (invoice.status === 'cancelled') throw new BadRequestException('Invoice is cancelled');

    const due = this.dueAmount(invoice);
    if (due <= 0) throw new BadRequestException('Nothing due on this invoice');

    // Resolve customer info
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

    // Create a pending payment record before redirecting
    const payment = this.paymentRepo.create({
      invoiceId,
      amount: due,
      transactionId: tranId,
      gateway: 'sslcommerz',
      valId: null,
      status: 'pending',
    });
    await this.paymentRepo.save(payment);
    this.logger.log(`[INIT] Created pending payment id=${payment.id} tran_id=${tranId}`);

    const result = await this.sslcz.initPayment({
      tranId,
      amount: due,
      invoiceId,
      customerName,
      customerEmail,
      customerPhone: '01700000000',
    });

    return { gatewayUrl: result.gatewayUrl };
  }

  /** POST /invoices/sslcommerz/ipn — IPN webhook from SSL Commerz */
  @Post('invoices/sslcommerz/ipn')
  async handleIpn(@Body() body: Record<string, string>): Promise<{ received: true }> {
    const valId = body['val_id'];
    const tranId = body['tran_id'];
    const status = body['status'];

    this.logger.log(`[IPN] Received status=${status} tran_id=${tranId} val_id=${valId}`);

    if (status !== 'VALID' && status !== 'VALIDATED') {
      this.logger.warn(`[IPN] Non-successful status=${status}, ignoring`);
      return { received: true };
    }

    const validated = await this.sslcz.validatePayment(valId);
    if (!validated.valid) {
      this.logger.warn(`[IPN] Validation failed for val_id=${valId} status=${validated.status}`);
      return { received: true };
    }

    await this.markPaymentVerified(validated.tranId, valId);
    return { received: true };
  }

  /** GET /invoices/sslcommerz/success — browser redirect after successful payment */
  @Get('invoices/sslcommerz/success')
  async handleSuccess(
    @Query('invoiceId') invoiceId: string,
    @Query('val_id') valId: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`[SUCCESS] invoiceId=${invoiceId} val_id=${valId}`);

    if (valId) {
      try {
        const validated = await this.sslcz.validatePayment(valId);
        if (validated.valid) {
          await this.markPaymentVerified(validated.tranId, valId);
        }
      } catch (err) {
        this.logger.warn(`[SUCCESS] Validation attempt failed (IPN may have handled it): ${String(err)}`);
      }
    }

    res.redirect(this.frontendUrl(`/payment/success?invoiceId=${invoiceId}`));
  }

  /** GET /invoices/sslcommerz/fail — browser redirect on failure/cancel */
  @Get('invoices/sslcommerz/fail')
  async handleFail(
    @Query('invoiceId') invoiceId: string,
    @Query('tranId') tranId: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`[FAIL] invoiceId=${invoiceId} tranId=${tranId}`);

    if (tranId) {
      const payment = await this.paymentRepo.findOne({
        where: { transactionId: tranId, status: 'pending' },
      });
      if (payment) {
        payment.status = 'rejected';
        await this.paymentRepo.save(payment);
        this.logger.log(`[FAIL] Marked payment id=${payment.id} as rejected`);
      }
    }

    res.redirect(this.frontendUrl(`/payment/fail?invoiceId=${invoiceId}`));
  }

  /** Shared: validate + mark payment verified, recalculate invoice status, send email */
  private async markPaymentVerified(tranId: string, valId: string): Promise<void> {
    const payment = await this.paymentRepo.findOne({
      where: { transactionId: tranId },
      relations: { invoice: { payments: true } },
    });

    if (!payment) {
      this.logger.warn(`[VERIFY] No payment found for tran_id=${tranId}`);
      return;
    }

    if (payment.status === 'verified') {
      this.logger.log(`[VERIFY] Payment id=${payment.id} already verified, skipping`);
      return;
    }

    payment.status = 'verified';
    payment.valId = valId;
    await this.paymentRepo.save(payment);
    this.logger.log(`[VERIFY] Payment id=${payment.id} marked verified`);

    // Recalculate invoice status
    const invoice = payment.invoice;
    const newStatus = this.recalcStatus(invoice);
    if (invoice.status !== newStatus) {
      invoice.status = newStatus;
      await this.invoiceRepo.save(invoice);
      this.logger.log(`[VERIFY] Invoice id=${invoice.id} status updated to ${newStatus}`);
    }

    // Send confirmation email
    if (!invoice.isAnonymous && invoice.userId) {
      this.sendMailSafe(`payment-verified invoiceId=${invoice.id}`, async () => {
        const user = await this.users.findById(invoice.userId!);
        if (!user?.email) return;
        await this.mail.sendPaymentStatusUpdated(
          user.email,
          invoice.id,
          invoice.description,
          payment.amount,
          'verified',
        );
      });
    }
  }
}
