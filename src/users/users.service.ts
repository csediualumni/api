import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user-role.entity';

export type SafeUser = Omit<User, 'password' | 'generateId'>;

export type UserWithPermissions = SafeUser & {
  permissions: string[];
  roles: { id: string; name: string }[];
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserRole) private readonly userRoleRepo: Repository<UserRole>,
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

  async createWithPassword(email: string, hashedPassword: string): Promise<User> {
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

  async connectGoogle(
    id: string,
    data: { googleId: string; displayName?: string; avatar?: string },
  ): Promise<User> {
    await this.userRepo.update(id, data);
    return this.userRepo.findOneOrFail({ where: { id } });
  }

  // ── Role assignment ──────────────────────────────────────────

  async setRoles(userId: string, roleIds: string[]): Promise<SafeUser> {
    await this.userRoleRepo.delete({ userId });
    if (roleIds.length > 0) {
      await this.userRoleRepo.save(roleIds.map((roleId) => ({ userId, roleId })));
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
}

