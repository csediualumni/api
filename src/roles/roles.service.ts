import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { RolePermission } from '../entities/role-permission.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
  ) {}

  findAll() {
    return this.roleRepo.find({
      relations: { permissions: { permission: true }, userRoles: true },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string) {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: { permissions: { permission: true }, userRoles: true },
    });
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    return role;
  }

  async create(data: { name: string; description?: string }) {
    const existing = await this.roleRepo.findOne({ where: { name: data.name } });
    if (existing) throw new ConflictException(`Role "${data.name}" already exists`);
    const role = this.roleRepo.create(data);
    return this.roleRepo.save(role);
  }

  async update(id: string, data: { name?: string; description?: string }) {
    await this.findOne(id);
    if (data.name) {
      const clash = await this.roleRepo.findOne({
        where: { name: data.name, id: Not(id) },
      });
      if (clash) throw new ConflictException(`Role "${data.name}" already exists`);
    }
    await this.roleRepo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    const role = await this.findOne(id);
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }
    return this.roleRepo.remove(role);
  }

  // ── Permission assignment ──────────────────────────────────

  async setPermissions(roleId: string, permissionIds: string[]) {
    await this.findOne(roleId);
    await this.rolePermissionRepo.delete({ roleId });
    if (permissionIds.length > 0) {
      await this.rolePermissionRepo.save(
        permissionIds.map((permissionId) => ({ roleId, permissionId })),
      );
    }
    return this.findOne(roleId);
  }

  async addPermission(roleId: string, permissionId: string) {
    await this.findOne(roleId);
    await this.rolePermissionRepo.save({ roleId, permissionId });
    return this.findOne(roleId);
  }

  async removePermission(roleId: string, permissionId: string) {
    await this.findOne(roleId);
    await this.rolePermissionRepo.delete({ roleId, permissionId });
    return this.findOne(roleId);
  }
}
