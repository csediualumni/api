import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResearchPaper, VenueType } from '../entities/research-paper.entity';

export interface CreateResearchPaperDto {
  title: string;
  authors: string[];
  abstract: string;
  year: number;
  venue: string;
  venueType: VenueType;
  tags?: string[];
  doi?: string | null;
  link: string;
  citations?: number;
  featured?: boolean;
}

export type UpdateResearchPaperDto = Partial<CreateResearchPaperDto>;

@Injectable()
export class ResearchService {
  constructor(
    @InjectRepository(ResearchPaper)
    private readonly repo: Repository<ResearchPaper>,
  ) {}

  findAll(): Promise<ResearchPaper[]> {
    return this.repo.find({ order: { featured: 'DESC', year: 'DESC', createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<ResearchPaper> {
    const paper = await this.repo.findOne({ where: { id } });
    if (!paper) throw new NotFoundException(`Research paper ${id} not found`);
    return paper;
  }

  async create(dto: CreateResearchPaperDto): Promise<ResearchPaper> {
    const paper = this.repo.create({
      ...dto,
      citations: dto.citations ?? 0,
      featured: dto.featured ?? false,
      doi: dto.doi ?? null,
      tags: dto.tags ?? [],
    });
    return this.repo.save(paper);
  }

  async update(id: string, dto: UpdateResearchPaperDto): Promise<ResearchPaper> {
    const existing = await this.findById(id);
    await this.repo.save({ ...existing, ...dto, id });
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findById(id);
    await this.repo.remove(existing);
  }
}
