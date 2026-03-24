import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';
import { AccountingService } from './accounting.service';
import { UploadService } from '../upload/upload.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateAuditReportDto } from './dto/create-audit-report.dto';
import { AutoImportDto } from './dto/auto-import.dto';

@Controller('accounting')
export class AccountingController {
  constructor(
    private readonly accountingService: AccountingService,
    private readonly uploadService: UploadService,
  ) {}

  // ── Receipt upload ────────────────────────────────────────────

  @Post('receipts/upload')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ACCOUNTING_WRITE)
  @UseInterceptors(FileInterceptor('file'))
  async uploadReceipt(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ url: string }> {
    if (!file) throw new BadRequestException('No file uploaded');
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',
    ];
    if (!allowed.includes(file.mimetype))
      throw new BadRequestException('Only images and PDF files are allowed');
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes)
      throw new BadRequestException('File must be smaller than 10 MB');
    const ext = (file.originalname.split('.').pop() ?? 'bin').toLowerCase();
    const url = await this.uploadService.uploadFile(
      file.buffer, file.mimetype, ext, 'receipts',
    );
    return { url };
  }

  // ── Categories ────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  @Get('categories')
  getCategories() {
    return this.accountingService.findAllCategories();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ACCOUNTING_WRITE)
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.accountingService.createCategory(dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ACCOUNTING_WRITE)
  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: CreateCategoryDto) {
    return this.accountingService.updateCategory(id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ACCOUNTING_WRITE)
  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCategory(@Param('id') id: string) {
    return this.accountingService.removeCategory(id);
  }

  // ── Transactions ──────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  @Get('transactions')
  getTransactions(
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.accountingService.findAllTransactions({
      type,
      categoryId,
      month: month ? parseInt(month, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  @Get('transactions/:id')
  getTransaction(@Param('id') id: string) {
    return this.accountingService.findOneTransaction(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ACCOUNTING_WRITE)
  @Post('transactions')
  createTransaction(@Body() dto: CreateTransactionDto, @Request() req: any) {
    return this.accountingService.createTransaction(dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ACCOUNTING_WRITE)
  @Post('transactions/auto-import')
  autoImport(@Body() dto: AutoImportDto, @Request() req: any) {
    return this.accountingService.autoImportPayments(dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ACCOUNTING_WRITE)
  @Patch('transactions/:id')
  updateTransaction(
    @Param('id') id: string,
    @Body() dto: Partial<CreateTransactionDto>,
  ) {
    return this.accountingService.updateTransaction(id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ACCOUNTING_WRITE)
  @Delete('transactions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTransaction(@Param('id') id: string) {
    return this.accountingService.removeTransaction(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  @Get('summary')
  getSummary(@Query('month') month: string, @Query('year') year: string) {
    return this.accountingService.getSummary(parseInt(month, 10), parseInt(year, 10));
  }

  // ── Audit Reports ─────────────────────────────────────────────

  /** Admin: all reports (draft + published) */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  @Get('reports')
  getAllReports() {
    return this.accountingService.findAllReports();
  }

  /** Members: published reports only */
  @UseGuards(JwtAuthGuard)
  @Get('reports/published')
  getPublishedReports() {
    return this.accountingService.findPublishedReports();
  }

  @UseGuards(JwtAuthGuard)
  @Get('reports/:id')
  async getReport(@Param('id') id: string, @Request() req: any) {
    const report = await this.accountingService.findOneReport(id);
    const perms: string[] = req.user?.permissions ?? [];
    if (!report.isPublished && !perms.includes(PERMISSIONS.ACCOUNTING_READ)) {
      throw new ForbiddenException('This report has not been published yet');
    }
    return report;
  }

  /** Full report data including transactions (for display & PDF) */
  @UseGuards(JwtAuthGuard)
  @Get('reports/:id/data')
  async getReportData(@Param('id') id: string, @Request() req: any) {
    const report = await this.accountingService.findOneReport(id);
    const perms: string[] = req.user?.permissions ?? [];
    if (!report.isPublished && !perms.includes(PERMISSIONS.ACCOUNTING_READ)) {
      throw new ForbiddenException('This report has not been published yet');
    }
    return this.accountingService.getReportData(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ACCOUNTING_WRITE)
  @Post('reports')
  createReport(@Body() dto: CreateAuditReportDto, @Request() req: any) {
    return this.accountingService.createReport(dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ACCOUNTING_WRITE)
  @Post('reports/:id/publish')
  publishReport(@Param('id') id: string) {
    return this.accountingService.publishReport(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ACCOUNTING_WRITE)
  @Post('reports/:id/unpublish')
  unpublishReport(@Param('id') id: string) {
    return this.accountingService.unpublishReport(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ACCOUNTING_WRITE)
  @Delete('reports/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteReport(@Param('id') id: string) {
    return this.accountingService.deleteReport(id);
  }
}
