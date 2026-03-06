import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { InvoicePayment, PaymentStatus } from '../entities/invoice-payment.entity';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';

export interface CreateInvoiceDto {
  type?: Invoice['type'];
  description: string;
  campaignTitle?: string;
  totalAmount: number;
  userId?: string;
  donorName?: string;
  donorMessage?: string;
  isAnonymous?: boolean;
  metadata?: Record<string, unknown>;
}

export interface SubmitPaymentDto {
  amount: number;
  transactionId: string;
  /** omit / null for anonymous invoices */
  senderBkash?: string;
}

export interface UpdatePaymentStatusDto {
  status: PaymentStatus;
  adminNote?: string;
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoicePayment) private readonly paymentRepo: Repository<InvoicePayment>,
    private readonly mail: MailService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  // ── Email helpers ─────────────────────────────────────────────
  private async getUserEmail(userId: string | null): Promise<string | null> {
    if (!userId) return null;
    const user = await this.users.findById(userId);
    return user?.email ?? null;
  }

  private paymentUrl(invoiceId: string): string {
    const base = this.config.get<string>('FRONTEND_URL', 'http://localhost:4200');
    return `${base}/payment?invoiceId=${invoiceId}`;
  }

  private sendMailSafe(
    label: string,
    task: () => Promise<void>,
  ): void {
    task().catch((err: unknown) =>
      this.logger.error(`[EMAIL] Failed to send "${label}": ${err instanceof Error ? err.message : String(err)}`),
    );
  }

  // ── Helpers ──────────────────────────────────────────────────
  private withPayments(id: string) {
    return this.invoiceRepo.findOne({
      where: { id },
      relations: { payments: true },
      order: { payments: { createdAt: 'ASC' } },
    });
  }

  private recalcStatus(invoice: Invoice): InvoiceStatus {
    const verifiedTotal = invoice.payments
      .filter((p) => p.status === 'verified')
      .reduce((s, p) => s + p.amount, 0);
    if (verifiedTotal <= 0) return 'pending';
    if (verifiedTotal >= invoice.totalAmount) return 'paid';
    return 'partial';
  }

  // ── Public ───────────────────────────────────────────────────

  async create(dto: CreateInvoiceDto): Promise<Invoice> {
    this.logger.log(`[CREATE] type=${dto.type ?? 'donation'} amount=${dto.totalAmount} anonymous=${dto.isAnonymous ?? false} userId=${dto.userId ?? 'none'}`);

    if (dto.totalAmount <= 0) {
      this.logger.warn(`[CREATE] Rejected – totalAmount must be positive (got ${dto.totalAmount})`);
      throw new BadRequestException('totalAmount must be positive');
    }

    const inv = this.invoiceRepo.create({
      type: dto.type ?? 'donation',
      description: dto.description,
      campaignTitle: dto.campaignTitle ?? null,
      totalAmount: dto.totalAmount,
      userId: dto.isAnonymous ? null : (dto.userId ?? null),
      donorName: dto.isAnonymous ? null : (dto.donorName ?? null),
      donorMessage: dto.isAnonymous ? null : (dto.donorMessage ?? null),
      isAnonymous: dto.isAnonymous ?? false,
      metadata: dto.metadata ?? null,
      status: 'pending',
    });
    const saved = await this.invoiceRepo.save(inv);
    this.logger.log(`[CREATE] Invoice saved id=${saved.id}`);

    if (!saved.isAnonymous && saved.userId) {
      this.logger.log(`[EMAIL] Queuing "invoice created" email for userId=${saved.userId} invoiceId=${saved.id}`);
      this.sendMailSafe(`invoice-created invoiceId=${saved.id}`, async () => {
        const email = await this.getUserEmail(saved.userId);
        if (!email) {
          this.logger.warn(`[EMAIL] No email found for userId=${saved.userId} – skipping invoice created email`);
          return;
        }
        this.logger.log(`[EMAIL] Sending "invoice created" to ${email} invoiceId=${saved.id}`);
        await this.mail.sendInvoiceCreated(email, saved.id, saved.description, saved.totalAmount, this.paymentUrl(saved.id));
        this.logger.log(`[EMAIL] "invoice created" sent successfully to ${email}`);
      });
    } else {
      this.logger.log(`[EMAIL] Skipping "invoice created" email – anonymous=${saved.isAnonymous} userId=${saved.userId ?? 'none'}`);
    }

    return saved;
  }

  async findById(id: string): Promise<Invoice> {
    this.logger.debug(`[FIND] invoiceId=${id}`);
    const inv = await this.withPayments(id);
    if (!inv) {
      this.logger.warn(`[FIND] Invoice not found id=${id}`);
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    return inv;
  }

  async submitPayment(invoiceId: string, dto: SubmitPaymentDto): Promise<Invoice> {
    this.logger.log(`[PAYMENT SUBMIT] invoiceId=${invoiceId} amount=${dto.amount} txId=${dto.transactionId}`);
    const inv = await this.findById(invoiceId);

    if (inv.status === 'cancelled') {
      this.logger.warn(`[PAYMENT SUBMIT] Rejected – invoice ${invoiceId} is cancelled`);
      throw new BadRequestException('Cannot pay a cancelled invoice');
    }

    if (dto.amount <= 0) {
      this.logger.warn(`[PAYMENT SUBMIT] Rejected – amount must be positive (got ${dto.amount})`);
      throw new BadRequestException('Payment amount must be positive');
    }

    const dup = await this.paymentRepo.findOne({
      where: { invoiceId, transactionId: dto.transactionId },
    });
    if (dup) {
      this.logger.warn(`[PAYMENT SUBMIT] Rejected – duplicate transactionId=${dto.transactionId} for invoiceId=${invoiceId}`);
      throw new BadRequestException('This transaction ID has already been submitted for this invoice');
    }

    const payment = this.paymentRepo.create({
      invoiceId,
      amount: dto.amount,
      transactionId: dto.transactionId,
      senderBkash: inv.isAnonymous ? null : (dto.senderBkash ?? null),
      status: 'pending',
    });
    await this.paymentRepo.save(payment);
    this.logger.log(`[PAYMENT SUBMIT] Payment saved paymentId=${payment.id} invoiceId=${invoiceId}`);

    const updated = await this.findById(invoiceId);

    if (!inv.isAnonymous && inv.userId) {
      this.logger.log(`[EMAIL] Queuing "payment submitted" email for userId=${inv.userId} invoiceId=${invoiceId}`);
      this.sendMailSafe(`payment-submitted invoiceId=${invoiceId}`, async () => {
        const email = await this.getUserEmail(inv.userId);
        if (!email) {
          this.logger.warn(`[EMAIL] No email found for userId=${inv.userId} – skipping payment submitted email`);
          return;
        }
        this.logger.log(`[EMAIL] Sending "payment submitted" to ${email} invoiceId=${invoiceId} txId=${dto.transactionId}`);
        await this.mail.sendPaymentSubmitted(email, invoiceId, inv.description, dto.amount, dto.transactionId);
        this.logger.log(`[EMAIL] "payment submitted" sent successfully to ${email}`);
      });
    } else {
      this.logger.log(`[EMAIL] Skipping "payment submitted" email – anonymous=${inv.isAnonymous} userId=${inv.userId ?? 'none'}`);
    }

    return updated;
  }

  // ── Admin ────────────────────────────────────────────────────

  findAll(page = 1, limit = 20) {
    this.logger.debug(`[LIST] page=${page} limit=${limit}`);
    return this.invoiceRepo.find({
      relations: { payments: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  count() {
    return this.invoiceRepo.count();
  }

  async updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    this.logger.log(`[STATUS UPDATE] invoiceId=${id} newStatus=${status}`);
    const inv = await this.findById(id);
    const prev = inv.status;
    inv.status = status;
    await this.invoiceRepo.save(inv);
    this.logger.log(`[STATUS UPDATE] invoiceId=${id} ${prev} -> ${status}`);
    return this.findById(id);
  }

  async updatePaymentStatus(
    invoiceId: string,
    paymentId: string,
    dto: UpdatePaymentStatusDto,
  ): Promise<Invoice> {
    this.logger.log(`[PAYMENT STATUS] invoiceId=${invoiceId} paymentId=${paymentId} newStatus=${dto.status}`);

    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId, invoiceId },
    });
    if (!payment) {
      this.logger.warn(`[PAYMENT STATUS] Payment not found paymentId=${paymentId} invoiceId=${invoiceId}`);
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    const prevStatus = payment.status;
    payment.status = dto.status;
    if (dto.adminNote !== undefined) payment.adminNote = dto.adminNote;
    await this.paymentRepo.save(payment);
    this.logger.log(`[PAYMENT STATUS] paymentId=${paymentId} ${prevStatus} -> ${dto.status}${dto.adminNote ? ` note="${dto.adminNote}"` : ''}`);

    const inv = await this.findById(invoiceId);
    if (inv.status !== 'cancelled') {
      const recalc = this.recalcStatus(inv);
      if (recalc !== inv.status) {
        this.logger.log(`[STATUS RECALC] invoiceId=${invoiceId} ${inv.status} -> ${recalc}`);
        inv.status = recalc;
        await this.invoiceRepo.save(inv);
      }
    }

    const result = await this.findById(invoiceId);

    if (!inv.isAnonymous && inv.userId) {
      this.logger.log(`[EMAIL] Queuing "payment status updated" email for userId=${inv.userId} invoiceId=${invoiceId} status=${dto.status}`);
      this.sendMailSafe(`payment-status-updated invoiceId=${invoiceId} status=${dto.status}`, async () => {
        const email = await this.getUserEmail(inv.userId);
        if (!email) {
          this.logger.warn(`[EMAIL] No email found for userId=${inv.userId} – skipping payment status email`);
          return;
        }
        this.logger.log(`[EMAIL] Sending "payment status updated" (${dto.status}) to ${email} invoiceId=${invoiceId}`);
        await this.mail.sendPaymentStatusUpdated(email, invoiceId, inv.description, payment.amount, dto.status, dto.adminNote);
        this.logger.log(`[EMAIL] "payment status updated" sent successfully to ${email}`);
      });
    } else {
      this.logger.log(`[EMAIL] Skipping "payment status updated" email – anonymous=${inv.isAnonymous} userId=${inv.userId ?? 'none'}`);
    }

    return result;
  }

  async refundPayment(invoiceId: string, paymentId: string, adminNote?: string): Promise<Invoice> {
    this.logger.log(`[REFUND] invoiceId=${invoiceId} paymentId=${paymentId}`);
    return this.updatePaymentStatus(invoiceId, paymentId, {
      status: 'refunded',
      adminNote: adminNote ?? 'Refunded by admin',
    });
  }
}
