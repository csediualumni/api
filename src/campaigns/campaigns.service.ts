import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Campaign, CampaignStatus } from '../entities/campaign.entity';

export interface CampaignWithStats extends Campaign {
  raised: number;
  donors: number;
}

export interface CreateCampaignDto {
  title: string;
  tagline: string;
  description: string;
  goal: number;
  status?: CampaignStatus;
  deadline?: string;
  category: string;
  icon: string;
  color: string;
  featured?: boolean;
  impact?: string[];
  updates?: string[];
}

export type UpdateCampaignDto = Partial<CreateCampaignDto>;

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly repo: Repository<Campaign>,
    private readonly dataSource: DataSource,
  ) {}

  /** Aggregate raised amount + donor count per campaign from verified invoices */
  private async getStats(): Promise<
    Map<number, { raised: number; donors: number }>
  > {
    const rows: { campaign_id: string; raised: string; donors: string }[] =
      await this.dataSource.query(`
        SELECT
          CAST(metadata->>'campaignId' AS int) AS campaign_id,
          COALESCE(SUM(total_amount), 0)       AS raised,
          COUNT(*)                              AS donors
        FROM invoices
        WHERE type = 'donation'
          AND status IN ('paid', 'partial')
          AND metadata->>'campaignId' IS NOT NULL
        GROUP BY CAST(metadata->>'campaignId' AS int)
      `);

    const map = new Map<number, { raised: number; donors: number }>();
    for (const row of rows) {
      map.set(Number(row.campaign_id), {
        raised: Number(row.raised),
        donors: Number(row.donors),
      });
    }
    return map;
  }

  private merge(
    campaign: Campaign,
    stats: Map<number, { raised: number; donors: number }>,
  ): CampaignWithStats {
    const s = stats.get(campaign.id) ?? { raised: 0, donors: 0 };
    return { ...campaign, raised: s.raised, donors: s.donors };
  }

  async findAll(): Promise<CampaignWithStats[]> {
    const campaigns = await this.repo.find({
      order: { featured: 'DESC', createdAt: 'ASC' },
    });
    const stats = await this.getStats();
    return campaigns.map((c) => this.merge(c, stats));
  }

  async findById(id: number): Promise<CampaignWithStats> {
    const campaign = await this.repo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    const stats = await this.getStats();
    return this.merge(campaign, stats);
  }

  async create(dto: CreateCampaignDto): Promise<CampaignWithStats> {
    const campaign = this.repo.create({
      ...dto,
      impact: dto.impact ?? [],
      updates: dto.updates ?? null,
      featured: dto.featured ?? false,
      status: dto.status ?? 'active',
    });
    const saved = await this.repo.save(campaign);
    return this.merge(saved, new Map());
  }

  async update(id: number, dto: UpdateCampaignDto): Promise<CampaignWithStats> {
    const existing = await this.findById(id);
    await this.repo.save({ ...existing, ...dto, id });
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    const existing = await this.findById(id);
    await this.repo.remove(existing);
  }
}
