import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Event } from '../entities/event.entity';
import type {
  EventMode,
  EventStatus,
  EventTimelineItem,
  EventGuestList,
  EventContactPerson,
} from '../entities/event.entity';
import { EventRsvp } from '../entities/event-rsvp.entity';
import { EventRegistration } from '../entities/event-registration.entity';
import type { TShirtSize } from '../entities/event-registration.entity';
import { EventFamilyMember } from '../entities/event-family-member.entity';
import { EventSponsor } from '../entities/event-sponsor.entity';
import type { SponsorTier } from '../entities/event-sponsor.entity';
import { EventExpense } from '../entities/event-expense.entity';
import { EventIncome } from '../entities/event-income.entity';
import { EventCheckIn } from '../entities/event-checkin.entity';
import type { CheckInType } from '../entities/event-checkin.entity';
import { EventDistributionItem } from '../entities/event-distribution-item.entity';
import type { DistributionItemType } from '../entities/event-distribution-item.entity';
import { EventDistribution } from '../entities/event-distribution.entity';
import type { RecipientType } from '../entities/event-distribution.entity';
import { Invoice } from '../entities/invoice.entity';
import { AccountTransaction } from '../entities/account-transaction.entity';
import { AccountCategory } from '../entities/account-category.entity';
import { User } from '../entities/user.entity';
import { UserExperience } from '../entities/user-experience.entity';
import { UserEducation } from '../entities/user-education.entity';

// ── Constants ─────────────────────────────────────────────────────────────────

function daysUntil(eventDate: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((eventDate.getTime() - Date.now()) / msPerDay);
}

const PAID_EVENT_CUTOFF_DAYS = 7;

const VALID_MODES: EventMode[] = ['In-Person', 'Online', 'Hybrid'];
const VALID_STATUSES: EventStatus[] = ['upcoming', 'ongoing', 'past'];
const VALID_TSHIRT_SIZES: TShirtSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const VALID_SPONSOR_TIERS: SponsorTier[] = [
  'title', 'platinum', 'gold', 'silver', 'bronze', 'supporter',
];
const VALID_CHECKIN_TYPES: CheckInType[] = [
  'kit', 'breakfast', 'lunch', 'snacks', 'dinner', 'gift', 'custom',
];

// ── DTOs ──────────────────────────────────────────────────────────────────────

export class TimelineItemDto {
  @IsString() @IsNotEmpty() time!: string;
  @IsString() @IsNotEmpty() title!: string;
  @IsOptional() @IsString() description?: string;
}

export class EventGuestDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsString() image?: string;
}

export class GuestListDto {
  @IsOptional() @ValidateNested() @Type(() => EventGuestDto) president?: EventGuestDto;
  @IsOptional() @ValidateNested() @Type(() => EventGuestDto) chiefGuest?: EventGuestDto;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => EventGuestDto) specialGuests?: EventGuestDto[];
}

export class ContactPersonDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() image?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
}

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
  @IsOptional() @IsInt() @Min(0) ticketPrice?: number | null;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TimelineItemDto) timeline?: TimelineItemDto[];
  @IsOptional() @ValidateNested() @Type(() => GuestListDto) guestList?: GuestListDto;
  @IsOptional() @IsString() activities?: string | null;
  @IsOptional() @IsBoolean() allowFamilyMembers?: boolean;
  @IsOptional() @IsInt() @Min(0) familyMemberFee?: number | null;
  @IsOptional() @IsBoolean() donationEnabled?: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ContactPersonDto) contactPersons?: ContactPersonDto[];
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
  @IsOptional() @IsInt() @Min(0) ticketPrice?: number | null;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TimelineItemDto) timeline?: TimelineItemDto[];
  @IsOptional() @ValidateNested() @Type(() => GuestListDto) guestList?: GuestListDto;
  @IsOptional() @IsString() activities?: string | null;
  @IsOptional() @IsBoolean() allowFamilyMembers?: boolean;
  @IsOptional() @IsInt() @Min(0) familyMemberFee?: number | null;
  @IsOptional() @IsBoolean() donationEnabled?: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ContactPersonDto) contactPersons?: ContactPersonDto[];
  @IsOptional() @IsDateString() registrationOpenAt?: string | null;
  @IsOptional() @IsDateString() registrationCloseAt?: string | null;
}

export class FamilyMemberDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsIn(VALID_TSHIRT_SIZES) tShirtSize?: TShirtSize;
}

export class RegisterEventDto {
  @IsOptional() @IsIn(VALID_TSHIRT_SIZES) tShirtSize?: TShirtSize;
  @IsOptional() @IsInt() @Min(0) familyMembersCount?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => FamilyMemberDto) familyMembers?: FamilyMemberDto[];
  @IsOptional() @IsInt() @Min(0) donationAmount?: number;
}

export class CreateSponsorDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() logoUrl?: string | null;
  @IsOptional() @IsString() websiteUrl?: string | null;
  @IsIn(VALID_SPONSOR_TIERS) tier!: SponsorTier;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class UpdateSponsorDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() logoUrl?: string | null;
  @IsOptional() @IsString() websiteUrl?: string | null;
  @IsOptional() @IsIn(VALID_SPONSOR_TIERS) tier?: SponsorTier;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class CreateExpenseDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsInt() @Min(1) amount!: number;
  @IsOptional() @IsString() category?: string | null;
  @IsOptional() @IsString() note?: string | null;
  @IsDateString() expenseDate!: string;
  @IsOptional() @IsString() accountCategoryId?: string;
}

export class UpdateExpenseDto {
  @IsOptional() @IsString() @IsNotEmpty() title?: string;
  @IsOptional() @IsInt() @Min(1) amount?: number;
  @IsOptional() @IsString() category?: string | null;
  @IsOptional() @IsString() note?: string | null;
  @IsOptional() @IsDateString() expenseDate?: string;
}

export class CreateIncomeDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsInt() @Min(1) amount!: number;
  @IsOptional() @IsString() category?: string | null;
  @IsOptional() @IsString() note?: string | null;
  @IsDateString() incomeDate!: string;
  @IsOptional() @IsString() accountCategoryId?: string;
}

export class UpdateIncomeDto {
  @IsOptional() @IsString() @IsNotEmpty() title?: string;
  @IsOptional() @IsInt() @Min(1) amount?: number;
  @IsOptional() @IsString() category?: string | null;
  @IsOptional() @IsString() note?: string | null;
  @IsOptional() @IsDateString() incomeDate?: string;
}

