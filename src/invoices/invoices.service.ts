import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { InvoicePayment, PaymentStatus } from '../entities/invoice-payment.entity';

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
  constructor(
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoicePayment) private readonly paymentRepo: Repository<InvoicePayment>,
  ) {}

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
    if (dto.totalAmount <= 0) {
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
    return this.invoiceRepo.save(inv);
  }

  async findById(id: string): Promise<Invoice> {
    const inv = await this.withPayments(id);
    if (!inv) throw new NotFoundException(`Invoice ${id} not found`);
    return inv;
  }

  async submitPayment(invoiceId: string, dto: SubmitPaymentDto): Promise<Invoice> {
    const inv = await this.findById(invoiceId);

    if (inv.status === 'cancelled') {
      throw new BadRequestException('Cannot pay a cancelled invoice');
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be positive');
    }

    // Check duplicate transaction ID on this invoice
    const dup = await this.paymentRepo.findOne({
      where: { invoiceId, transactionId: dto.transactionId },
    });
    if (dup) {
      throw new BadRequestException('This transaction ID has already been submitted for this invoice');
    }

    // Anonymous invoices must not include senderBkash
    const payment = this.paymentRepo.create({
      invoiceId,
      amount: dto.amount,
      transactionId: dto.transactionId,
      senderBkash: inv.isAnonymous ? null : (dto.senderBkash ?? null),
      status: 'pending',
    });
    await this.paymentRepo.save(payment);
    return this.findById(invoiceId);
  }

  // ── Admin ────────────────────────────────────────────────────

  findAll(page = 1, limit = 20) {
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
    const inv = await this.findById(id);
    inv.status = status;
    await this.invoiceRepo.save(inv);
    return this.findById(id);
  }

  async updatePaymentStatus(
    invoiceId: string,
    paymentId: string,
    dto: UpdatePaymentStatusDto,
  ): Promise<Invoice> {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId, invoiceId },
    });
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);

    payment.status = dto.status;
    if (dto.adminNote !== undefined) payment.adminNote = dto.adminNote;
    await this.paymentRepo.save(payment);

    // Auto-recalculate invoice status based on verified payments
    const inv = await this.findById(invoiceId);
    if (inv.status !== 'cancelled') {
      inv.status = this.recalcStatus(inv);
      await this.invoiceRepo.save(inv);
    }

    return this.findById(invoiceId);
  }

  async refundPayment(invoiceId: string, paymentId: string, adminNote?: string): Promise<Invoice> {
    return this.updatePaymentStatus(invoiceId, paymentId, {
      status: 'refunded',
      adminNote: adminNote ?? 'Refunded by admin',
    });
  }
}
