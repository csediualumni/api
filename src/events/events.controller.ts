import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventsService } from './events.service';

/** Public read endpoints + JWT-gated RSVP endpoints. */
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ── Public ─────────────────────────────────────────────────────────

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  // ── RSVP (requires auth) ────────────────────────────────────────────

  /** Register the current user for an event */
  @Post(':id/rsvp')
  @UseGuards(JwtAuthGuard)
  rsvp(@Param('id') id: string, @Req() req: Request) {
    const { id: userId } = req.user as { id: string };
    return this.eventsService.rsvp(id, userId);
  }

  /** Cancel the current user's registration */
  @Delete(':id/rsvp')
  @UseGuards(JwtAuthGuard)
  cancelRsvp(@Param('id') id: string, @Req() req: Request) {
    const { id: userId } = req.user as { id: string };
    return this.eventsService.cancelRsvp(id, userId);
  }

  /** Get the current user's RSVP status for an event (null if not registered) */
  @Get(':id/rsvp')
  @UseGuards(JwtAuthGuard)
  getUserRsvp(@Param('id') id: string, @Req() req: Request) {
    const { id: userId } = req.user as { id: string };
    return this.eventsService.getUserRsvp(id, userId);
  }
}