export class CheckInDto {
  @IsIn(VALID_CHECKIN_TYPES) type!: CheckInType;
  @IsOptional() @IsString() customLabel?: string;
}

// ── Distribution DTOs ──────────────────────────────────────────────────────

const VALID_DISTRIBUTION_TYPES: DistributionItemType[] = [
  'kit', 'breakfast', 'lunch', 'snacks', 'dinner', 'gift', 'custom',
];

export class CreateDistributionItemDto {
  @IsIn(VALID_DISTRIBUTION_TYPES) itemType!: DistributionItemType;
  @IsOptional() @IsString() customLabel?: string;
  @IsOptional() @IsBoolean() appliesToMain?: boolean;
  @IsOptional() @IsBoolean() appliesToFamily?: boolean;
  @IsOptional() @IsInt() @Min(0) quantityPerMain?: number;
  @IsOptional() @IsInt() @Min(0) quantityPerFamily?: number;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class UpdateDistributionItemDto {
  @IsOptional() @IsIn(VALID_DISTRIBUTION_TYPES) itemType?: DistributionItemType;
  @IsOptional() @IsString() customLabel?: string;
  @IsOptional() @IsBoolean() appliesToMain?: boolean;
  @IsOptional() @IsBoolean() appliesToFamily?: boolean;
  @IsOptional() @IsInt() @Min(0) quantityPerMain?: number;
  @IsOptional() @IsInt() @Min(0) quantityPerFamily?: number;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class DistributeDto {
  @IsString() @IsNotEmpty() registrationId!: string;
  @IsString() @IsNotEmpty() distributionItemId!: string;
  @IsIn(['main', 'family']) recipientType!: RecipientType;
  @IsOptional() @IsInt() @Min(1) quantity?: number;
}

// ── Guest registration profile DTO ────────────────────────────────────────

export class GuestExpDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsString() @IsNotEmpty() company!: string;
  @IsString() @IsNotEmpty() from!: string;
  @IsString() @IsNotEmpty() to!: string;
}

export class GuestEduDto {
  @IsString() @IsNotEmpty() degree!: string;
  @IsString() @IsNotEmpty() institution!: string;
  @IsOptional() @IsInt() year?: number | null;
}

export class GuestProfileDto {
  @IsString() @IsNotEmpty() fullName!: string;
  @IsString() @IsNotEmpty() email!: string;
  @IsString() @IsNotEmpty() phone!: string;
  @IsIn(['male', 'female']) gender!: string;
  @IsOptional() @IsString() birthday?: string;
  @IsOptional() @IsString() bloodGroup?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsOptional() @IsString() religion?: string;
  @IsOptional() @IsString() presentAddress?: string;
  @IsOptional() @IsString() permanentAddress?: string;
  @IsOptional() @IsString() profession?: string;
  @IsOptional() @IsString() organization?: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsString() photo?: string;
  @IsOptional() @IsInt() @Min(1970) batch?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => GuestExpDto) experiences?: GuestExpDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => GuestEduDto) educations?: GuestEduDto[];
}

export class RegisterWithProfileDto {
  @ValidateNested() @Type(() => GuestProfileDto) profile!: GuestProfileDto;
  @IsOptional() @IsIn(VALID_TSHIRT_SIZES) tShirtSize?: TShirtSize;
  @IsOptional() @IsInt() @Min(0) familyMembersCount?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => FamilyMemberDto) familyMembers?: FamilyMemberDto[];
  @IsOptional() @IsInt() @Min(0) donationAmount?: number;
}

