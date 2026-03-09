import { v4 as uuidv4 } from 'uuid';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  MembershipApplication,
  MembershipApplicationStatus,
} from '../entities/membership-application.entity';
import { Invoice } from '../entities/invoice.entity';
import { InvoicePayment } from '../entities/invoice-payment.entity';
import { UserRole } from '../entities/user-role.entity';
import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';

export interface MembershipApplicationDto {
  id: string;
  userId: string;
  invoiceId: string | null;
  /** Effective status — may differ from stored status when payment is detected */
  status: MembershipApplicationStatus;
  termsAcceptedAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  /** Human-readable member ID, set on approval */
  memberId: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: { id: string; email: string; displayName: string | null };
  invoice?: Invoice | null;
}

@Injectable()
export class MembershipService {
  private readonly logger = new Logger(MembershipService.name);

  constructor(
    @InjectRepository(MembershipApplication)
    private readonly appRepo: Repository<MembershipApplication>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoicePayment)
    private readonly paymentRepo: Repository<InvoicePayment>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mail: MailService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  // ── Helpers ───────────────────────────────────────────────────

  private frontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL', 'http://localhost:4200');
  }

  private paymentUrl(invoiceId: string): string {
    return `${this.frontendUrl()}/payment?invoiceId=${invoiceId}`;
  }

  /**
   * Generate the next human-readable member ID, e.g. CSEDIU-2026-0001.
   * Sequential per calendar year; safe for low-concurrency admin use.
   */
  private async generateMemberId(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CSEDIU-${year}-`;
    const rows = await this.userRepo.manager.query<{ max: string | null }[]>(
      `SELECT MAX(CAST(SUBSTRING(member_id FROM $1) AS INTEGER)) AS max
       FROM users
       WHERE member_id LIKE $2`,
      [prefix.length + 1, `${prefix}%`],
    );
    const next = (parseInt(rows[0]?.max ?? '0', 10) || 0) + 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
  }

  private sendMailSafe(label: string, task: () => Promise<void>): void {
    task().catch((err: unknown) =>
      this.logger.error(
        `[EMAIL] Failed to send "${label}": ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
  }

  /**
   * Compute the effective application status.
   * If the stored status is 'payment_required' but the invoice already
   * has a submitted (pending or verified) payment, we surface 'payment_submitted'.
   */
  private async effectiveStatus(
    app: MembershipApplication,
  ): Promise<MembershipApplicationStatus> {
    if (app.status !== 'payment_required') return app.status;
    if (!app.invoiceId) return app.status;

    const submittedPayment = await this.paymentRepo.findOne({
      where: [
        { invoiceId: app.invoiceId, status: 'pending' },
        { invoiceId: app.invoiceId, status: 'verified' },
      ],
    });
    return submittedPayment ? 'payment_submitted' : 'payment_required';
  }

  private async enrichApplication(
    app: MembershipApplication,
    includeUser = false,
  ): Promise<MembershipApplicationDto> {
    const status = await this.effectiveStatus(app);

    let invoice: Invoice | null = null;
    if (app.invoiceId) {
      invoice = await this.invoiceRepo.findOne({
        where: { id: app.invoiceId },
        relations: { payments: true },
        order: { payments: { createdAt: 'ASC' } },
      });
    }

    const dto: MembershipApplicationDto = {
      id: app.id,
      userId: app.userId,
      invoiceId: app.invoiceId,
      status,
      termsAcceptedAt: app.termsAcceptedAt,
      reviewedAt: app.reviewedAt,
      reviewedBy: app.reviewedBy,
      rejectionReason: app.rejectionReason,
      memberId: null,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      invoice,
    };

    // Always resolve the user to get memberId (+ optionally include full user info)
    const user = await this.userRepo.findOne({ where: { id: app.userId } });
    if (user) {
      dto.memberId = user.memberId ?? null;
      if (includeUser) {
        dto.user = {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        };
      }
    }

    return dto;
  }

  // ── Public API ────────────────────────────────────────────────

  /**
   * Submit a new membership application.
   * Creates an invoice for ৳500 and sends a confirmation email.
   */
  async apply(userId: string): Promise<{
    applicationId: string;
    invoiceId: string;
    paymentUrl: string;
  }> {
    // Check for duplicate (active or approved application)
    const existing = await this.appRepo.findOne({ where: { userId } });
    if (existing && existing.status !== 'rejected') {
      throw new ConflictException(
        'You already have an active or approved membership application.',
      );
    }

    // Create the invoice
    const inv = this.invoiceRepo.create({
      type: 'membership',
      description: 'CSE DIU Alumni Lifetime Membership',
      totalAmount: 500,
      userId,
      status: 'pending',
    });
    const invoice = await this.invoiceRepo.save(inv);

    // Create (or replace) the application
    if (existing) {
      // Previous application was rejected — replace it
      await this.appRepo.remove(existing);
    }

    const appId = uuidv4();
    await this.appRepo.manager.query(
      `INSERT INTO membership_applications
         (id, user_id, invoice_id, status, terms_accepted_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [appId, userId, invoice.id, 'payment_required', new Date()],
    );
    const saved = await this.appRepo.findOneOrFail({ where: { id: appId } });

    this.logger.log(
      `[APPLY] New membership application userId=${userId} appId=${saved.id} invoiceId=${invoice.id}`,
    );

    // Fire-and-forget email
    this.sendMailSafe(`membership-apply userId=${userId}`, async () => {
      const user = await this.users.findById(userId);
      if (!user?.email) return;
      await this.mail.sendMembershipInvoice(
        user.email,
        invoice.id,
        500,
        this.paymentUrl(invoice.id),
      );
    });

    return {
      applicationId: saved.id,
      invoiceId: invoice.id,
      paymentUrl: this.paymentUrl(invoice.id),
    };
  }

  /** Get the current user's own membership application. */
  async getMyApplication(userId: string): Promise<MembershipApplicationDto> {
    const app = await this.appRepo.findOne({ where: { userId } });
    if (!app) throw new NotFoundException('No membership application found.');
    return this.enrichApplication(app);
  }

  /** List all applications (admin). */
  async listRequests(): Promise<MembershipApplicationDto[]> {
    const apps = await this.appRepo.find({
      order: { createdAt: 'DESC' },
    });
    return Promise.all(apps.map((a) => this.enrichApplication(a, true)));
  }

  /** Get a single application by ID (admin). */
  async findRequest(id: string): Promise<MembershipApplicationDto> {
    const app = await this.appRepo.findOne({ where: { id } });
    if (!app) throw new NotFoundException(`Application ${id} not found.`);
    return this.enrichApplication(app, true);
  }

  /** Approve a membership application. */
  async approve(
    applicationId: string,
    adminUserId: string,
  ): Promise<MembershipApplicationDto> {
    const app = await this.appRepo.findOne({ where: { id: applicationId } });
    if (!app) throw new NotFoundException(`Application ${applicationId} not found.`);

    if (app.status === 'approved') {
      throw new BadRequestException('Application is already approved.');
    }
    if (app.status === 'rejected') {
      throw new BadRequestException('Cannot approve a rejected application.');
    }

    // Update application
    app.status = 'approved';
    app.reviewedAt = new Date();
    app.reviewedBy = adminUserId;
    await this.appRepo.save(app);

    // Assign a human-readable member ID if the user doesn't have one yet
    const existingUser = await this.userRepo.findOne({ where: { id: app.userId } });
    if (existingUser && !existingUser.memberId) {
      const memberId = await this.generateMemberId();
      await this.userRepo.update(app.userId, { memberId });
      this.logger.log(`[APPROVE] Assigned memberId=${memberId} to userId=${app.userId}`);
    }

    // Swap roles: remove guest, add member
    const [guestRole, memberRole] = await Promise.all([
      this.roleRepo.findOne({ where: { name: 'guest' } }),
      this.roleRepo.findOne({ where: { name: 'member' } }),
    ]);

    if (guestRole) {
      await this.userRoleRepo.delete({ userId: app.userId, roleId: guestRole.id });
    }
    if (memberRole) {
      const alreadyMember = await this.userRoleRepo.findOne({
        where: { userId: app.userId, roleId: memberRole.id },
      });
      if (!alreadyMember) {
        await this.userRoleRepo.save({ userId: app.userId, roleId: memberRole.id });
      }
    }

    this.logger.log(
      `[APPROVE] appId=${applicationId} userId=${app.userId} by admin=${adminUserId}`,
    );

    // Send approval email
    this.sendMailSafe(`membership-approved userId=${app.userId}`, async () => {
      const user = await this.userRepo.findOne({ where: { id: app.userId } });
      if (!user?.email) return;
      await this.mail.sendMembershipApproved(
        user.email,
        user.displayName ?? user.email,
        `${this.frontendUrl()}/dashboard`,
        user.memberId ?? '',
      );
    });

    return this.enrichApplication(app, true);
  }

  /** Reject a membership application. */
  async reject(
    applicationId: string,
    adminUserId: string,
    reason: string,
  ): Promise<MembershipApplicationDto> {
    const app = await this.appRepo.findOne({ where: { id: applicationId } });
    if (!app) throw new NotFoundException(`Application ${applicationId} not found.`);

    if (app.status === 'approved') {
      throw new BadRequestException('Cannot reject an already-approved application.');
    }
    if (app.status === 'rejected') {
      throw new BadRequestException('Application is already rejected.');
    }

    // Check if payment was submitted — flag invoice for refund
    const effectiveStatus = await this.effectiveStatus(app);
    const refundRequired = effectiveStatus === 'payment_submitted';

    if (refundRequired && app.invoiceId) {
      // Mark the pending payment with a refund note
      await this.paymentRepo.update(
        { invoiceId: app.invoiceId, status: 'pending' },
        {
          status: 'refunded',
          adminNote: `Membership application rejected: ${reason}`,
        },
      );
      // Mark the invoice itself as refunded
      await this.invoiceRepo.update(
        { id: app.invoiceId },
        { status: 'refunded' },
      );
    }

    // Update application
    app.status = 'rejected';
    app.rejectionReason = reason;
    app.reviewedAt = new Date();
    app.reviewedBy = adminUserId;
    await this.appRepo.save(app);

    this.logger.log(
      `[REJECT] appId=${applicationId} userId=${app.userId} refundRequired=${refundRequired} by admin=${adminUserId}`,
    );

    // Send rejection email
    this.sendMailSafe(`membership-rejected userId=${app.userId}`, async () => {
      const user = await this.users.findById(app.userId);
      if (!user?.email) return;
      await this.mail.sendMembershipRejected(
        user.email,
        user.displayName ?? user.email,
        reason,
        refundRequired,
      );
    });

    return this.enrichApplication(app, true);
  }
}
