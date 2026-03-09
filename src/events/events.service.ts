import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Event } from '../entities/event.entity';
import type { EventMode, EventStatus } from '../entities/event.entity';
import { EventRsvp } from '../entities/event-rsvp.entity';
import { Invoice } from '../entities/invoice.entity';

/** Returns how many full days remain until `eventDate` from now (can be negative). */
function daysUntil(eventDate: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((eventDate.getTime() - Date.now()) / msPerDay);
}

const PAID_EVENT_CUTOFF_DAYS = 7;

const VALID_MODES: EventMode[] = ['In-Person', 'Online', 'Hybrid'];
const VALID_STATUSES: EventStatus[] = ['upcoming', 'ongoing', 'past'];

export class CreateEventDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsString() @IsNotEmpty() description!: string;
  @IsDateString() date!: string;
  @IsString() @IsNotEmpty() time!: string;
  @IsString() @IsNotEmpty() location!: string;
  @IsString() @IsNotEmpty() city!: string;
  @IsIn(VALID_MODES) mode!: EventMode;
  @IsString() @IsNotEmpty() category!: string;
  @IsIn(VALID_STATUSES) status!: EventStatus;
  @IsOptional() @IsInt() @Min(0) seats?: number | null;
  @IsOptional() @IsString() imageUrl?: string | null;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsString() registrationUrl?: string | null;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  /** Ticket price in BDT. Omit or set to 0 for free events. */
  @IsOptional() @IsInt() @Min(0) ticketPrice?: number | null;
}

export class UpdateEventDto {
  @IsOptional() @IsString() @IsNotEmpty() title?: string;
  @IsOptional() @IsString() @IsNotEmpty() description?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsString() @IsNotEmpty() time?: string;
  @IsOptional() @IsString() @IsNotEmpty() location?: string;
  @IsOptional() @IsString() @IsNotEmpty() city?: string;
  @IsOptional() @IsIn(VALID_MODES) mode?: EventMode;
  @IsOptional() @IsString() @IsNotEmpty() category?: string;
  @IsOptional() @IsIn(VALID_STATUSES) status?: EventStatus;
  @IsOptional() @IsInt() @Min(0) seats?: number | null;
  @IsOptional() @IsString() imageUrl?: string | null;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsString() registrationUrl?: string | null;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  /** Ticket price in BDT. Omit or set to 0 for free events. */
  @IsOptional() @IsInt() @Min(0) ticketPrice?: number | null;
}

