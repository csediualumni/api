import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  EventsService,
  RegisterEventDto,
  CheckInDto,
} from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

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
  @UseGuards(JwtAuthGuard)
  boothLookup(@Param('id') id: string, @Query('phone') phone: string) {
    if (!phone) return null;
    return this.eventsService.boothLookup(id, phone);
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