export type EventWithMeta = Event & {
  rsvpCount: number;
  seatsLeft: number | null;
};

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(EventRsvp)
    private readonly rsvpRepo: Repository<EventRsvp>,
    @InjectRepository(EventRegistration)
    private readonly registrationRepo: Repository<EventRegistration>,
    @InjectRepository(EventFamilyMember)
    private readonly familyMemberRepo: Repository<EventFamilyMember>,
    @InjectRepository(EventSponsor)
    private readonly sponsorRepo: Repository<EventSponsor>,
    @InjectRepository(EventExpense)
    private readonly expenseRepo: Repository<EventExpense>,
    @InjectRepository(EventIncome)
    private readonly incomeRepo: Repository<EventIncome>,
    @InjectRepository(EventCheckIn)
    private readonly checkInRepo: Repository<EventCheckIn>,
    @InjectRepository(EventDistributionItem)
    private readonly distItemRepo: Repository<EventDistributionItem>,
    @InjectRepository(EventDistribution)
    private readonly distRepo: Repository<EventDistribution>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserExperience)
    private readonly expRepo: Repository<UserExperience>,
    @InjectRepository(UserEducation)
    private readonly eduRepo: Repository<UserEducation>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(AccountTransaction)
    private readonly txRepo: Repository<AccountTransaction>,
    @InjectRepository(AccountCategory)
    private readonly categoryRepo: Repository<AccountCategory>,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  // ── QR signing helpers ────────────────────────────────────────────────────

  private getQrSecret(): string {
    return this.config.get<string>('QR_SECRET', 'csediualumni-qr-secret');
  }

  private signQrToken(registrationId: string): string {
    return crypto
      .createHmac('sha256', this.getQrSecret())
      .update(registrationId)
      .digest('hex')
      .slice(0, 16);
  }

  verifyQrToken(registrationId: string, sig: string): boolean {
    return this.signQrToken(registrationId) === sig;
  }

  getBoothQrUrl(eventId: string, registrationId: string, frontendUrl: string): string {
    const sig = this.signQrToken(registrationId);
    return `${frontendUrl}/events/${eventId}/booth?reg=${registrationId}&sig=${sig}`;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async attachMeta(events: Event[]): Promise<EventWithMeta[]> {
    if (events.length === 0) return [];
    const ids = events.map((e) => e.id);

    const regCounts: { event_id: string; cnt: string }[] = await this.registrationRepo
      .createQueryBuilder('r')
      .select('r.event_id', 'event_id')
      .addSelect('COUNT(r.id)', 'cnt')
      .where('r.event_id IN (:...ids)', { ids })
      .andWhere('r.status = :status', { status: 'confirmed' })
      .groupBy('r.event_id')
      .getRawMany();

    const rsvpCounts: { event_id: string; cnt: string }[] = await this.rsvpRepo
      .createQueryBuilder('rsvp')
      .select('rsvp.event_id', 'event_id')
      .addSelect('COUNT(rsvp.id)', 'cnt')
      .where('rsvp.event_id IN (:...ids)', { ids })
      .andWhere('rsvp.status = :status', { status: 'registered' })
      .groupBy('rsvp.event_id')
      .getRawMany();

    const regMap = new Map(regCounts.map((r) => [r.event_id, parseInt(r.cnt, 10)]));
    const rsvpMap = new Map(rsvpCounts.map((r) => [r.event_id, parseInt(r.cnt, 10)]));

    return events.map((e) => {
      const rsvpCount = (regMap.get(e.id) ?? 0) + (rsvpMap.get(e.id) ?? 0);
      return Object.assign(e, {
        rsvpCount,
        seatsLeft: e.seats !== null ? Math.max(0, e.seats - rsvpCount) : null,
      }) as EventWithMeta;
    });
  }

  // ── Public read (published only) ──────────────────────────────────────────

  async findAll(): Promise<EventWithMeta[]> {
    const events = await this.eventRepo.find({
      where: { published: true },
      order: { sortOrder: 'ASC', date: 'ASC' },
    });
    return this.attachMeta(events);
  }

  async findOne(id: string): Promise<any> {
    const event = await this.eventRepo.findOne({ where: { id, published: true } });
    if (!event) throw new NotFoundException('Event not found.');
    const [enriched] = await this.attachMeta([event]);
    const sponsors = await this.sponsorRepo.find({
      where: { eventId: id },
      order: { sortOrder: 'ASC' },
    });
    return { ...enriched, sponsors };
  }

  // ── Admin read (all events) ───────────────────────────────────────────────

  async adminFindAll(): Promise<EventWithMeta[]> {
    const events = await this.eventRepo.find({
      order: { sortOrder: 'ASC', date: 'ASC' },
    });
    return this.attachMeta(events);
  }

  async adminFindOne(id: string): Promise<any> {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found.');
    const [enriched] = await this.attachMeta([event]);
    const sponsors = await this.sponsorRepo.find({
      where: { eventId: id },
      order: { sortOrder: 'ASC' },
    });
    return { ...enriched, sponsors };
  }

  // ── Admin CRUD ────────────────────────────────────────────────────────────

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
      published: false,
      timeline: dto.timeline?.length ? (dto.timeline as EventTimelineItem[]) : null,
      guestList: (dto.guestList as EventGuestList) ?? null,
      activities: dto.activities ?? null,
      allowFamilyMembers: dto.allowFamilyMembers ?? false,
      familyMemberFee: dto.familyMemberFee ?? null,
      donationEnabled: dto.donationEnabled ?? false,
      contactPersons: dto.contactPersons?.length ? (dto.contactPersons as EventContactPerson[]) : null,
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
    if (dto.timeline !== undefined)
      event.timeline = dto.timeline?.length ? (dto.timeline as EventTimelineItem[]) : null;
    if (dto.guestList !== undefined)
      event.guestList = (dto.guestList as EventGuestList) ?? null;
    if (dto.activities !== undefined) event.activities = dto.activities ?? null;
    if (dto.allowFamilyMembers !== undefined) event.allowFamilyMembers = dto.allowFamilyMembers;
    if (dto.familyMemberFee !== undefined) event.familyMemberFee = dto.familyMemberFee ?? null;
    if (dto.donationEnabled !== undefined) event.donationEnabled = dto.donationEnabled;
    if (dto.contactPersons !== undefined)
      event.contactPersons = dto.contactPersons?.length ? (dto.contactPersons as EventContactPerson[]) : null;
    if (dto.registrationOpenAt !== undefined) event.registrationOpenAt = dto.registrationOpenAt ? new Date(dto.registrationOpenAt) : null;
    if (dto.registrationCloseAt !== undefined) event.registrationCloseAt = dto.registrationCloseAt ? new Date(dto.registrationCloseAt) : null;

    const saved = await this.eventRepo.save(event);
    const [enriched] = await this.attachMeta([saved]);
    return enriched;
  }

  async remove(id: string): Promise<void> {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found.');
    await this.eventRepo.remove(event);
  }

  async flushRegistrations(id: string): Promise<{ deleted: number }> {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found.');
    const result = await this.registrationRepo.delete({ eventId: id });
    return { deleted: result.affected ?? 0 };
  }

  // ── Publish / Unpublish ───────────────────────────────────────────────────

  async publish(id: string): Promise<EventWithMeta> {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found.');

    const failures: string[] = [];
    if (!event.timeline?.length)
      failures.push('Timeline must have at least one item');
    if (!event.guestList?.president?.name && !event.guestList?.chiefGuest?.name)
      failures.push('Guest list must include at least a President or Chief Guest');
    if (!event.activities?.trim())
      failures.push('Activities description must be filled in');
    if (event.ticketPrice === null)
      failures.push('Registration fee must be set (use 0 for free events)');
    if (!event.imageUrl)
      failures.push('Cover image must be uploaded');

    if (failures.length > 0) {
      throw new BadRequestException({ message: 'Event is not ready to publish.', checklist: failures });
    }

    event.published = true;
    const saved = await this.eventRepo.save(event);
    const [enriched] = await this.attachMeta([saved]);
    return enriched;
  }

  async unpublish(id: string): Promise<EventWithMeta> {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found.');
    event.published = false;
    const saved = await this.eventRepo.save(event);
    const [enriched] = await this.attachMeta([saved]);
    return enriched;
  }

  // ── Registration (new system) ─────────────────────────────────────────────

  async register(
    eventId: string,
    userId: string,
    dto: RegisterEventDto,
  ): Promise<{
    message: string;
    registration: EventRegistration;
    invoiceId?: string;
    paymentUrl?: string;
  }> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, published: true } });
    if (!event) throw new NotFoundException('Event not found or not published.');

    if (event.status !== 'upcoming' && event.status !== 'ongoing') {
      throw new BadRequestException('Registration is closed for this event.');
    }

    const now = new Date();
    if (event.registrationOpenAt && now < event.registrationOpenAt) {
      throw new BadRequestException('Registration for this event has not opened yet.');
    }
    if (event.registrationCloseAt && now > event.registrationCloseAt) {
      throw new BadRequestException('Registration for this event is closed.');
    }

    const isPaidEvent = event.ticketPrice !== null && event.ticketPrice > 0;
    if (isPaidEvent && daysUntil(event.date) < PAID_EVENT_CUTOFF_DAYS) {
      throw new BadRequestException(
        `Registration for paid events closes ${PAID_EVENT_CUTOFF_DAYS} days before the event.`,
      );
    }

    const existing = await this.registrationRepo.findOne({ where: { eventId, userId } });
    if (existing && existing.status !== 'cancelled') {
      throw new BadRequestException('You are already registered for this event.');
    }

    const familyMembersCount = dto.familyMembersCount ?? 0;
    const donationAmount = dto.donationAmount ?? 0;

    if (familyMembersCount > 0 && !event.allowFamilyMembers) {
      throw new BadRequestException('This event does not allow family members.');
    }

    if (event.seats !== null) {
      const activeCount = await this.registrationRepo.count({
        where: { eventId, status: 'confirmed' },
      });
      if (activeCount >= event.seats) {
        throw new BadRequestException('This event is fully booked.');
      }
    }

    const ticketTotal =
      (event.ticketPrice ?? 0) +
      familyMembersCount * (event.familyMemberFee ?? event.ticketPrice ?? 0) +
      donationAmount;

    const applyToReg = async (reg: EventRegistration) => {
      await this.saveFamilyMembers(reg.id, dto.familyMembers ?? []);
      return reg;
    };

    // ── Paid / has donation ────────────────────────────────────────────────
    if (ticketTotal > 0) {
      const invoice = this.invoiceRepo.create({
        type: 'event',
        description: `Registration: ${event.title}`,
        totalAmount: ticketTotal,
        status: 'pending',
        userId,
        metadata: { eventId, eventTitle: event.title, familyMembersCount, donationAmount },
      });
      const savedInvoice = await this.invoiceRepo.save(invoice);

      let reg: EventRegistration;
      if (existing) {
        existing.status = 'pending_payment';
        existing.invoiceId = savedInvoice.id;
        existing.tShirtSize = dto.tShirtSize ?? null;
        existing.familyMembersCount = familyMembersCount;
        existing.donationAmount = donationAmount;
        reg = await this.registrationRepo.save(existing);
      } else {
        reg = await this.registrationRepo.save(
          this.registrationRepo.create({
            eventId,
            userId,
            status: 'pending_payment',
            invoiceId: savedInvoice.id,
            tShirtSize: dto.tShirtSize ?? null,
            familyMembersCount,
            donationAmount,
          }),
        );
      }
      await applyToReg(reg);
      return {
        message: 'Invoice created. Please complete payment to confirm your spot.',
        registration: reg,
        invoiceId: savedInvoice.id,
        paymentUrl: `/payment?invoiceId=${savedInvoice.id}`,
      };
    }

    // ── Free path ──────────────────────────────────────────────────────────
    let reg: EventRegistration;
    if (existing) {
      existing.status = 'confirmed';
      existing.tShirtSize = dto.tShirtSize ?? null;
      existing.familyMembersCount = familyMembersCount;
      reg = await this.registrationRepo.save(existing);
    } else {
      reg = await this.registrationRepo.save(
        this.registrationRepo.create({
          eventId,
          userId,
          status: 'confirmed',
          tShirtSize: dto.tShirtSize ?? null,
          familyMembersCount,
          donationAmount: 0,
        }),
      );
    }
    await applyToReg(reg);
    return { message: 'Registration confirmed.', registration: reg };
  }

  private async saveFamilyMembers(registrationId: string, members: FamilyMemberDto[]) {
    await this.familyMemberRepo.delete({ registrationId });
    if (!members.length) return;
    const rows = members.map((m) =>
      this.familyMemberRepo.create({ registrationId, name: m.name, tShirtSize: m.tShirtSize ?? null }),
    );
    await this.familyMemberRepo.save(rows);
  }

  async cancelRegistration(eventId: string, userId: string): Promise<{ message: string }> {
    const reg = await this.registrationRepo.findOne({
      where: [
        { eventId, userId, status: 'confirmed' },
        { eventId, userId, status: 'pending_payment' },
      ],
    });
    if (!reg) throw new NotFoundException('No active registration found.');

    if (reg.invoiceId) {
      const event = await this.eventRepo.findOne({ where: { id: eventId } });
      if (event && daysUntil(event.date) < PAID_EVENT_CUTOFF_DAYS) {
        throw new BadRequestException(
          `Cancellation is not allowed within ${PAID_EVENT_CUTOFF_DAYS} days of the event.`,
        );
      }
      await this.invoiceRepo.update({ id: reg.invoiceId }, { status: 'refunded' });
    }

    reg.status = 'cancelled';
    await this.registrationRepo.save(reg);
    return { message: 'Registration cancelled.' };
  }

  async findMyRegistrations(userId: string): Promise<EventRegistration[]> {
    return this.registrationRepo.find({
      where: { userId },
      relations: { event: true, familyMembers: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getUserRegistration(eventId: string, userId: string): Promise<EventRegistration | null> {
    return this.registrationRepo.findOne({ where: { eventId, userId } }) ?? null;
  }

  async confirmRegistration(eventId: string, registrationId: string): Promise<EventRegistration> {
    const reg = await this.registrationRepo.findOne({
      where: { id: registrationId, eventId, status: 'pending_payment' },
    });
    if (!reg) throw new NotFoundException('Pending registration not found.');
    reg.status = 'confirmed';
    return this.registrationRepo.save(reg);
  }

  async listRegistrations(eventId: string): Promise<EventRegistration[]> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');
    return this.registrationRepo.find({
      where: [
        { eventId, status: 'confirmed' },
        { eventId, status: 'pending_payment' },
      ],
      relations: { user: true, familyMembers: true, checkIns: true },
      order: { createdAt: 'ASC' },
    });
  }

  // ── Booth ─────────────────────────────────────────────────────────────────

  async boothLookup(eventId: string, phone: string): Promise<EventRegistration & { user: User }> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');

    const user = await this.userRepo.findOne({ where: { phone: phone.trim() } });

    if (!user) throw new NotFoundException('No attendee found with this phone number.');

    const reg = await this.registrationRepo.findOne({
      where: { eventId, userId: user.id },
      relations: { familyMembers: true, checkIns: true },
    });
    if (!reg) throw new NotFoundException('No registration found for this attendee.');

    return Object.assign(reg, { user });
  }

  async boothLookupByToken(
    eventId: string,
    registrationId: string,
    sig: string,
  ): Promise<EventRegistration & { user: User; distributionItems: EventDistributionItem[]; distributions: EventDistribution[] }> {
    if (!this.verifyQrToken(registrationId, sig)) {
      throw new BadRequestException('Invalid or tampered QR code.');
    }

    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');

    const reg = await this.registrationRepo.findOne({
      where: { id: registrationId, eventId },
      relations: { familyMembers: true, checkIns: true },
    });
    if (!reg) throw new NotFoundException('Registration not found.');

    const user = await this.userRepo.findOne({ where: { id: reg.userId } });
    if (!user) throw new NotFoundException('User not found.');

    const [distributionItems, distributions] = await Promise.all([
      this.distItemRepo.find({ where: { eventId }, order: { sortOrder: 'ASC' } }),
      this.distRepo.find({ where: { registrationId } }),
    ]);

    return Object.assign(reg, { user, distributionItems, distributions });
  }

  async getMyQrUrl(eventId: string, userId: string, frontendUrl: string): Promise<{ boothUrl: string }> {
    const reg = await this.registrationRepo.findOne({
      where: { eventId, userId, status: 'confirmed' },
    });
    if (!reg) throw new NotFoundException('No confirmed registration found.');
    return { boothUrl: this.getBoothQrUrl(eventId, reg.id, frontendUrl) };
  }

  // ── Check-in ──────────────────────────────────────────────────────────────

  async checkIn(
    registrationId: string,
    dto: CheckInDto,
    checkedByUserId: string,
  ): Promise<EventCheckIn> {
    const reg = await this.registrationRepo.findOne({ where: { id: registrationId } });
    if (!reg) throw new NotFoundException('Registration not found.');
    if (reg.status !== 'confirmed') {
      throw new BadRequestException('Cannot check in an unconfirmed registration.');
    }

    const existing = await this.checkInRepo.findOne({
      where:
        dto.type === 'custom'
          ? { registrationId, type: 'custom', customLabel: dto.customLabel ?? '' }
          : { registrationId, type: dto.type },
    });
    if (existing) return existing;

    const checkIn = this.checkInRepo.create({
      registrationId,
      type: dto.type,
      customLabel: dto.type === 'custom' ? (dto.customLabel ?? '') : null,
      checkedByUserId,
    });
    return this.checkInRepo.save(checkIn);
  }

  async updateRegistrationNotes(registrationId: string, notes: string): Promise<EventRegistration> {
    const reg = await this.registrationRepo.findOne({ where: { id: registrationId } });
    if (!reg) throw new NotFoundException('Registration not found.');
    reg.notes = notes;
    return this.registrationRepo.save(reg);
  }

  // ── Sponsors ──────────────────────────────────────────────────────────────

  async listSponsors(eventId: string): Promise<EventSponsor[]> {
    return this.sponsorRepo.find({ where: { eventId }, order: { sortOrder: 'ASC' } });
  }

  async createSponsor(eventId: string, dto: CreateSponsorDto): Promise<EventSponsor> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');
    return this.sponsorRepo.save(
      this.sponsorRepo.create({
        eventId,
        name: dto.name,
        logoUrl: dto.logoUrl ?? null,
        websiteUrl: dto.websiteUrl ?? null,
        tier: dto.tier,
        sortOrder: dto.sortOrder ?? 0,
      }),
    );
  }

  async updateSponsor(eventId: string, sponsorId: string, dto: UpdateSponsorDto): Promise<EventSponsor> {
    const sponsor = await this.sponsorRepo.findOne({ where: { id: sponsorId, eventId } });
    if (!sponsor) throw new NotFoundException('Sponsor not found.');
    if (dto.name !== undefined) sponsor.name = dto.name;
    if (dto.logoUrl !== undefined) sponsor.logoUrl = dto.logoUrl ?? null;
    if (dto.websiteUrl !== undefined) sponsor.websiteUrl = dto.websiteUrl ?? null;
    if (dto.tier !== undefined) sponsor.tier = dto.tier;
    if (dto.sortOrder !== undefined) sponsor.sortOrder = dto.sortOrder;
    return this.sponsorRepo.save(sponsor);
  }

  async removeSponsor(eventId: string, sponsorId: string): Promise<void> {
    const sponsor = await this.sponsorRepo.findOne({ where: { id: sponsorId, eventId } });
    if (!sponsor) throw new NotFoundException('Sponsor not found.');
    await this.sponsorRepo.remove(sponsor);
  }

  // ── Expenses ──────────────────────────────────────────────────────────────

  async listExpenses(eventId: string): Promise<EventExpense[]> {
    return this.expenseRepo.find({ where: { eventId }, order: { expenseDate: 'DESC' } });
  }

  async createExpense(eventId: string, dto: CreateExpenseDto, addedByUserId: string): Promise<EventExpense> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');

    let accountTransactionId: string | null = null;
    if (dto.accountCategoryId) {
      const cat = await this.categoryRepo.findOne({ where: { id: dto.accountCategoryId } });
      if (!cat) throw new BadRequestException('Accounting category not found.');
      const tx = await this.txRepo.save(
        this.txRepo.create({
          type: 'expense',
          amount: dto.amount,
          categoryId: dto.accountCategoryId,
          description: `[Event: ${event.title}] ${dto.title}`,
          date: dto.expenseDate,
          referenceType: 'manual',
          createdById: addedByUserId,
        }),
      );
      accountTransactionId = tx.id;
    }

    return this.expenseRepo.save(
      this.expenseRepo.create({
        eventId,
        title: dto.title,
        amount: dto.amount,
        category: dto.category ?? null,
        note: dto.note ?? null,
        expenseDate: dto.expenseDate,
        addedByUserId,
        accountTransactionId,
      }),
    );
  }

  async updateExpense(expenseId: string, dto: UpdateExpenseDto): Promise<EventExpense> {
    const expense = await this.expenseRepo.findOne({ where: { id: expenseId } });
    if (!expense) throw new NotFoundException('Expense not found.');
    if (dto.title !== undefined) expense.title = dto.title;
    if (dto.amount !== undefined) expense.amount = dto.amount;
    if (dto.category !== undefined) expense.category = dto.category ?? null;
    if (dto.note !== undefined) expense.note = dto.note ?? null;
    if (dto.expenseDate !== undefined) expense.expenseDate = dto.expenseDate;
    return this.expenseRepo.save(expense);
  }

  async removeExpense(expenseId: string): Promise<void> {
    const expense = await this.expenseRepo.findOne({ where: { id: expenseId } });
    if (!expense) throw new NotFoundException('Expense not found.');
    await this.expenseRepo.remove(expense);
  }

  // ── Income ────────────────────────────────────────────────────────────────

  async listIncome(eventId: string): Promise<{
    items: EventIncome[];
    registrationTotal: number;
    supplementaryTotal: number;
    grandTotal: number;
  }> {
    const items = await this.incomeRepo.find({ where: { eventId }, order: { incomeDate: 'DESC' } });

    const result: { total: string } | undefined = await this.registrationRepo
      .createQueryBuilder('r')
      .leftJoin('invoices', 'i', 'i.id = r.invoice_id')
      .select('COALESCE(SUM(i.total_amount), 0)', 'total')
      .where('r.event_id = :eventId', { eventId })
      .andWhere('r.status = :status', { status: 'confirmed' })
      .andWhere('i.status = :iStatus', { iStatus: 'paid' })
      .getRawOne();

    const registrationTotal = parseInt(result?.total ?? '0', 10);
    const supplementaryTotal = items.reduce((sum, i) => sum + i.amount, 0);
    return { items, registrationTotal, supplementaryTotal, grandTotal: registrationTotal + supplementaryTotal };
  }

  async createIncome(eventId: string, dto: CreateIncomeDto, addedByUserId: string): Promise<EventIncome> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');

    let accountTransactionId: string | null = null;
    if (dto.accountCategoryId) {
      const cat = await this.categoryRepo.findOne({ where: { id: dto.accountCategoryId } });
      if (!cat) throw new BadRequestException('Accounting category not found.');
      const tx = await this.txRepo.save(
        this.txRepo.create({
          type: 'income',
          amount: dto.amount,
          categoryId: dto.accountCategoryId,
          description: `[Event: ${event.title}] ${dto.title}`,
          date: dto.incomeDate,
          referenceType: 'manual',
          createdById: addedByUserId,
        }),
      );
      accountTransactionId = tx.id;
    }

    return this.incomeRepo.save(
      this.incomeRepo.create({
        eventId,
        title: dto.title,
        amount: dto.amount,
        category: dto.category ?? null,
        note: dto.note ?? null,
        incomeDate: dto.incomeDate,
        addedByUserId,
        accountTransactionId,
      }),
    );
  }

  async updateIncome(incomeId: string, dto: UpdateIncomeDto): Promise<EventIncome> {
    const income = await this.incomeRepo.findOne({ where: { id: incomeId } });
    if (!income) throw new NotFoundException('Income entry not found.');
    if (dto.title !== undefined) income.title = dto.title;
    if (dto.amount !== undefined) income.amount = dto.amount;
    if (dto.category !== undefined) income.category = dto.category ?? null;
    if (dto.note !== undefined) income.note = dto.note ?? null;
    if (dto.incomeDate !== undefined) income.incomeDate = dto.incomeDate;
    return this.incomeRepo.save(income);
  }

  async removeIncome(incomeId: string): Promise<void> {
    const income = await this.incomeRepo.findOne({ where: { id: incomeId } });
    if (!income) throw new NotFoundException('Income entry not found.');
    await this.incomeRepo.remove(income);
  }

  // ── Legacy RSVP (backward compatibility) ─────────────────────────────────

  async rsvp(eventId: string, userId: string): Promise<{
    message: string;
    rsvp: EventRsvp;
    invoiceId?: string;
    paymentUrl?: string;
  }> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');
    if (event.status !== 'upcoming' && event.status !== 'ongoing') {
      throw new BadRequestException('Registration is closed for this event.');
    }
    const isPaidEvent = event.ticketPrice !== null && event.ticketPrice > 0;
    if (isPaidEvent && daysUntil(event.date) < PAID_EVENT_CUTOFF_DAYS) {
      throw new BadRequestException(
        `Registration for paid events closes ${PAID_EVENT_CUTOFF_DAYS} days before the event.`,
      );
    }
    const existing = await this.rsvpRepo.findOne({ where: { eventId, userId } });
    if (existing && (existing.status === 'registered' || existing.status === 'pending_payment')) {
      throw new BadRequestException('You are already registered for this event.');
    }
    if (isPaidEvent) {
      const invoice = this.invoiceRepo.create({
        type: 'event',
        description: `Ticket: ${event.title}`,
        totalAmount: event.ticketPrice!,
        status: 'pending',
        userId,
        metadata: { eventId: event.id, eventTitle: event.title },
      });
      const savedInvoice = await this.invoiceRepo.save(invoice);
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
      return { message: 'Invoice created. Please complete payment.', rsvp, invoiceId: savedInvoice.id, paymentUrl: `/payment?invoiceId=${savedInvoice.id}` };
    }
    if (event.seats !== null) {
      const activeCount = await this.rsvpRepo.count({ where: { eventId, status: 'registered' } });
      if (activeCount >= event.seats) throw new BadRequestException('This event is fully booked.');
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
    if (rsvp.invoiceId) {
      const event = await this.eventRepo.findOne({ where: { id: eventId } });
      if (event && daysUntil(event.date) < PAID_EVENT_CUTOFF_DAYS) {
        throw new BadRequestException(`Cancellation not allowed within ${PAID_EVENT_CUTOFF_DAYS} days of the event.`);
      }
      await this.invoiceRepo.update({ id: rsvp.invoiceId }, { status: 'refunded' });
    }
    rsvp.status = 'cancelled';
    await this.rsvpRepo.save(rsvp);
    return { message: 'Registration cancelled.' };
  }

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

  async getUserRsvp(eventId: string, userId: string): Promise<EventRsvp | null> {
    return this.rsvpRepo.findOne({ where: { eventId, userId } }) ?? null;
  }

  async findMyRsvps(userId: string): Promise<EventRsvp[]> {
    return this.rsvpRepo.find({ where: { userId }, relations: { event: true }, order: { createdAt: 'DESC' } });
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

  // ── Guest registration (register-with-profile) ────────────────────────────

  async registerWithProfile(
    eventId: string,
    dto: RegisterWithProfileDto,
    frontendUrl: string,
  ): Promise<{
    message: string;
    registration: EventRegistration;
    invoiceId?: string;
    paymentUrl?: string;
    accessToken?: string;
    isNewUser: boolean;
  }> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, published: true } });
    if (!event) throw new NotFoundException('Event not found or not published.');

    if (event.status !== 'upcoming' && event.status !== 'ongoing') {
      throw new BadRequestException('Registration is closed for this event.');
    }

    const now = new Date();
    if (event.registrationOpenAt && now < event.registrationOpenAt) {
      throw new BadRequestException('Registration for this event has not opened yet.');
    }
    if (event.registrationCloseAt && now > event.registrationCloseAt) {
      throw new BadRequestException('Registration for this event is closed.');
    }

    const email = dto.profile.email.toLowerCase().trim();
    let user = await this.userRepo.findOne({ where: { email } });

    if (user && !user.isGuest) {
      // Existing full account — cannot register on their behalf; they must log in
      throw new BadRequestException(
        JSON.stringify({ requiresLogin: true, message: 'An account with this email already exists. Please log in first.' }),
      );
    }

    let isNewUser = false;
    if (!user) {
      // Create guest user
      const hashed = await import('bcryptjs').then((b) => b.hash(dto.profile.phone, 12));
      const created = this.userRepo.create({
        email,
        password: hashed,
        displayName: dto.profile.fullName,
        phone: dto.profile.phone,
        isGuest: true,
        gender: dto.profile.gender as any,
        birthday: dto.profile.birthday ?? null,
        bloodGroup: dto.profile.bloodGroup ?? null,
        nationality: dto.profile.nationality ?? null,
        religion: dto.profile.religion ?? null,
        presentAddress: dto.profile.presentAddress ?? null,
        permanentAddress: dto.profile.permanentAddress ?? null,
        profession: dto.profile.profession ?? null,
        organization: dto.profile.organization ?? null,
        designation: dto.profile.designation ?? null,
        avatar: dto.profile.photo ?? null,
        batch: dto.profile.batch ?? null,
      });
      user = await this.userRepo.save(created);
      isNewUser = true;
    } else {
      // Upsert profile on existing guest
      const updates: Record<string, unknown> = {
        displayName: dto.profile.fullName,
        phone: dto.profile.phone,
        gender: dto.profile.gender,
      };
      if (dto.profile.birthday) updates['birthday'] = dto.profile.birthday;
      if (dto.profile.bloodGroup) updates['bloodGroup'] = dto.profile.bloodGroup;
      if (dto.profile.nationality) updates['nationality'] = dto.profile.nationality;
      if (dto.profile.religion) updates['religion'] = dto.profile.religion;
      if (dto.profile.presentAddress) updates['presentAddress'] = dto.profile.presentAddress;
      if (dto.profile.permanentAddress) updates['permanentAddress'] = dto.profile.permanentAddress;
      if (dto.profile.profession) updates['profession'] = dto.profile.profession;
      if (dto.profile.organization) updates['organization'] = dto.profile.organization;
      if (dto.profile.designation) updates['designation'] = dto.profile.designation;
      if (dto.profile.photo) updates['avatar'] = dto.profile.photo;
      if (dto.profile.batch) updates['batch'] = dto.profile.batch;
      await this.userRepo.update(user.id, updates);
      user = await this.userRepo.findOneOrFail({ where: { id: user.id } });
    }

    // Save experiences (replace all for this user if provided)
    if (dto.profile.experiences?.length) {
      await this.expRepo.delete({ userId: user.id });
      const exps = dto.profile.experiences.map((e, i) =>
        this.expRepo.create({ userId: user.id, title: e.title, company: e.company, from: e.from, to: e.to, sortOrder: i }),
      );
      await this.expRepo.save(exps);
    }

    // Save educations (replace all for this user if provided)
    if (dto.profile.educations?.length) {
      await this.eduRepo.delete({ userId: user.id });
      const edus = dto.profile.educations.map((e, i) =>
        this.eduRepo.create({ userId: user.id, degree: e.degree, institution: e.institution, year: e.year ?? null, sortOrder: i }),
      );
      await this.eduRepo.save(edus);
    }

    // Delegate to the existing register() logic
    const result = await this.register(eventId, user.id, {
      tShirtSize: dto.tShirtSize,
      familyMembersCount: dto.familyMembersCount,
      familyMembers: dto.familyMembers,
      donationAmount: dto.donationAmount,
    });

    // Mint a JWT so the frontend can immediately upload a profile picture file
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email });

    return { ...result, isNewUser, accessToken };
  }

  // ── Distribution item management (admin) ──────────────────────────────────

  async listDistributionItems(eventId: string): Promise<EventDistributionItem[]> {
    return this.distItemRepo.find({ where: { eventId }, order: { sortOrder: 'ASC' } });
  }

  async createDistributionItem(eventId: string, dto: CreateDistributionItemDto): Promise<EventDistributionItem> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');
    return this.distItemRepo.save(
      this.distItemRepo.create({
        eventId,
        itemType: dto.itemType,
        customLabel: dto.customLabel ?? null,
        appliesToMain: dto.appliesToMain ?? true,
        appliesToFamily: dto.appliesToFamily ?? false,
        quantityPerMain: dto.quantityPerMain ?? 1,
        quantityPerFamily: dto.quantityPerFamily ?? 1,
        sortOrder: dto.sortOrder ?? 0,
      }),
    );
  }

  async updateDistributionItem(
    eventId: string,
    itemId: string,
    dto: UpdateDistributionItemDto,
  ): Promise<EventDistributionItem> {
    const item = await this.distItemRepo.findOne({ where: { id: itemId, eventId } });
    if (!item) throw new NotFoundException('Distribution item not found.');
    Object.assign(item, {
      ...(dto.itemType !== undefined && { itemType: dto.itemType }),
      ...(dto.customLabel !== undefined && { customLabel: dto.customLabel }),
      ...(dto.appliesToMain !== undefined && { appliesToMain: dto.appliesToMain }),
      ...(dto.appliesToFamily !== undefined && { appliesToFamily: dto.appliesToFamily }),
      ...(dto.quantityPerMain !== undefined && { quantityPerMain: dto.quantityPerMain }),
      ...(dto.quantityPerFamily !== undefined && { quantityPerFamily: dto.quantityPerFamily }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
    });
    return this.distItemRepo.save(item);
  }

  async removeDistributionItem(eventId: string, itemId: string): Promise<void> {
    const item = await this.distItemRepo.findOne({ where: { id: itemId, eventId } });
    if (!item) throw new NotFoundException('Distribution item not found.');
    await this.distItemRepo.remove(item);
  }

  // ── Distribution (volunteer booth) ───────────────────────────────────────

  async distribute(
    eventId: string,
    dto: DistributeDto,
    distributedByUserId: string,
    deviceInfo: Record<string, string> | null,
  ): Promise<EventDistribution> {
    const reg = await this.registrationRepo.findOne({
      where: { id: dto.registrationId, eventId, status: 'confirmed' },
    });
    if (!reg) throw new NotFoundException('Confirmed registration not found.');

    const item = await this.distItemRepo.findOne({ where: { id: dto.distributionItemId, eventId } });
    if (!item) throw new NotFoundException('Distribution item not found.');

    if (dto.recipientType === 'main' && !item.appliesToMain) {
      throw new BadRequestException('This item does not apply to the main registrant.');
    }
    if (dto.recipientType === 'family' && !item.appliesToFamily) {
      throw new BadRequestException('This item does not apply to family members.');
    }

    // Calculate max entitlement
    const maxQty =
      dto.recipientType === 'main'
        ? item.quantityPerMain
        : item.quantityPerFamily * reg.familyMembersCount;

    // Sum already distributed
    const distributed = await this.distRepo
      .createQueryBuilder('d')
      .select('COALESCE(SUM(d.quantity), 0)', 'total')
      .where('d.registration_id = :regId', { regId: dto.registrationId })
      .andWhere('d.distribution_item_id = :itemId', { itemId: dto.distributionItemId })
      .andWhere('d.recipient_type = :type', { type: dto.recipientType })
      .getRawOne<{ total: string }>();

    const alreadyGiven = parseInt(distributed?.total ?? '0', 10);
    const requestedQty = dto.quantity ?? 1;

    if (alreadyGiven + requestedQty > maxQty) {
      throw new BadRequestException(
        `Entitlement exceeded. Already distributed ${alreadyGiven}/${maxQty}.`,
      );
    }

    return this.distRepo.save(
      this.distRepo.create({
        registrationId: dto.registrationId,
        distributionItemId: dto.distributionItemId,
        recipientType: dto.recipientType,
        quantity: requestedQty,
        distributedByUserId,
        deviceInfo,
      }),
    );
  }

  async getDistributionSummary(eventId: string): Promise<{
    item: EventDistributionItem;
    entitledMain: number;
    entitledFamily: number;
    distributedMain: number;
    distributedFamily: number;
    remainingMain: number;
    remainingFamily: number;
  }[]> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');

    const items = await this.distItemRepo.find({ where: { eventId }, order: { sortOrder: 'ASC' } });

    const [mainCount, familyTotal] = await Promise.all([
      this.registrationRepo.count({ where: { eventId, status: 'confirmed' } }),
      this.registrationRepo
        .createQueryBuilder('r')
        .select('COALESCE(SUM(r.family_members_count), 0)', 'total')
        .where('r.event_id = :eventId', { eventId })
        .andWhere('r.status = :status', { status: 'confirmed' })
        .getRawOne<{ total: string }>(),
    ]);

    const totalFamilyMembers = parseInt(familyTotal?.total ?? '0', 10);

    const distTotals = await this.distRepo
      .createQueryBuilder('d')
      .select('d.distribution_item_id', 'itemId')
      .addSelect('d.recipient_type', 'recipientType')
      .addSelect('COALESCE(SUM(d.quantity), 0)', 'total')
      .innerJoin('event_registrations', 'r', 'r.id = d.registration_id')
      .where('r.event_id = :eventId', { eventId })
      .groupBy('d.distribution_item_id')
      .addGroupBy('d.recipient_type')
      .getRawMany<{ itemId: string; recipientType: string; total: string }>();

    const distMap = new Map<string, number>();
    for (const row of distTotals) {
      distMap.set(`${row.itemId}:${row.recipientType}`, parseInt(row.total, 10));
    }

    return items.map((item) => {
      const entitledMain = item.appliesToMain ? mainCount * item.quantityPerMain : 0;
      const entitledFamily = item.appliesToFamily ? totalFamilyMembers * item.quantityPerFamily : 0;
      const distributedMain = distMap.get(`${item.id}:main`) ?? 0;
      const distributedFamily = distMap.get(`${item.id}:family`) ?? 0;
      return {
        item,
        entitledMain,
        entitledFamily,
        distributedMain,
        distributedFamily,
        remainingMain: Math.max(0, entitledMain - distributedMain),
        remainingFamily: Math.max(0, entitledFamily - distributedFamily),
      };
    });
  }

  async getDistributionLog(
    eventId: string,
    skip = 0,
    take = 50,
  ): Promise<{ data: EventDistribution[]; total: number }> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');

    const [data, total] = await this.distRepo
      .createQueryBuilder('d')
      .innerJoin('event_registrations', 'r', 'r.id = d.registration_id')
      .where('r.event_id = :eventId', { eventId })
      .leftJoinAndSelect('d.registration', 'reg')
      .leftJoinAndSelect('reg.user', 'user')
      .leftJoinAndSelect('d.distributionItem', 'item')
      .leftJoinAndSelect('d.distributedBy', 'vol')
      .orderBy('d.distributed_at', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return { data, total };
  }

  async getRegistrationDistributions(registrationId: string): Promise<{
    distributions: EventDistribution[];
    items: EventDistributionItem[];
  }> {
    const reg = await this.registrationRepo.findOne({ where: { id: registrationId } });
    if (!reg) throw new NotFoundException('Registration not found.');

    const [distributions, items] = await Promise.all([
      this.distRepo.find({
        where: { registrationId },
        relations: { distributionItem: true },
      }),
      this.distItemRepo.find({ where: { eventId: reg.eventId }, order: { sortOrder: 'ASC' } }),
    ]);

    return { distributions, items };
  }
}

