import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsArticle, NewsCategory } from '../entities/news-article.entity';

export interface CreateNewsArticleDto {
  title: string;
  summary: string;
  body: string;
  category: NewsCategory;
  author: string;
  date: string;
  readTime: string;
  icon: string;
  color: string;
  pinned?: boolean;
  featured?: boolean;
  sortOrder?: number | null;
}

export type UpdateNewsArticleDto = Partial<CreateNewsArticleDto>;

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(NewsArticle)
    private readonly repo: Repository<NewsArticle>,
  ) {}

  findAll(): Promise<NewsArticle[]> {
    return this.repo.find({
      order: {
        pinned: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async findById(id: string): Promise<NewsArticle> {
    const article = await this.repo.findOne({ where: { id } });
    if (!article) throw new NotFoundException(`News article ${id} not found`);
    return article;
  }

  async create(dto: CreateNewsArticleDto): Promise<NewsArticle> {
    const article = this.repo.create({
      ...dto,
      pinned: dto.pinned ?? false,
      featured: dto.featured ?? false,
      sortOrder: dto.sortOrder ?? null,
    });
    return this.repo.save(article);
  }

  async update(id: string, dto: UpdateNewsArticleDto): Promise<NewsArticle> {
    const existing = await this.findById(id);
    await this.repo.save({ ...existing, ...dto, id });
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findById(id);
    await this.repo.remove(existing);
  }
}
