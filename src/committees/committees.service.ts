import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Committee } from '../entities/committee.entity';
import { CommitteeMember } from '../entities/committee-member.entity';

export class CreateCommitteeDto {
  @IsString() @IsNotEmpty() term!: string;
  @IsString() @IsNotEmpty() sessionLabel!: string;
  @IsOptional() @IsBoolean() isCurrent?: boolean;
  @IsOptional() @IsString() theme?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class UpdateCommitteeDto {
  @IsOptional() @IsString() @IsNotEmpty() term?: string;
  @IsOptional() @IsString() @IsNotEmpty() sessionLabel?: string;
  @IsOptional() @IsBoolean() isCurrent?: boolean;
  @IsOptional() @IsString() theme?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class AddCommitteeMemberDto {
  @IsString() @IsNotEmpty() userId!: string;
  @IsString() @IsNotEmpty() designation!: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsString() note?: string;
}

export class UpdateCommitteeMemberDto {
  @IsOptional() @IsString() @IsNotEmpty() designation?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsString() note?: string;
}

/**
 * Selects only the safe public user fields to include in committee member responses.
 */
const USER_SELECT = {
  id: true,
  displayName: true,
  email: true,
  avatar: true,
  batch: true,
  jobTitle: true,
  company: true,
  city: true,
  country: true,
};

@Injectable()
export class CommitteesService {
  constructor(
    @InjectRepository(Committee)
    private readonly committeeRepo: Repository<Committee>,

    @InjectRepository(CommitteeMember)
    private readonly memberRepo: Repository<CommitteeMember>,
  ) {}

  findAll(): Promise<Committee[]> {
    return this.committeeRepo.find({
      relations: { members: { user: true } },
      select: { members: { id: true, designation: true, sortOrder: true, note: true, user: USER_SELECT } },
      order: { isCurrent: 'DESC', sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Committee> {
    const c = await this.committeeRepo.findOne({
      where: { id },
      relations: { members: { user: true } },
      select: { members: { id: true, designation: true, sortOrder: true, note: true, user: USER_SELECT } },
    });
    if (!c) throw new NotFoundException('Committee not found.');
    return c;
  }

  async create(dto: CreateCommitteeDto): Promise<Committee> {
    if (dto.isCurrent) {
      await this.committeeRepo.createQueryBuilder()
        .update().set({ isCurrent: false }).where('1=1').execute();
    }
    const c = this.committeeRepo.create({
      term: dto.term,
      sessionLabel: dto.sessionLabel,
      isCurrent: dto.isCurrent ?? false,
      theme: dto.theme ?? null,
      sortOrder: dto.sortOrder ?? 0,
    });
    const saved = await this.committeeRepo.save(c);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateCommitteeDto): Promise<Committee> {
    const c = await this.committeeRepo.findOneOrFail({ where: { id } });
    if (dto.isCurrent) {
      await this.committeeRepo.createQueryBuilder()
        .update().set({ isCurrent: false }).where('1=1').execute();
    }
    Object.assign(c, {
      ...(dto.term !== undefined && { term: dto.term }),
      ...(dto.sessionLabel !== undefined && { sessionLabel: dto.sessionLabel }),
      ...(dto.isCurrent !== undefined && { isCurrent: dto.isCurrent }),
      ...(dto.theme !== undefined && { theme: dto.theme }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
    });
    await this.committeeRepo.save(c);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const c = await this.committeeRepo.findOneOrFail({ where: { id } });
    await this.committeeRepo.remove(c);
  }

  async addMember(committeeId: string, dto: AddCommitteeMemberDto): Promise<CommitteeMember> {
    await this.findOne(committeeId);
    const m = this.memberRepo.create({
      committeeId,
      userId: dto.userId,
      designation: dto.designation,
      sortOrder: dto.sortOrder ?? 0,
      note: dto.note ?? null,
    });
    const saved = await this.memberRepo.save(m);
    return this.memberRepo.findOne({ where: { id: saved.id }, relations: { user: true } }) as Promise<CommitteeMember>;
  }

  async updateMember(memberId: string, dto: UpdateCommitteeMemberDto): Promise<CommitteeMember> {
    const m = await this.memberRepo.findOneOrFail({ where: { id: memberId } });
    Object.assign(m, {
      ...(dto.designation !== undefined && { designation: dto.designation }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      ...(dto.note !== undefined && { note: dto.note }),
    });
    await this.memberRepo.save(m);
    return this.memberRepo.findOne({ where: { id: memberId }, relations: { user: true } }) as Promise<CommitteeMember>;
  }

  async removeMember(memberId: string): Promise<void> {
    const m = await this.memberRepo.findOneOrFail({ where: { id: memberId } });
    await this.memberRepo.remove(m);
  }
}
