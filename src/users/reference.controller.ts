import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Department } from '../entities/department.entity';
import { AcademicShift } from '../entities/academic-shift.entity';
import { AcademicSession } from '../entities/academic-session.entity';

class CreateReferenceDto {
  name: string;
  sortOrder?: number;
}

@Controller('reference')
export class ReferenceController {
  constructor(
    @InjectRepository(Department) private readonly deptRepo: Repository<Department>,
    @InjectRepository(AcademicShift) private readonly shiftRepo: Repository<AcademicShift>,
    @InjectRepository(AcademicSession) private readonly sessionRepo: Repository<AcademicSession>,
  ) {}

  // ── Departments ────────────────────────────────────────────────

  @Get('departments')
  listDepartments(@Query('q') q?: string) {
    if (q) return this.deptRepo.find({ where: { name: ILike(`%${q}%`) }, order: { sortOrder: 'ASC', name: 'ASC' } });
    return this.deptRepo.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  @Post('departments')
  createDepartment(@Body() dto: CreateReferenceDto) {
    const dept = this.deptRepo.create({ name: dto.name, sortOrder: dto.sortOrder ?? 0 });
    return this.deptRepo.save(dept);
  }

  @Patch('departments/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('users:write')
  async updateDepartment(@Param('id') id: string, @Body() dto: Partial<CreateReferenceDto>) {
    const dept = await this.deptRepo.findOneBy({ id });
    if (!dept) throw new NotFoundException('Department not found');
    Object.assign(dept, dto);
    return this.deptRepo.save(dept);
  }

  @Delete('departments/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('users:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDepartment(@Param('id') id: string) {
    await this.deptRepo.delete(id);
  }

  // ── Academic Shifts ────────────────────────────────────────────

  @Get('shifts')
  listShifts() {
    return this.shiftRepo.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  @Post('shifts')
  createShift(@Body() dto: CreateReferenceDto) {
    const shift = this.shiftRepo.create({ name: dto.name, sortOrder: dto.sortOrder ?? 0 });
    return this.shiftRepo.save(shift);
  }

  @Delete('shifts/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('users:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteShift(@Param('id') id: string) {
    await this.shiftRepo.delete(id);
  }

  // ── Academic Sessions ──────────────────────────────────────────

  @Get('sessions')
  listSessions(@Query('q') q?: string) {
    if (q) return this.sessionRepo.find({ where: { name: ILike(`%${q}%`) }, order: { sortOrder: 'ASC', name: 'DESC' } });
    return this.sessionRepo.find({ order: { sortOrder: 'ASC', name: 'DESC' } });
  }

  @Post('sessions')
  createSession(@Body() dto: CreateReferenceDto) {
    const sess = this.sessionRepo.create({ name: dto.name, sortOrder: dto.sortOrder ?? 0 });
    return this.sessionRepo.save(sess);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('users:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSession(@Param('id') id: string) {
    await this.sessionRepo.delete(id);
  }
}
