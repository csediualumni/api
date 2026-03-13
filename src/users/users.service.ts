import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import {
  IsBoolean, IsInt, IsOptional, IsString, IsArray, Max, Min,
} from 'class-validator';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user-role.entity';
import { Role } from '../entities/role.entity';
import { UserExperience } from '../entities/user-experience.entity';
import { UserEducation } from '../entities/user-education.entity';
import { UserAchievement } from '../entities/user-achievement.entity';
import { Event } from '../entities/event.entity';
import { MemberIdCounter } from '../entities/member-id-counter.entity';

export type SafeUser = Omit<User, 'password' | 'generateId'>;

export class UpdateProfileDto {
  @IsOptional() @IsString()  displayName?: string;
  @IsOptional() @IsString()  phone?: string;
  @IsOptional() @IsInt() @Min(1970) @Max(2100) batch?: number;
  @IsOptional() @IsString()  bio?: string;
  @IsOptional() @IsString()  jobTitle?: string;
  @IsOptional() @IsString()  company?: string;
  @IsOptional() @IsString()  industry?: string;
  @IsOptional() @IsString()  city?: string;
  @IsOptional() @IsString()  country?: string;
  @IsOptional() @IsString()  linkedin?: string;
  @IsOptional() @IsString()  github?: string;
  @IsOptional() @IsString()  twitter?: string;
  @IsOptional() @IsString()  website?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @IsOptional() @IsBoolean() openToMentoring?: boolean;
  @IsOptional() @IsBoolean() profileVisibility?: boolean;
}

export interface UpsertExperienceDto {
  title: string;
  company: string;
  from: string;
  to: string;
  sortOrder?: number;
}

export interface UpsertEducationDto {
  degree: string;
  institution: string;
  year?: number | null;
  sortOrder?: number;
}

export interface UpsertAchievementDto {
  title: string;
  sortOrder?: number;
}

export type UserWithPermissions = SafeUser & {
  permissions: string[];
  roles: { id: string; name: string }[];
};

export interface ImportMemberRow {
  email?: string | number;
  displayName?: string;
  batch?: string | number;
  phone?: string;
  jobTitle?: string;
  company?: string;
  industry?: string;
  city?: string;
  country?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  website?: string;
  [key: string]: unknown;
}

