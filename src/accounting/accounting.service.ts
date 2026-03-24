import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AccountCategory } from '../entities/account-category.entity';
import { AccountTransaction } from '../entities/account-transaction.entity';
import { AuditReport } from '../entities/audit-report.entity';
import { InvoicePayment } from '../entities/invoice-payment.entity';
import { Invoice } from '../entities/invoice.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateAuditReportDto } from './dto/create-audit-report.dto';
import { AutoImportDto } from './dto/auto-import.dto';

@Injectable()
export class AccountingService {
  constructor(
    @InjectRepository(AccountCategory)
    private readonly categoryRepo: Repository<AccountCategory>,
    @InjectRepository(AccountTransaction)
    private readonly transactionRepo: Repository<AccountTransaction>,
    @InjectRepository(AuditReport)
    private readonly reportRepo: Repository<AuditReport>,
    @InjectRepository(InvoicePayment)
    private readonly paymentRepo: Repository<InvoicePayment>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
  ) {}

  // ── Categories ────────────────────────────────────────────────

  findAllCategories(): Promise<AccountCategory[]> {
    return this.categoryRepo.find({ order: { type: 'ASC', name: 'ASC' } });
  }

  async createCategory(dto: CreateCategoryDto): Promise<AccountCategory> {
    const existing = await this.categoryRepo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('A category with this name already exists');
    const cat = this.categoryRepo.create({ name: dto.name, type: dto.type ?? 'both' });
    return this.categoryRepo.save(cat);
  }

  async updateCategory(id: string, dto: CreateCategoryDto): Promise<AccountCategory> {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    if (dto.name && dto.name !== cat.name) {
      const conflict = await this.categoryRepo.findOne({ where: { name: dto.name } });
      if (conflict) throw new ConflictException('A category with this name already exists');
    }
    Object.assign(cat, dto);
    return this.categoryRepo.save(cat);
  }

  async removeCategory(id: string): Promise<void> {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    if (cat.isSystem) throw new BadRequestException('System categories cannot be deleted');
    const usageCount = await this.transactionRepo.count({ where: { categoryId: id } });
    if (usageCount > 0)
      throw new BadRequestException('Category is in use and cannot be deleted');
    await this.categoryRepo.remove(cat);
  }

  // ── Transactions ──────────────────────────────────────────────

  async findAllTransactions(filters: {
    type?: string;
    categoryId?: string;
    month?: number;
    year?: number;
    page?: number;
    limit?: number;
  }): Promise<{ data: AccountTransaction[]; total: number }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(200, filters.limit ?? 50);

