import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user-role.entity';
import { Role } from '../entities/role.entity';
import { UserExperience } from '../entities/user-experience.entity';
import { UserEducation } from '../entities/user-education.entity';
import { UserAchievement } from '../entities/user-achievement.entity';

export type SafeUser = Omit<User, 'password' | 'generateId'>;

export interface UpdateProfileDto {
  displayName?: string;
  phone?: string;
  batch?: number;
  bio?: string;
  jobTitle?: string;
  company?: string;
  industry?: string;
  city?: string;
  country?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  website?: string;
  skills?: string[];
  openToMentoring?: boolean;
  profileVisibility?: boolean;
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
      this.logger.warn('assignGuestRole: guest role not found in DB — skipping');
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
    await this.userRoleRepo.delete({ userId });
    if (roleIds.length > 0) {
      await this.userRoleRepo.save(
        roleIds.map((roleId) => ({ userId, roleId })),
      );
    }
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    const { password: _pw, ...safe } = user;
    return safe as SafeUser;
  }

  async addRole(userId: string, roleId: string): Promise<SafeUser> {
    await this.userRoleRepo.save({ userId, roleId });
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    const { password: _pw, ...safe } = user;
    return safe as SafeUser;
  }

  async removeRole(userId: string, roleId: string): Promise<SafeUser> {
    await this.userRoleRepo.delete({ userId, roleId });
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    const { password: _pw, ...safe } = user;
    return safe as SafeUser;
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

    const [alumniCount, batchResult, countryResult] = await Promise.all([
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
    ]);

    const eventsHosted = parseInt(
      process.env.STAT_EVENTS_HOSTED ?? '200',
      10,
    );

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
