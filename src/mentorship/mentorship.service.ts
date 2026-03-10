import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mentor } from '../entities/mentor.entity';
import { MentorApplication, ApplicationStatus } from '../entities/mentor-application.entity';

export interface CreateMentorDto {
  name: string;
  batch: number;
  role: string;
  company: string;
  country: string;
  city: string;
  initials?: string | null;
  color?: string | null;
  expertise?: string[];
  bio: string;
  availability: string;
  mentees?: number;
  rating?: number;
  featured?: boolean;
}

export type UpdateMentorDto = Partial<CreateMentorDto>;

export interface ApplyMentorshipDto {
  name: string;
  email: string;
  batch?: number | null;
  area: string;
  goals: string;
  type?: string;
}

@Injectable()
export class MentorshipService {
  constructor(
    @InjectRepository(Mentor)
    private readonly mentorRepo: Repository<Mentor>,
    @InjectRepository(MentorApplication)
    private readonly appRepo: Repository<MentorApplication>,
  ) {}

  // ── Mentors ────────────────────────────────────────────────────

  findAllMentors(): Promise<Mentor[]> {
    return this.mentorRepo.find({ order: { featured: 'DESC', createdAt: 'ASC' } });
  }

  async findMentorById(id: string): Promise<Mentor> {
    const mentor = await this.mentorRepo.findOne({ where: { id } });
    if (!mentor) throw new NotFoundException(`Mentor ${id} not found`);
    return mentor;
  }

  async createMentor(dto: CreateMentorDto): Promise<Mentor> {
    const mentor = this.mentorRepo.create({
      ...dto,
      mentees: dto.mentees ?? 0,
      rating: dto.rating ?? 0,
      featured: dto.featured ?? false,
      initials: dto.initials ?? null,
      color: dto.color ?? null,
      expertise: dto.expertise ?? [],
    });
    return this.mentorRepo.save(mentor);
  }

  async updateMentor(id: string, dto: UpdateMentorDto): Promise<Mentor> {
    const existing = await this.findMentorById(id);
    await this.mentorRepo.save({ ...existing, ...dto, id });
    return this.findMentorById(id);
  }

  async removeMentor(id: string): Promise<void> {
    const existing = await this.findMentorById(id);
    await this.mentorRepo.remove(existing);
  }

  // ── Applications ───────────────────────────────────────────────

  async apply(dto: ApplyMentorshipDto): Promise<MentorApplication> {
    const app = this.appRepo.create({
      name: dto.name,
      email: dto.email,
      batch: dto.batch ?? null,
      area: dto.area,
      goals: dto.goals,
      type: dto.type ?? 'mentee',
      status: 'pending',
    });
    return this.appRepo.save(app);
  }

  findAllApplications(): Promise<MentorApplication[]> {
    return this.appRepo.find({ order: { createdAt: 'DESC' } });
  }

  async updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
  ): Promise<MentorApplication> {
    const app = await this.appRepo.findOne({ where: { id } });
    if (!app) throw new NotFoundException(`Application ${id} not found`);
    app.status = status;
    return this.appRepo.save(app);
  }
}
