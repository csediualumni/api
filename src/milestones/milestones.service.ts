import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Milestone } from '../entities/milestone.entity';

export class CreateMilestoneDto {
  @IsString() @IsNotEmpty() year!: string;
  @IsString() @IsNotEmpty() title!: string;
  @IsString() @IsNotEmpty() description!: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class UpdateMilestoneDto {
  @IsOptional() @IsString() @IsNotEmpty() year?: string;
  @IsOptional() @IsString() @IsNotEmpty() title?: string;
  @IsOptional() @IsString() @IsNotEmpty() description?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

@Injectable()
export class MilestonesService {
  constructor(
    @InjectRepository(Milestone)
    private readonly repo: Repository<Milestone>,
  ) {}

  findAll(): Promise<Milestone[]> {
    return this.repo.find({ order: { sortOrder: 'ASC', year: 'ASC' } });
  }

  async findOne(id: string): Promise<Milestone> {
    const m = await this.repo.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Milestone not found.');
    return m;
  }

  async create(dto: CreateMilestoneDto): Promise<Milestone> {
    const milestone = this.repo.create({
      year: dto.year,
      title: dto.title,
      description: dto.description,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.repo.save(milestone);
  }

  async update(id: string, dto: UpdateMilestoneDto): Promise<Milestone> {
    const milestone = await this.findOne(id);
    if (dto.year !== undefined) milestone.year = dto.year;
    if (dto.title !== undefined) milestone.title = dto.title;
    if (dto.description !== undefined) milestone.description = dto.description;
    if (dto.sortOrder !== undefined) milestone.sortOrder = dto.sortOrder;
    return this.repo.save(milestone);
  }

  async remove(id: string): Promise<void> {
    const milestone = await this.findOne(id);
    await this.repo.remove(milestone);
  }
}