export type EventWithMeta = Event & { rsvpCount: number; seatsLeft: number | null };

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(EventRsvp)
    private readonly rsvpRepo: Repository<EventRsvp>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────

  private async attachMeta(events: Event[]): Promise<EventWithMeta[]> {
    if (events.length === 0) return [];
    const ids = events.map((e) => e.id);
    const counts: { event_id: string; cnt: string }[] = await this.rsvpRepo
      .createQueryBuilder('rsvp')
      .select('rsvp.event_id', 'event_id')
      .addSelect('COUNT(rsvp.id)', 'cnt')
      .where('rsvp.event_id IN (:...ids)', { ids })
      .andWhere('rsvp.status = :status', { status: 'registered' })
      .groupBy('rsvp.event_id')
      .getRawMany();

    const countMap = new Map(counts.map((r) => [r.event_id, parseInt(r.cnt, 10)]));

    return events.map((e) => {
      const rsvpCount = countMap.get(e.id) ?? 0;
      return Object.assign(e, {
        rsvpCount,
        seatsLeft: e.seats !== null ? Math.max(0, e.seats - rsvpCount) : null,
      }) as EventWithMeta;
    });
  }

  // ── Public read ───────────────────────────────────────────────────────

  async findAll(): Promise<EventWithMeta[]> {
    const events = await this.eventRepo.find({
      order: { sortOrder: 'ASC', date: 'ASC' },
    });
    return this.attachMeta(events);
  }

  async findOne(id: string): Promise<EventWithMeta> {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found.');
    const [enriched] = await this.attachMeta([event]);
    return enriched;
  }

  // ── Admin CRUD ────────────────────────────────────────────────────────

  async create(dto: CreateEventDto): Promise<EventWithMeta> {
    const event = this.eventRepo.create({
      title: dto.title,
      description: dto.description,
      date: new Date(dto.date),
      time: dto.time,
      location: dto.location,
      city: dto.city,
      mode: dto.mode,
      category: dto.category,
      status: dto.status,
      seats: dto.seats ?? null,
      imageUrl: dto.imageUrl ?? null,
      color: dto.color ?? 'bg-zinc-200',
      featured: dto.featured ?? false,
      registrationUrl: dto.registrationUrl ?? null,
      sortOrder: dto.sortOrder ?? 0,
      ticketPrice: dto.ticketPrice ?? null,
    });
    const saved = await this.eventRepo.save(event);
    const [enriched] = await this.attachMeta([saved]);
    return enriched;
  }

  async update(id: string, dto: UpdateEventDto): Promise<EventWithMeta> {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found.');

    if (dto.title !== undefined) event.title = dto.title;
    if (dto.description !== undefined) event.description = dto.description;
    if (dto.date !== undefined) event.date = new Date(dto.date);
    if (dto.time !== undefined) event.time = dto.time;
    if (dto.location !== undefined) event.location = dto.location;
    if (dto.city !== undefined) event.city = dto.city;
    if (dto.mode !== undefined) event.mode = dto.mode;
    if (dto.category !== undefined) event.category = dto.category;
    if (dto.status !== undefined) event.status = dto.status;
    if (dto.seats !== undefined) event.seats = dto.seats;
    if (dto.imageUrl !== undefined) event.imageUrl = dto.imageUrl;
    if (dto.color !== undefined) event.color = dto.color;
    if (dto.featured !== undefined) event.featured = dto.featured;
    if (dto.registrationUrl !== undefined) event.registrationUrl = dto.registrationUrl;
    if (dto.sortOrder !== undefined) event.sortOrder = dto.sortOrder;
    if (dto.ticketPrice !== undefined) event.ticketPrice = dto.ticketPrice ?? null;

    const saved = await this.eventRepo.save(event);
    const [enriched] = await this.attachMeta([saved]);
    return enriched;
  }

  async remove(id: string): Promise<void> {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found.');
    await this.eventRepo.remove(event);
  }

  // ── RSVP ─────────────────────────────────────────────────────────────

  async rsvp(
    eventId: string,
    userId: string,
  ): Promise<{ message: string; rsvp: EventRsvp; invoiceId?: string; paymentUrl?: string }> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');

    if (event.status !== 'upcoming' && event.status !== 'ongoing') {
      throw new BadRequestException('Registration is closed for this event.');
    }

    const isPaidEvent = event.ticketPrice !== null && event.ticketPrice > 0;

    // Paid events: registration closes PAID_EVENT_CUTOFF_DAYS before the event
    if (isPaidEvent && daysUntil(event.date) < PAID_EVENT_CUTOFF_DAYS) {
      throw new BadRequestException(
        `Registration for paid events closes ${PAID_EVENT_CUTOFF_DAYS} days before the event.`,
      );
    }

    const existing = await this.rsvpRepo.findOne({
      where: { eventId, userId },
    });

    if (existing && (existing.status === 'registered' || existing.status === 'pending_payment')) {
      throw new BadRequestException('You are already registered for this event.');
    }

    // ── Paid event path ──────────────────────────────────────────────────────
    if (isPaidEvent) {
      // Create an invoice for the ticket
      const invoice = this.invoiceRepo.create({
        type: 'event',
        description: `Ticket: ${event.title}`,
        totalAmount: event.ticketPrice!,
        status: 'pending',
        userId,
        metadata: { eventId: event.id, eventTitle: event.title },
      });
      const savedInvoice = await this.invoiceRepo.save(invoice);

      // Create or reactivate RSVP as pending_payment (no seat held)
      let rsvp: EventRsvp;
      if (existing) {
        existing.status = 'pending_payment';
        existing.invoiceId = savedInvoice.id;
        rsvp = await this.rsvpRepo.save(existing);
      } else {
        rsvp = await this.rsvpRepo.save(
          this.rsvpRepo.create({ eventId, userId, status: 'pending_payment', invoiceId: savedInvoice.id }),
        );
      }

      return {
        message: 'Invoice created. Please complete payment to confirm your seat.',
        rsvp,
        invoiceId: savedInvoice.id,
        paymentUrl: `/payment?invoiceId=${savedInvoice.id}`,
      };
    }

    // ── Free event path ──────────────────────────────────────────────────────
    // Capacity check (only enforce for confirmed registrations)
    if (event.seats !== null) {
      const activeCount = await this.rsvpRepo.count({
        where: { eventId, status: 'registered' },
      });
      if (activeCount >= event.seats) {
        throw new BadRequestException('This event is fully booked.');
      }
    }

    if (existing) {
      existing.status = 'registered';
      existing.invoiceId = null;
      const saved = await this.rsvpRepo.save(existing);
      return { message: 'Successfully registered.', rsvp: saved };
    }

    const rsvp = this.rsvpRepo.create({ eventId, userId, status: 'registered' });
    const saved = await this.rsvpRepo.save(rsvp);
    return { message: 'Successfully registered.', rsvp: saved };
  }

  async cancelRsvp(eventId: string, userId: string): Promise<{ message: string }> {
    const rsvp = await this.rsvpRepo.findOne({
      where: [{ eventId, userId, status: 'registered' }, { eventId, userId, status: 'pending_payment' }],
    });
    if (!rsvp) throw new NotFoundException('No active registration found.');

    // For paid RSVPs: cancellation is blocked within PAID_EVENT_CUTOFF_DAYS of the event
    if (rsvp.invoiceId) {
      const event = await this.eventRepo.findOne({ where: { id: eventId } });
      if (event && daysUntil(event.date) < PAID_EVENT_CUTOFF_DAYS) {
        throw new BadRequestException(
          `Cancellation is not allowed within ${PAID_EVENT_CUTOFF_DAYS} days of the event.`,
        );
      }
      // Mark associated invoice as refunded
      await this.invoiceRepo.update({ id: rsvp.invoiceId }, { status: 'refunded' });
    }

    rsvp.status = 'cancelled';
    await this.rsvpRepo.save(rsvp);
    return { message: 'Registration cancelled.' };
  }

  /** Admin-only: confirm a pending_payment RSVP as registered (bypasses 7-day cutoff). */
  async confirmRsvp(eventId: string, rsvpId: string): Promise<EventRsvp> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');

    const rsvp = await this.rsvpRepo.findOne({
      where: { id: rsvpId, eventId, status: 'pending_payment' },
      relations: { user: true },
    });
    if (!rsvp) throw new NotFoundException('Pending RSVP not found.');

    rsvp.status = 'registered';
    return this.rsvpRepo.save(rsvp);
  }

  async getUserRsvp(
    eventId: string,
    userId: string,
  ): Promise<EventRsvp | null> {
    return this.rsvpRepo.findOne({ where: { eventId, userId } }) ?? null;
  }

  async listRsvps(eventId: string): Promise<EventRsvp[]> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');
    return this.rsvpRepo.find({
      where: [{ eventId, status: 'registered' }, { eventId, status: 'pending_payment' }],
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
  }
}
