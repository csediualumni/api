import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Committee } from '../entities/committee.entity';
import { CommitteeMember } from '../entities/committee-member.entity';
import { DesignationRoleMapping } from '../entities/designation-role-mapping.entity';
import { UserRole } from '../entities/user-role.entity';

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

export class SetDesignationMappingDto {
  @IsString() @IsNotEmpty() designation!: string;
  @IsUUID() roleId!: string;
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

    @InjectRepository(DesignationRoleMapping)
    private readonly mappingRepo: Repository<DesignationRoleMapping>,

    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
  ) {}

  // ── Role sync helpers ──────────────────────────────────────────────

  /**
   * Looks up the role mapped to `designation`, then grants or revokes it.
   * Safe to call multiple times (upsert-safe, ignores NOT FOUND on revoke).
   */
  private async syncRole(userId: string, designation: string, grant: boolean): Promise<void> {
    const mapping = await this.mappingRepo.findOne({ where: { designation } });
    if (!mapping?.roleId) return; // no mapping configured → nothing to do

    if (grant) {
      // Upsert: save() will insert or ignore duplicate
      const existing = await this.userRoleRepo.findOne({
        where: { userId, roleId: mapping.roleId },
      });
      if (!existing) {
        await this.userRoleRepo.save({ userId, roleId: mapping.roleId });
      }
    } else {
      // Only revoke if the user has no OTHER active current-committee membership
      // with the same designation (edge case: same person on two committees)
      const otherActive = await this.memberRepo
        .createQueryBuilder('m')
        .innerJoin('m.committee', 'c', 'c.is_current = true')
        .where('m.user_id = :userId', { userId })
        .andWhere('m.designation = :designation', { designation })
        .getCount();

      if (otherActive === 0) {
        await this.userRoleRepo.delete({ userId, roleId: mapping.roleId });
      }
    }
  }

  /** Grant roles for all members of a committee. */
  private async grantAllMemberRoles(committee: Committee): Promise<void> {
    const members = await this.memberRepo.find({ where: { committeeId: committee.id } });
    await Promise.all(members.map((m) => this.syncRole(m.userId, m.designation, true)));
  }

  /** Revoke roles for all members of a committee. */
  private async revokeAllMemberRoles(committee: Committee): Promise<void> {
    const members = await this.memberRepo.find({ where: { committeeId: committee.id } });
    await Promise.all(members.map((m) => this.syncRole(m.userId, m.designation, false)));
  }

  // ── Committee CRUD ─────────────────────────────────────────────────

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
      // Retire current committee first, revoking their roles
      const current = await this.committeeRepo.findOne({ where: { isCurrent: true } });
      if (current) await this.revokeAllMemberRoles(current);
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
    const wasCurrentBefore = c.isCurrent;

    if (dto.isCurrent && !wasCurrentBefore) {
      // Retire any existing current committee, revoke their roles
      const current = await this.committeeRepo.findOne({ where: { isCurrent: true } });
      if (current) await this.revokeAllMemberRoles(current);
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

    const updated = await this.committeeRepo.findOneOrFail({ where: { id } });

    // Grant roles when promoted to current; revoke when demoted
    if (!wasCurrentBefore && updated.isCurrent) {
      await this.grantAllMemberRoles(updated);
    } else if (wasCurrentBefore && !updated.isCurrent) {
      await this.revokeAllMemberRoles(updated);
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const c = await this.committeeRepo.findOneOrFail({ where: { id } });
    if (c.isCurrent) await this.revokeAllMemberRoles(c);
    await this.committeeRepo.remove(c);
  }

  // ── Member management ──────────────────────────────────────────────

  async addMember(committeeId: string, dto: AddCommitteeMemberDto): Promise<CommitteeMember> {
    const committee = await this.findOne(committeeId);
    const m = this.memberRepo.create({
      committeeId,
      userId: dto.userId,
      designation: dto.designation,
      sortOrder: dto.sortOrder ?? 0,
      note: dto.note ?? null,
    });
    const saved = await this.memberRepo.save(m);

    // Auto-grant role if this is the current committee
    if (committee.isCurrent) {
      await this.syncRole(dto.userId, dto.designation, true);
    }

    return this.memberRepo.findOne({
      where: { id: saved.id },
      relations: { user: true },
    }) as Promise<CommitteeMember>;
  }

  async updateMember(memberId: string, dto: UpdateCommitteeMemberDto): Promise<CommitteeMember> {
    const m = await this.memberRepo.findOneOrFail({ where: { id: memberId } });
    const committee = await this.committeeRepo.findOneOrFail({ where: { id: m.committeeId } });
    const oldDesignation = m.designation;

    Object.assign(m, {
      ...(dto.designation !== undefined && { designation: dto.designation }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      ...(dto.note !== undefined && { note: dto.note }),
    });
    await this.memberRepo.save(m);

    // If designation changed on a current committee, swap the roles
    if (committee.isCurrent && dto.designation && dto.designation !== oldDesignation) {
      await this.syncRole(m.userId, oldDesignation, false);
      await this.syncRole(m.userId, dto.designation, true);
    }

    return this.memberRepo.findOne({
      where: { id: memberId },
      relations: { user: true },
    }) as Promise<CommitteeMember>;
  }

  async removeMember(memberId: string): Promise<void> {
    const m = await this.memberRepo.findOneOrFail({ where: { id: memberId } });
    const committee = await this.committeeRepo.findOneOrFail({ where: { id: m.committeeId } });
    await this.memberRepo.remove(m);
    if (committee.isCurrent) {
      await this.syncRole(m.userId, m.designation, false);
    }
  }

  // ── Designation → Role mappings ────────────────────────────────────

  listMappings(): Promise<DesignationRoleMapping[]> {
    return this.mappingRepo.find({
      relations: { role: true },
      order: { designation: 'ASC' },
    });
  }

  async setMapping(dto: SetDesignationMappingDto): Promise<DesignationRoleMapping> {
    const existing = await this.mappingRepo.findOne({ where: { designation: dto.designation } });
    if (existing) {
      existing.roleId = dto.roleId;
      return this.mappingRepo.save(existing);
    }
    const m = this.mappingRepo.create({ designation: dto.designation, roleId: dto.roleId });
    const saved = await this.mappingRepo.save(m);
    return this.mappingRepo.findOne({ where: { id: saved.id }, relations: { role: true } }) as Promise<DesignationRoleMapping>;
  }

  async updateMapping(id: string, roleId: string): Promise<DesignationRoleMapping> {
    const m = await this.mappingRepo.findOneOrFail({ where: { id } });
    m.roleId = roleId;
    await this.mappingRepo.save(m);
    return this.mappingRepo.findOne({ where: { id }, relations: { role: true } }) as Promise<DesignationRoleMapping>;
  }

  async removeMapping(id: string): Promise<void> {
    const m = await this.mappingRepo.findOneOrFail({ where: { id } });
    await this.mappingRepo.remove(m);
  }
}

