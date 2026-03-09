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
}

export type EventWithMeta = Event & { rsvpCount: number; seatsLeft: number | null };

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(EventRsvp)
    private readonly rsvpRepo: Repository<EventRsvp>,
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
  ): Promise<{ message: string; rsvp: EventRsvp }> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');

    if (event.status !== 'upcoming' && event.status !== 'ongoing') {
      throw new BadRequestException('Registration is closed for this event.');
    }

    const existing = await this.rsvpRepo.findOne({
      where: { eventId, userId },
    });

    if (existing && existing.status === 'registered') {
      throw new BadRequestException('You are already registered for this event.');
    }

    // Capacity check
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
      const saved = await this.rsvpRepo.save(existing);
      return { message: 'Successfully registered.', rsvp: saved };
    }

    const rsvp = this.rsvpRepo.create({ eventId, userId, status: 'registered' });
    const saved = await this.rsvpRepo.save(rsvp);
    return { message: 'Successfully registered.', rsvp: saved };
  }

  async cancelRsvp(eventId: string, userId: string): Promise<{ message: string }> {
    const rsvp = await this.rsvpRepo.findOne({
      where: { eventId, userId, status: 'registered' },
    });
    if (!rsvp) throw new NotFoundException('No active registration found.');
    rsvp.status = 'cancelled';
    await this.rsvpRepo.save(rsvp);
    return { message: 'Registration cancelled.' };
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
      where: { eventId, status: 'registered' },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
  }
}
