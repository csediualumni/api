import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { FindOptionsOrder } from 'typeorm';
import {
  ContactTicket,
  ContactTicketStatus,
} from '../entities/contact-ticket.entity';
import { ContactTicketComment } from '../entities/contact-ticket-comment.entity';
import { MailService } from '../mail/mail.service';

export interface CreateTicketDto {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface AddCommentDto {
  body: string;
  authorName: string;
}

export interface UpdateStatusDto {
  status: ContactTicketStatus;
}

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(ContactTicket)
    private readonly ticketRepo: Repository<ContactTicket>,
    @InjectRepository(ContactTicketComment)
    private readonly commentRepo: Repository<ContactTicketComment>,
    private readonly mail: MailService,
  ) {}

  // ── Public ────────────────────────────────────────────────

  async createTicket(dto: CreateTicketDto): Promise<ContactTicket> {
    const ticket = this.ticketRepo.create({
      name: dto.name,
      email: dto.email,
      subject: dto.subject,
      message: dto.message,
      status: 'open',
    });
    const saved = await this.ticketRepo.save(ticket);

    // Send confirmation to submitter (fire & forget)
    this.mail
      .sendContactTicketCreated(
        saved.email,
        saved.name,
        saved.subject,
        saved.id,
      )
      .catch(() => null);

    return saved;
  }

  // ── Admin ─────────────────────────────────────────────────

  findAll(): Promise<ContactTicket[]> {
    return this.ticketRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['comments'],
    });
  }

  async findOne(id: string): Promise<ContactTicket> {
    const ticket = await this.ticketRepo.findOne({
      where: { id },
      relations: ['comments'],
      order: {
        comments: { createdAt: 'ASC' },
      } as FindOptionsOrder<ContactTicket>,
    });
    if (!ticket) throw new NotFoundException('Ticket not found.');
    return ticket;
  }

  async updateStatus(
    id: string,
    status: ContactTicketStatus,
  ): Promise<ContactTicket> {
    const valid: ContactTicketStatus[] = ['open', 'in_progress', 'resolved'];
    if (!valid.includes(status))
      throw new BadRequestException('Invalid status.');

    const ticket = await this.findOne(id);
    const oldStatus = ticket.status;
    ticket.status = status;
    const saved = await this.ticketRepo.save(ticket);

    if (oldStatus !== status) {
      this.mail
        .sendContactTicketStatusChanged(
          ticket.email,
          ticket.name,
          ticket.subject,
          status,
        )
        .catch(() => null);
    }

    return this.findOne(saved.id);
  }

  async addComment(id: string, dto: AddCommentDto): Promise<ContactTicket> {
    const ticket = await this.findOne(id);

    const comment = this.commentRepo.create({
      ticketId: ticket.id,
      authorName: dto.authorName,
      body: dto.body,
    });
    await this.commentRepo.save(comment);

    // Notify submitter
    this.mail
      .sendContactTicketComment(
        ticket.email,
        ticket.name,
        ticket.subject,
        dto.authorName,
        dto.body,
      )
      .catch(() => null);

    return this.findOne(ticket.id);
  }

  async remove(id: string): Promise<void> {
    const ticket = await this.findOne(id);
    await this.ticketRepo.remove(ticket);
  }
}