export interface BulkImportResult {
  created: number;
  updated: number;
  errors: { row: number; email: string; reason: string }[];
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(UserExperience)
    private readonly expRepo: Repository<UserExperience>,
    @InjectRepository(UserEducation)
    private readonly eduRepo: Repository<UserEducation>,
    @InjectRepository(UserAchievement)
    private readonly achRepo: Repository<UserAchievement>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(MemberIdCounter)
    private readonly memberIdCounterRepo: Repository<MemberIdCounter>,
  ) {}

  // ── Finders ─────────────────────────────────────────────────

  async findAll(): Promise<SafeUser[]> {
    const users = await this.userRepo.find({
      relations: { userRoles: { role: true } },
      order: { createdAt: 'ASC' },
    });
    return users.map(({ password: _pw, ...safe }) => safe as SafeUser);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { googleId } });
  }

  findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async setMemberId(userId: string, memberId: string): Promise<void> {
    await this.userRepo.update(userId, { memberId });
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<void> {
    await this.userRepo.update(userId, { avatar: avatarUrl });
  }

  /** Load a user with profile relations (experiences, educations, achievements) */
  async findByIdWithProfile(id: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { id },
      relations: { experiences: true, educations: true, achievements: true },
      order: {
        experiences: { sortOrder: 'ASC' },
        educations: { sortOrder: 'ASC' },
        achievements: { sortOrder: 'ASC' },
      },
    });
  }

  /** Load a user with all their aggregated permissions */
  async findWithPermissions(id: string): Promise<UserWithPermissions | null> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: {
        userRoles: {
          role: {
            permissions: { permission: true },
          },
        },
      },
    });
    if (!user) return null;

    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.key),
        ),
      ),
    ];

    const roles = user.userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
    }));

    const { password: _pw, ...safe } = user;
    return { ...safe, permissions, roles };
  }

  // ── Creators ─────────────────────────────────────────────────

  async createWithPassword(
    email: string,
    hashedPassword: string,
  ): Promise<User> {
    const user = this.userRepo.create({ email, password: hashedPassword });
    return this.userRepo.save(user);
  }

  async createWithGoogle(data: {
    email: string;
    googleId: string;
    displayName?: string;
    avatar?: string;
  }): Promise<User> {
    const user = this.userRepo.create(data);
    return this.userRepo.save(user);
  }

  /**
   * Looks up the 'guest' system role and assigns it to the given user.
   * Called after every new registration (email/password and Google OAuth).
   * Safe to call even if the guest role doesn't exist yet (logs a warning).
   */
  async assignGuestRole(userId: string): Promise<void> {
    const guestRole = await this.roleRepo.findOne({ where: { name: 'guest' } });
    if (!guestRole) {
      this.logger.warn(
        'assignGuestRole: guest role not found in DB — skipping',
      );
      return;
    }
    const exists = await this.userRoleRepo.findOne({
      where: { userId, roleId: guestRole.id },
    });
    if (!exists) {
      await this.userRoleRepo.save({ userId, roleId: guestRole.id });
    }
  }

  async connectGoogle(
    id: string,
    data: { googleId: string; displayName?: string; avatar?: string },
  ): Promise<User> {
    await this.userRepo.update(id, data);
    return this.userRepo.findOneOrFail({ where: { id } });
  }

  // ── Profile update ────────────────────────────────────────────

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<SafeUser> {
    await this.userRepo.update(id, dto);
    const user = await this.userRepo.findOneOrFail({ where: { id } });
    const { password: _pw, ...safe } = user;
    return safe as SafeUser;
  }

  // ── Experience CRUD ────────────────────────────────────────

  async addExperience(
    userId: string,
    dto: UpsertExperienceDto,
  ): Promise<UserExperience> {
    const entry = this.expRepo.create({ ...dto, userId });
    return this.expRepo.save(entry);
  }

  async updateExperience(
    userId: string,
    id: string,
    dto: UpsertExperienceDto,
  ): Promise<UserExperience> {
    const entry = await this.expRepo.findOne({ where: { id, userId } });
    if (!entry) throw new NotFoundException('Experience entry not found');
    await this.expRepo.save({ ...entry, ...dto });
    return this.expRepo.findOneOrFail({ where: { id } });
  }

  async deleteExperience(userId: string, id: string): Promise<void> {
    const entry = await this.expRepo.findOne({ where: { id, userId } });
    if (!entry) throw new NotFoundException('Experience entry not found');
    await this.expRepo.remove(entry);
  }

  // ── Education CRUD ─────────────────────────────────────────

  async addEducation(
    userId: string,
    dto: UpsertEducationDto,
  ): Promise<UserEducation> {
    const entry = this.eduRepo.create({
      ...dto,
      year: dto.year ?? null,
      userId,
    });
    return this.eduRepo.save(entry);
  }

  async updateEducation(
    userId: string,
    id: string,
    dto: UpsertEducationDto,
  ): Promise<UserEducation> {
    const entry = await this.eduRepo.findOne({ where: { id, userId } });
    if (!entry) throw new NotFoundException('Education entry not found');
    await this.eduRepo.save({ ...entry, ...dto, year: dto.year ?? null });
    return this.eduRepo.findOneOrFail({ where: { id } });
  }

  async deleteEducation(userId: string, id: string): Promise<void> {
    const entry = await this.eduRepo.findOne({ where: { id, userId } });
    if (!entry) throw new NotFoundException('Education entry not found');
    await this.eduRepo.remove(entry);
  }

  // ── Achievement CRUD ───────────────────────────────────────

  async addAchievement(
    userId: string,
    dto: UpsertAchievementDto,
  ): Promise<UserAchievement> {
    const entry = this.achRepo.create({ ...dto, userId });
    return this.achRepo.save(entry);
  }

  async updateAchievement(
    userId: string,
    id: string,
    dto: UpsertAchievementDto,
  ): Promise<UserAchievement> {
    const entry = await this.achRepo.findOne({ where: { id, userId } });
    if (!entry) throw new NotFoundException('Achievement entry not found');
    await this.achRepo.save({ ...entry, ...dto });
    return this.achRepo.findOneOrFail({ where: { id } });
  }

  async deleteAchievement(userId: string, id: string): Promise<void> {
    const entry = await this.achRepo.findOne({ where: { id, userId } });
    if (!entry) throw new NotFoundException('Achievement entry not found');
    await this.achRepo.remove(entry);
  }

  // ── Role assignment ──────────────────────────────────────────

  async setRoles(userId: string, roleIds: string[]): Promise<SafeUser> {
    // Prevent removing the member role from a user who already has a memberId
    const memberRole = await this.roleRepo.findOne({ where: { name: 'member' } });
    if (memberRole && !roleIds.includes(memberRole.id)) {
      const userCheck = await this.userRepo.findOne({ where: { id: userId } });
      if (userCheck?.memberId) {
        throw new Error('Cannot remove the member role from a user who has an assigned member ID.');
      }
    }
    await this.userRoleRepo.delete({ userId });
    if (roleIds.length > 0) {
      await this.userRoleRepo.save(
        roleIds.map((roleId) => ({ userId, roleId })),
      );
    }
    // Auto-generate memberId when the 'member' role is included and the user doesn't have one yet
    if (roleIds.length > 0) {
      const memberRole = await this.roleRepo.findOne({ where: { name: 'member' } });
      if (memberRole && roleIds.includes(memberRole.id)) {
        const userCheck = await this.userRepo.findOne({ where: { id: userId } });
        if (userCheck && !userCheck.memberId) {
          const memberId = await this.nextMemberIdForYear(new Date().getFullYear());
          await this.userRepo.update(userId, { memberId, profileVisibility: true });
        }
      }
    }
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    const { password: _pw, ...safe } = user;
    return safe as SafeUser;
  }

  async addRole(userId: string, roleId: string): Promise<SafeUser> {
    await this.userRoleRepo.save({ userId, roleId });
    // Auto-generate memberId when the 'member' role is assigned and the user doesn't have one yet
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (role?.name === 'member') {
      const userCheck = await this.userRepo.findOne({ where: { id: userId } });
      if (userCheck && !userCheck.memberId) {
        const memberId = await this.nextMemberIdForYear(new Date().getFullYear());
        await this.userRepo.update(userId, { memberId, profileVisibility: true });
      }
    }
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    const { password: _pw, ...safe } = user;
    return safe as SafeUser;
  }

  async removeRole(userId: string, roleId: string): Promise<SafeUser> {
    // Prevent stripping the member role once a memberId has been issued
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (role?.name === 'member') {
      const userCheck = await this.userRepo.findOne({ where: { id: userId } });
      if (userCheck?.memberId) {
        throw new Error('Cannot remove the member role from a user who has an assigned member ID.');
      }
    }
    await this.userRoleRepo.delete({ userId, roleId });
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    const { password: _pw, ...safe } = user;
    return safe as SafeUser;
  }

  // ── Bulk member import ───────────────────────────────────────

  async bulkImportMembers(rows: ImportMemberRow[]): Promise<BulkImportResult> {
    const memberRole = await this.roleRepo.findOne({
      where: { name: 'member' },
    });
    if (!memberRole)
      throw new Error(
        '"member" role not found in database — run the seeder first',
      );

    let created = 0;
    let updated = 0;
    const errors: BulkImportResult['errors'] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-based row number accounting for header

      const rawEmail = String(row.email ?? '')
        .trim()
        .toLowerCase();
      if (!rawEmail || !rawEmail.includes('@')) {
        errors.push({
          row: rowNum,
          email: rawEmail,
          reason: 'Missing or invalid email',
        });
        continue;
      }
      if (!row.displayName || String(row.displayName).trim() === '') {
        errors.push({
          row: rowNum,
          email: rawEmail,
          reason: 'Missing displayName',
        });
        continue;
      }
      if (row.batch == null || String(row.batch).trim() === '') {
        errors.push({
          row: rowNum,
          email: rawEmail,
          reason: 'Missing batch (graduation year)',
        });
        continue;
      }
      const batchNum = Number(row.batch);
      if (isNaN(batchNum)) {
        errors.push({
          row: rowNum,
          email: rawEmail,
          reason: `Invalid batch "${row.batch}" — must be a numeric year`,
        });
        continue;
      }

      const profileFields: Partial<User> = {
        displayName: String(row.displayName).trim(),
        batch: batchNum,
        ...(row.phone ? { phone: String(row.phone).trim() } : {}),
        ...(row.jobTitle ? { jobTitle: String(row.jobTitle).trim() } : {}),
        ...(row.company ? { company: String(row.company).trim() } : {}),
        ...(row.industry ? { industry: String(row.industry).trim() } : {}),
        ...(row.city ? { city: String(row.city).trim() } : {}),
        ...(row.country ? { country: String(row.country).trim() } : {}),
        ...(row.linkedin ? { linkedin: String(row.linkedin).trim() } : {}),
        ...(row.github ? { github: String(row.github).trim() } : {}),
        ...(row.twitter ? { twitter: String(row.twitter).trim() } : {}),
        ...(row.website ? { website: String(row.website).trim() } : {}),
      };

      try {
        let user = await this.userRepo.findOne({ where: { email: rawEmail } });
        if (!user) {
          user = await this.userRepo.save(
            this.userRepo.create({
              email: rawEmail,
              password: null,
              ...profileFields,
            }),
          );
          created++;
        } else {
          await this.userRepo.update(user.id, profileFields);
          updated++;
        }

        // Ensure member role is assigned
        const hasRole = await this.userRoleRepo.findOne({
          where: { userId: user.id, roleId: memberRole.id },
        });
        if (!hasRole) {
          await this.userRoleRepo.save({
            userId: user.id,
            roleId: memberRole.id,
          });
        }

        // Ensure every imported member has a memberId (covers new users and
        // existing users who were previously missing one)
        if (!user.memberId) {
          const memberId = await this.nextMemberIdForYear(new Date().getFullYear());
          await this.userRepo.update(user.id, { memberId });
          user.memberId = memberId;
        }
      } catch (err: unknown) {
        errors.push({
          row: rowNum,
          email: rawEmail,
          reason: err instanceof Error ? err.message : 'Unexpected error',
        });
      }
    }

    return { created, updated, errors };
  }

  // ── Member ID generation ─────────────────────────────────────

  /**
   * Returns the next sequential member ID for the current year.
   * Uses an atomic `INSERT … ON CONFLICT DO UPDATE … RETURNING` against
   * the `member_id_counter` table so no application-level locking or
   * retry logic is required — Postgres serialises concurrent updates to
   * the same row automatically.
   */
  private async nextMemberIdForYear(year: number): Promise<string> {
    const prefix = `CSEDIU-${year}-`;
    const result = await this.memberIdCounterRepo.manager.query<
      [{ last_seq: number }]
    >(
      `INSERT INTO member_id_counter (year, last_seq)
       VALUES ($1, 1)
       ON CONFLICT (year)
       DO UPDATE SET last_seq = member_id_counter.last_seq + 1
       RETURNING last_seq`,
      [year],
    );
    const seq = result[0].last_seq;
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  /** Assigns the next available member ID to the given user (self-service flow). */
  async assignMemberId(userId: string): Promise<string> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.memberId) throw new BadRequestException('User already has a member ID');

    const memberId = await this.nextMemberIdForYear(new Date().getFullYear());
    await this.userRepo.update(userId, { memberId });
    return memberId;
  }

  // ── Password reset ───────────────────────────────────────────

  async setResetToken(
    userId: string,
    token: string,
    expiry: Date,
  ): Promise<void> {
    await this.userRepo.update(userId, {
      resetToken: token,
      resetTokenExpiry: expiry,
    });
  }

  findByResetToken(token: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { resetToken: token } });
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.userRepo.update(userId, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    });
  }

  // ── Public stats ────────────────────────────────────────────

  async getStats(): Promise<{
    alumniCount: number;
    batchCount: number;
    countryCount: number;
    eventsHosted: number;
  }> {
    const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@csediualumni.com';

    const [alumniCount, batchResult, countryResult, eventsHosted] =
      await Promise.all([
        this.userRepo.count({ where: { email: Not(adminEmail) } }),
        this.userRepo
          .createQueryBuilder('u')
          .select('COUNT(DISTINCT u.batch)', 'count')
          .where('u.email != :admin', { admin: adminEmail })
          .andWhere('u.batch IS NOT NULL')
          .getRawOne<{ count: string }>(),
        this.userRepo
          .createQueryBuilder('u')
          .select('COUNT(DISTINCT u.country)', 'count')
          .where('u.email != :admin', { admin: adminEmail })
          .andWhere('u.country IS NOT NULL')
          .getRawOne<{ count: string }>(),
        this.eventRepo.count(),
      ]);

    return {
      alumniCount,
      batchCount: parseInt(batchResult?.count ?? '0', 10),
      countryCount: parseInt(countryResult?.count ?? '0', 10),
      eventsHosted,
    };
  }

  // ── Public directory ────────────────────────────────────────

  async findPublicAlumni(): Promise<PublicAlumnusDto[]> {
    const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@csediualumni.com';
    const users = await this.userRepo.find({
      where: { email: Not(adminEmail), profileVisibility: true },
      relations: { experiences: true, educations: true, achievements: true },
      order: {
        createdAt: 'ASC',
        experiences: { sortOrder: 'ASC' },
        educations: { sortOrder: 'ASC' },
        achievements: { sortOrder: 'ASC' },
      },
    });
    return users.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      avatar: u.avatar,
      email: u.email,
      memberId: u.memberId ?? null,
      batch: u.batch,
      bio: u.bio,
      jobTitle: u.jobTitle,
      company: u.company,
      industry: u.industry,
      city: u.city,
      country: u.country,
      linkedin: u.linkedin,
      github: u.github,
      twitter: u.twitter,
      website: u.website,
      openToMentoring: u.openToMentoring,
      profileVisibility: u.profileVisibility,
      skills: u.skills,
      experiences: (u.experiences ?? []).map((e) => ({
        id: e.id,
        title: e.title,
        company: e.company,
        from: e.from,
        to: e.to,
      })),
      educations: (u.educations ?? []).map((e) => ({
        id: e.id,
        degree: e.degree,
        institution: e.institution,
        year: e.year,
      })),
      achievements: (u.achievements ?? []).map((a) => ({
        id: a.id,
        title: a.title,
      })),
      createdAt: u.createdAt,
    }));
  }
}

export interface PublicAlumnusDto {
  id: string;
  displayName: string | null;
  avatar: string | null;
  email: string;
  memberId: string | null;
  batch: number | null;
  bio: string | null;
  jobTitle: string | null;
  company: string | null;
  industry: string | null;
  city: string | null;
  country: string | null;
  linkedin: string | null;
  github: string | null;
  twitter: string | null;
  website: string | null;
  openToMentoring: boolean;
  profileVisibility: boolean;
  skills: string[] | null;
  experiences: {
    id: string;
    title: string;
    company: string;
    from: string;
    to: string;
  }[];
  educations: {
    id: string;
    degree: string;
    institution: string;
    year: number | null;
  }[];
  achievements: { id: string; title: string }[];
  createdAt: Date;
}
