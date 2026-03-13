import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';
import { InvoicesService } from './invoices.service';
import type { InvoiceStatus } from '../entities/invoice.entity';
import type { PaymentStatus } from '../entities/invoice-payment.entity';

// ── DTOs ─────────────────────────────────────────────────────────

class CreateInvoiceDto {
  @IsString()
  @IsOptional()
  @IsIn(['donation', 'event', 'membership', 'other'])
  type?: 'donation' | 'event' | 'membership' | 'other';

  @IsString() @IsNotEmpty() description: string;

  @IsString() @IsOptional() campaignTitle?: string;

  @IsInt() @Min(1) totalAmount: number;

  @IsString() @IsOptional() donorName?: string;
  @IsString() @IsOptional() donorMessage?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  isAnonymous?: boolean;

  @IsOptional() metadata?: Record<string, unknown>;
}

class SubmitPaymentDto {
  @IsInt() @Min(1) amount: number;
  @IsString() @IsNotEmpty() transactionId: string;
  @IsString() @IsOptional() senderBkash?: string;
}

class UpdatePaymentStatusDto {
  @IsString()
  @IsIn(['pending', 'verified', 'rejected', 'refunded'])
  status: PaymentStatus;
  @IsString() @IsOptional() adminNote?: string;
}

class UpdateInvoiceStatusDto {
  @IsString()
  @IsIn(['pending', 'partial', 'paid', 'cancelled', 'refunded'])
  status: InvoiceStatus;
}

class RefundPaymentDto {
  @IsString() @IsOptional() adminNote?: string;
}

// ── Controller ───────────────────────────────────────────────────

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  // ── Public: create invoice (optionally authenticated) ─────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(OptionalJwtAuthGuard)
  create(
    @Body() dto: CreateInvoiceDto,
    @Request() req: { user?: { id: string } },
  ) {
    const userId: string | undefined = req.user?.id;
    return this.invoices.create({
      ...dto,
      userId: dto.isAnonymous ? undefined : userId,
    });
  }

  // ── Public: get recent donors ─────────────────────────────────
  @Get('donations/recent')
  getRecentDonors(@Query('limit') limit = 8) {
    return this.invoices.getRecentDonors(Number(limit));
  }

  // ── Auth: get current user's own invoices ────────────────────
  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyInvoices(@Request() req: { user: { id: string } }) {
    return this.invoices.findMyInvoices(req.user.id);
  }

  // ── Public: get single invoice by ID ──────────────────────────
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoices.findById(id);
  }

  // ── Public: submit a payment against an invoice ───────────────
  @Post(':id/payments')
  @HttpCode(HttpStatus.CREATED)
  submitPayment(@Param('id') id: string, @Body() dto: SubmitPaymentDto) {
    return this.invoices.submitPayment(id, dto);
  }

  // ── Admin: list all invoices ───────────────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.INVOICES_READ)
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.invoices.findAll(Number(page), Number(limit));
  }

  // ── Admin: update invoice status ──────────────────────────────
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.INVOICES_WRITE)
  updateInvoiceStatus(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceStatusDto,
  ) {
    return this.invoices.updateInvoiceStatus(id, dto.status);
  }

  // ── Admin: update a payment's status (verify / reject) ────────
  @Patch(':id/payments/:paymentId/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.INVOICES_WRITE)
  updatePaymentStatus(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.invoices.updatePaymentStatus(id, paymentId, dto);
  }

  // ── Admin: refund a payment ───────────────────────────────────
  @Post(':id/payments/:paymentId/refund')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.INVOICES_WRITE)
  refundPayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.invoices.refundPayment(id, paymentId, dto.adminNote);
  }
}
