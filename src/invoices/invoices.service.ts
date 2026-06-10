import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
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

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    private readonly mail: MailService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  private async getUserEmail(userId: string | null): Promise<string | null> {
    if (!userId) return null;
    const user = await this.users.findById(userId);
    return user?.email ?? null;
  }

  private paymentUrl(invoiceId: string): string {
    const base = this.config.get<string>('FRONTEND_URL', 'http://localhost:4200');
    return `${base}/payment?invoiceId=${invoiceId}`;
  }

  private sendMailSafe(label: string, task: () => Promise<void>): void {
    task().catch((err: unknown) =>
      this.logger.error(`[EMAIL] Failed to send "${label}": ${err instanceof Error ? err.message : String(err)}`),
    );
  }

  async create(dto: CreateInvoiceDto): Promise<Invoice> {
    this.logger.log(`[CREATE] type=${dto.type ?? 'donation'} amount=${dto.totalAmount}`);

    if (dto.totalAmount <= 0) throw new BadRequestException('totalAmount must be positive');

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

    if (!saved.isAnonymous && saved.userId) {
      this.sendMailSafe(`invoice-created invoiceId=${saved.id}`, async () => {
        const email = await this.getUserEmail(saved.userId);
        if (!email) return;
        await this.mail.sendInvoiceCreated(email, saved.id, saved.description, saved.totalAmount, this.paymentUrl(saved.id));
      });
    }
    return saved;
  }

  async findById(id: string): Promise<Invoice> {
    const inv = await this.invoiceRepo.findOne({ where: { id } });
    if (!inv) throw new NotFoundException(`Invoice ${id} not found`);
    return inv;
  }

  async getRecentDonors(limit = 8): Promise<{
    donorName: string | null; isAnonymous: boolean; totalAmount: number;
    campaignTitle: string | null; createdAt: Date; metadata: Record<string, unknown> | null;
  }[]> {
    const invoices = await this.invoiceRepo.find({
      where: { type: 'donation', status: 'paid' },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return invoices.map((inv) => ({
      donorName: inv.isAnonymous ? null : inv.donorName,
      isAnonymous: inv.isAnonymous,
      totalAmount: inv.totalAmount,
      campaignTitle: inv.campaignTitle,
      createdAt: inv.createdAt,
      metadata: inv.metadata,
    }));
  }

  findMyInvoices(userId: string): Promise<Invoice[]> {
    return this.invoiceRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  findAll(page = 1, limit = 20) {
    return this.invoiceRepo.find({
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

  async updateAdminNote(id: string, note: string): Promise<Invoice> {
    const inv = await this.findById(id);
    inv.adminNote = note;
    await this.invoiceRepo.save(inv);
    return inv;
  }
}
