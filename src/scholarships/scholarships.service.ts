import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scholarship } from '../entities/scholarship.entity';

export interface CreateScholarshipDto {
  title: string;
  provider: string;
  amount: string;
  currency: string;
  deadline: string;
  eligibility: string;
  level: string;
  country: string;
  type: string;
  description: string;
  tags?: string[];
  link: string;
  featured?: boolean;
  urgent?: boolean;
}

export type UpdateScholarshipDto = Partial<CreateScholarshipDto>;

@Injectable()
export class ScholarshipsService {
  constructor(
    @InjectRepository(Scholarship)
    private readonly repo: Repository<Scholarship>,
  ) {}

  findAll(): Promise<Scholarship[]> {
    return this.repo.find({ order: { featured: 'DESC', urgent: 'DESC', createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Scholarship> {
    const s = await this.repo.findOne({ where: { id } });
    if (!s) throw new NotFoundException(`Scholarship ${id} not found`);
    return s;
  }

  async create(dto: CreateScholarshipDto): Promise<Scholarship> {
    const s = this.repo.create({
      ...dto,
      tags: dto.tags ?? [],
      featured: dto.featured ?? false,
      urgent: dto.urgent ?? false,
    });
    return this.repo.save(s);
  }

  async update(id: string, dto: UpdateScholarshipDto): Promise<Scholarship> {
    const existing = await this.findById(id);
    await this.repo.save({ ...existing, ...dto, id });
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findById(id);
    await this.repo.remove(existing);
  }
}