    const qb = this.transactionRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'cat')
      .orderBy('t.date', 'DESC')
      .addOrderBy('t.createdAt', 'DESC');

    if (filters.type) qb.andWhere('t.type = :type', { type: filters.type });
    if (filters.categoryId) qb.andWhere('t.categoryId = :catId', { catId: filters.categoryId });

    if (filters.year && filters.month) {
      const monthStr = String(filters.month).padStart(2, '0');
      const from = `${filters.year}-${monthStr}-01`;
      // Last day of month
      const lastDay = new Date(filters.year, filters.month, 0).getDate();
      const to = `${filters.year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
      qb.andWhere('t.date BETWEEN :from AND :to', { from, to });
    } else if (filters.year) {
      qb.andWhere('t.date >= :from AND t.date < :to', {
        from: `${filters.year}-01-01`,
        to: `${filters.year + 1}-01-01`,
      });
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findOneTransaction(id: string): Promise<AccountTransaction> {
    const t = await this.transactionRepo.findOne({
      where: { id },
      relations: { category: true },
    });
    if (!t) throw new NotFoundException('Transaction not found');
    return t;
  }

  async createTransaction(dto: CreateTransactionDto, userId: string): Promise<AccountTransaction> {
    const cat = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
    if (!cat) throw new NotFoundException('Category not found');

    const tx = this.transactionRepo.create({
      ...dto,
      referenceType: dto.referenceType ?? 'manual',
      createdById: userId,
    });
    return this.transactionRepo.save(tx);
  }

  async updateTransaction(
    id: string,
    dto: Partial<CreateTransactionDto>,
  ): Promise<AccountTransaction> {
    const tx = await this.findOneTransaction(id);
    if (tx.referenceType === 'invoice_payment') {
      // Only allow updating description and receiptUrl on auto-imported entries
      const allowed: Partial<AccountTransaction> = {};
      if (dto.description !== undefined) allowed.description = dto.description;
      if (dto.receiptUrl !== undefined) allowed.receiptUrl = dto.receiptUrl;
      Object.assign(tx, allowed);
    } else {
      if (dto.categoryId) {
        const cat = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
        if (!cat) throw new NotFoundException('Category not found');
      }
      Object.assign(tx, dto);
    }
    return this.transactionRepo.save(tx);
  }

  async removeTransaction(id: string): Promise<void> {
    const tx = await this.findOneTransaction(id);
    await this.transactionRepo.remove(tx);
  }

  /**
   * Import all verified InvoicePayments in a given month/year that haven't
   * been imported yet. Returns the number of newly created transactions.
   */
  async autoImportPayments(dto: AutoImportDto, userId: string): Promise<{ imported: number }> {
    const monthStr = String(dto.month).padStart(2, '0');
    const lastDay = new Date(dto.year, dto.month, 0).getDate();
    const from = new Date(`${dto.year}-${monthStr}-01T00:00:00.000Z`);
    const to = new Date(`${dto.year}-${monthStr}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`);

    const payments = await this.paymentRepo.find({
      where: { status: 'verified', createdAt: Between(from, to) },
      relations: { invoice: true },
    });

    // Find already-imported referenceIds
    const existingRefs = new Set<string>();
    if (payments.length > 0) {
      const existing = await this.transactionRepo.find({
        where: payments.map((p) => ({ referenceId: p.id })),
        select: ['referenceId'],
      });
      existing.forEach((e) => e.referenceId && existingRefs.add(e.referenceId));
    }

    const toImport = payments.filter((p) => !existingRefs.has(p.id));
    if (toImport.length === 0) return { imported: 0 };

    // Determine default income category (Donations/Fundraising → fallback to first income cat)
    let defaultCat = await this.categoryRepo.findOne({
      where: { name: 'Donations / Fundraising' },
    });
    if (!defaultCat) {
      defaultCat = await this.categoryRepo.findOne({ where: { type: 'income' } });
    }
    if (!defaultCat) {
      defaultCat = await this.categoryRepo.findOne({ where: { type: 'both' } });
    }
    if (!defaultCat) {
      throw new BadRequestException('No income category found. Please create one first.');
    }

    const transactions = toImport.map((p) => {
      const paymentDate = new Date(p.createdAt);
      const dateStr = `${paymentDate.getUTCFullYear()}-${String(paymentDate.getUTCMonth() + 1).padStart(2, '0')}-${String(paymentDate.getUTCDate()).padStart(2, '0')}`;
      const invoiceType = p.invoice?.type ?? 'other';
      let catOverride = defaultCat!;
      // Auto-assign category based on invoice type
      if (invoiceType === 'membership') {
        // Will be assigned below if found, else default
      }

      return this.transactionRepo.create({
        type: 'income',
        amount: p.amount,
        categoryId: catOverride.id,
        description: `Invoice payment – ${p.invoice?.description ?? p.invoiceId} (txn: ${p.transactionId})`,
        date: dateStr,
        referenceId: p.id,
        referenceType: 'invoice_payment',
        createdById: userId,
      });
    });

    // For membership invoices, try to find the Membership Fees category
    const membershipCat = await this.categoryRepo.findOne({ where: { name: 'Membership Fees' } });
    const eventCat = await this.categoryRepo.findOne({ where: { name: 'Event Ticket Sales' } });

    for (let i = 0; i < toImport.length; i++) {
      const invoiceType = toImport[i].invoice?.type;
      if (invoiceType === 'membership' && membershipCat) {
        transactions[i].categoryId = membershipCat.id;
      } else if (invoiceType === 'event' && eventCat) {
        transactions[i].categoryId = eventCat.id;
      }
    }

    await this.transactionRepo.save(transactions);
    return { imported: transactions.length };
  }

  async getSummary(
    month: number,
    year: number,
  ): Promise<{
    totalIncome: number;
    totalExpense: number;
    breakdown: { categoryId: string; name: string; type: string; amount: number }[];
  }> {
    const monthStr = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    const from = `${year}-${monthStr}-01`;
    const to = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

    const rows = await this.transactionRepo
      .createQueryBuilder('t')
      .select('t.type', 'type')
      .addSelect('t.categoryId', 'categoryId')
      .addSelect('cat.name', 'name')
      .addSelect('cat.type', 'catType')
      .addSelect('SUM(t.amount)', 'total')
      .innerJoin('t.category', 'cat')
      .where('t.date BETWEEN :from AND :to', { from, to })
      .groupBy('t.type')
      .addGroupBy('t.categoryId')
      .addGroupBy('cat.name')
      .addGroupBy('cat.type')
      .getRawMany();

    let totalIncome = 0;
    let totalExpense = 0;
    const breakdown = rows.map((r) => {
      const amount = parseInt(r.total, 10);
      if (r.type === 'income') totalIncome += amount;
      else totalExpense += amount;
      return { categoryId: r.categoryId, name: r.name, type: r.type, amount };
    });

    return { totalIncome, totalExpense, breakdown };
  }

  // ── Audit Reports ─────────────────────────────────────────────

  findAllReports(): Promise<AuditReport[]> {
    return this.reportRepo.find({ order: { year: 'DESC', month: 'DESC' } });
  }

  findPublishedReports(): Promise<AuditReport[]> {
    return this.reportRepo.find({
      where: { isPublished: true },
      order: { year: 'DESC', month: 'DESC' },
    });
  }

  async findOneReport(id: string): Promise<AuditReport> {
    const r = await this.reportRepo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Audit report not found');
    return r;
  }

  async createReport(dto: CreateAuditReportDto, userId: string): Promise<AuditReport> {
    const existing = await this.reportRepo.findOne({
      where: { month: dto.month, year: dto.year },
    });
    if (existing) throw new ConflictException('A report for this month/year already exists');

    const summary = await this.getSummary(dto.month, dto.year);
    const closing = dto.openingBalance + summary.totalIncome - summary.totalExpense;

    const report = this.reportRepo.create({
      month: dto.month,
      year: dto.year,
      openingBalance: dto.openingBalance,
      totalIncome: summary.totalIncome,
      totalExpense: summary.totalExpense,
      closingBalance: closing,
      summary: dto.summary ?? null,
      isPublished: false,
      createdById: userId,
    });
    return this.reportRepo.save(report);
  }

  async publishReport(id: string): Promise<AuditReport> {
    const report = await this.findOneReport(id);
    // Refresh totals at publish time
    const summary = await this.getSummary(report.month, report.year);
    report.totalIncome = summary.totalIncome;
    report.totalExpense = summary.totalExpense;
    report.closingBalance = report.openingBalance + summary.totalIncome - summary.totalExpense;
    report.isPublished = true;
    report.publishedAt = new Date();
    return this.reportRepo.save(report);
  }

  async unpublishReport(id: string): Promise<AuditReport> {
    const report = await this.findOneReport(id);
    report.isPublished = false;
    report.publishedAt = null;
    return this.reportRepo.save(report);
  }

  async deleteReport(id: string): Promise<void> {
    const report = await this.findOneReport(id);
    await this.reportRepo.remove(report);
  }

  async getReportData(id: string): Promise<{
    report: AuditReport;
    incomeTransactions: AccountTransaction[];
    expenseTransactions: AccountTransaction[];
    breakdown: { categoryId: string; name: string; type: string; amount: number }[];
  }> {
    const report = await this.findOneReport(id);
    const { breakdown } = await this.getSummary(report.month, report.year);

    const monthStr = String(report.month).padStart(2, '0');
    const lastDay = new Date(report.year, report.month, 0).getDate();
    const from = `${report.year}-${monthStr}-01`;
    const to = `${report.year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

    const [incomeTransactions, expenseTransactions] = await Promise.all([
      this.transactionRepo
        .createQueryBuilder('t')
        .leftJoinAndSelect('t.category', 'cat')
        .where('t.date BETWEEN :from AND :to', { from, to })
        .andWhere('t.type = :type', { type: 'income' })
        .orderBy('t.date', 'ASC')
        .getMany(),
      this.transactionRepo
        .createQueryBuilder('t')
        .leftJoinAndSelect('t.category', 'cat')
        .where('t.date BETWEEN :from AND :to', { from, to })
        .andWhere('t.type = :type', { type: 'expense' })
        .orderBy('t.date', 'ASC')
        .getMany(),
    ]);

    return { report, incomeTransactions, expenseTransactions, breakdown };
  }
}
