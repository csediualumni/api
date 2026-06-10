import {
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
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';
import {
  EventsService,
  RegisterEventDto,
  RegisterWithProfileDto,
  CheckInDto,
  DistributeDto,
  CreateDistributionItemDto,
  UpdateDistributionItemDto,
} from './events.service';

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly config: ConfigService,
  ) {}

  // ── Public ─────────────────────────────────────────────────────────────────

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Get(':id/sponsors')
  listSponsors(@Param('id') id: string) {
    return this.eventsService.listSponsors(id);
  }

  /** Public endpoint for guest event registration (creates account if needed) */
  @Post(':id/register-with-profile')
  @HttpCode(HttpStatus.CREATED)
  registerWithProfile(@Param('id') id: string, @Body() dto: RegisterWithProfileDto, @Req() req: Request) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:4200');
    return this.eventsService.registerWithProfile(id, dto, frontendUrl);
  }

  /** Get distribution items for an event (public — volunteers and users need this) */
  @Get(':id/distribution-items')
  listDistributionItems(@Param('id') id: string) {
    return this.eventsService.listDistributionItems(id);
  }

  // ── Auth-gated user endpoints ───────────────────────────────────────────────

  @Get('my/registrations')
  @UseGuards(JwtAuthGuard)
  getMyRegistrations(@Req() req: Request) {
    const { id: userId } = req.user as { id: string };
    return this.eventsService.findMyRegistrations(userId);
  }

  @Get(':id/registration')
  @UseGuards(JwtAuthGuard)
  getUserRegistration(@Param('id') id: string, @Req() req: Request) {
    const { id: userId } = req.user as { id: string };
    return this.eventsService.getUserRegistration(id, userId);
  }

  @Get(':id/my-registration/qr-url')
  @UseGuards(JwtAuthGuard)
  getMyQrUrl(@Param('id') id: string, @Req() req: Request) {
    const { id: userId } = req.user as { id: string };
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:4200');
    return this.eventsService.getMyQrUrl(id, userId, frontendUrl);
  }

  @Get(':id/registration/distributions')
  @UseGuards(JwtAuthGuard)
  getRegistrationDistributions(@Param('id') id: string, @Req() req: Request) {
    // Fetch by user's registration for this event
    const { id: userId } = req.user as { id: string };
    return this.eventsService.getUserRegistration(id, userId).then((reg) => {
      if (!reg) return { distributions: [], items: [] };
      return this.eventsService.getRegistrationDistributions(reg.id);
    });
  }

  @Post(':id/register')
  @UseGuards(JwtAuthGuard)
  register(@Param('id') id: string, @Body() dto: RegisterEventDto, @Req() req: Request) {
    const { id: userId } = req.user as { id: string };
    return this.eventsService.register(id, userId, dto);
  }

  @Delete(':id/register')
  @UseGuards(JwtAuthGuard)
  cancelRegistration(@Param('id') id: string, @Req() req: Request) {
    const { id: userId } = req.user as { id: string };
    return this.eventsService.cancelRegistration(id, userId);
  }

  // ── Booth (login required, no special role) ────────────────────────────────

  @Get(':id/booth/lookup')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.EVENTS_DISTRIBUTE)
  boothLookup(@Param('id') id: string, @Query('phone') phone: string) {
    if (!phone) return null;
    return this.eventsService.boothLookup(id, phone);
  }

  @Get(':id/booth/by-reg')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.EVENTS_DISTRIBUTE)
  boothLookupByToken(
    @Param('id') id: string,
    @Query('reg') reg: string,
    @Query('sig') sig: string,
  ) {
    return this.eventsService.boothLookupByToken(id, reg, sig);
  }

  @Post(':id/booth/distribute')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.EVENTS_DISTRIBUTE)
  distribute(
    @Param('id') id: string,
    @Body() dto: DistributeDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as { id: string }).id;
    const ua = req.headers['user-agent'] ?? '';
    const deviceInfo = { userAgent: String(ua) };
    return this.eventsService.distribute(id, dto, userId, deviceInfo);
  }

  @Post('registrations/:registrationId/checkin')
  @UseGuards(JwtAuthGuard)
  checkIn(
    @Param('registrationId') registrationId: string,
    @Body() dto: CheckInDto,
    @Req() req: Request,
  ) {
    const { id: userId } = req.user as { id: string };
    return this.eventsService.checkIn(registrationId, dto, userId);
  }

  @Post('registrations/:registrationId/notes')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  updateNotes(
    @Param('registrationId') registrationId: string,
    @Body('notes') notes: string,
  ) {
    return this.eventsService.updateRegistrationNotes(registrationId, notes);
  }

  // ── Admin: distribution item management ────────────────────────────────────

  @Post(':id/distribution-items')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  createDistributionItem(
    @Param('id') id: string,
    @Body() dto: CreateDistributionItemDto,
  ) {
    return this.eventsService.createDistributionItem(id, dto);
  }

  @Patch(':id/distribution-items/:itemId')
  @UseGuards(JwtAuthGuard)
  updateDistributionItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateDistributionItemDto,
  ) {
    return this.eventsService.updateDistributionItem(id, itemId, dto);
  }

  @Delete(':id/distribution-items/:itemId')
  @UseGuards(JwtAuthGuard)
  removeDistributionItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.eventsService.removeDistributionItem(id, itemId);
  }

  // ── Admin: distribution analytics ─────────────────────────────────────────

  @Get(':id/admin/distribution-summary')
  @UseGuards(JwtAuthGuard)
  getDistributionSummary(@Param('id') id: string) {
    return this.eventsService.getDistributionSummary(id);
  }

  @Get(':id/admin/distributions')
  @UseGuards(JwtAuthGuard)
  getDistributionLog(
    @Param('id') id: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.eventsService.getDistributionLog(
      id,
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 50,
    );
  }

  // ── Legacy RSVP (kept for old events) ─────────────────────────────────────

  @Get('my-rsvps')
  @UseGuards(JwtAuthGuard)
  getMyRsvps(@Req() req: Request) {
    const { id: userId } = req.user as { id: string };
    return this.eventsService.findMyRsvps(userId);
  }

  @Post(':id/rsvp')
  @UseGuards(JwtAuthGuard)
  rsvp(@Param('id') id: string, @Req() req: Request) {
    const { id: userId } = req.user as { id: string };
    return this.eventsService.rsvp(id, userId);
  }

  @Delete(':id/rsvp')
  @UseGuards(JwtAuthGuard)
  cancelRsvp(@Param('id') id: string, @Req() req: Request) {
    const { id: userId } = req.user as { id: string };
    return this.eventsService.cancelRsvp(id, userId);
  }

  @Get(':id/rsvp')
  @UseGuards(JwtAuthGuard)
  getUserRsvp(@Param('id') id: string, @Req() req: Request) {
    const { id: userId } = req.user as { id: string };
    return this.eventsService.getUserRsvp(id, userId);
  }
}
