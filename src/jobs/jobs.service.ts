import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobPosting, JobType } from '../entities/job-posting.entity';

export interface CreateJobPostingDto {
  title: string;
  company: string;
  location: string;
  country: string;
  type: JobType;
  industry: string;
  experience: string;
  salary?: string | null;
  posted: string;
  deadline: string;
  description: string;
  skills?: string[];
  featured?: boolean;
  postedById?: string | null;
}

export type UpdateJobPostingDto = Partial<CreateJobPostingDto>;

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(JobPosting)
    private readonly repo: Repository<JobPosting>,
  ) {}

  findAll(): Promise<JobPosting[]> {
    return this.repo.find({
      order: { featured: 'DESC', createdAt: 'DESC' },
      relations: ['postedBy'],
    });
  }

  async findById(id: string): Promise<JobPosting> {
    const job = await this.repo.findOne({ where: { id }, relations: ['postedBy'] });
    if (!job) throw new NotFoundException(`Job posting ${id} not found`);
    return job;
  }

  async create(dto: CreateJobPostingDto): Promise<JobPosting> {
    const job = this.repo.create({
      ...dto,
      featured: dto.featured ?? false,
      skills: dto.skills ?? [],
      salary: dto.salary ?? null,
      postedById: dto.postedById ?? null,
    });
    const saved = await this.repo.save(job);
    return this.findById(saved.id);
  }

  async update(id: string, dto: UpdateJobPostingDto): Promise<JobPosting> {
    const existing = await this.findById(id);
    await this.repo.save({ ...existing, ...dto, id });
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findById(id);
    await this.repo.remove(existing);
  }
}
