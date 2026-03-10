import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';
import { JobsService } from './jobs.service';
import type { JobType } from '../entities/job-posting.entity';

const JOB_TYPES: JobType[] = ['Full-time', 'Part-time', 'Internship', 'Remote', 'Contract'];

// ── DTOs ──────────────────────────────────────────────────────────

class CreateJobPostingDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() company: string;
  @IsString() @IsNotEmpty() location: string;
  @IsString() @IsNotEmpty() country: string;
  @IsString() @IsIn(JOB_TYPES) type: JobType;
  @IsString() @IsNotEmpty() industry: string;
  @IsString() @IsNotEmpty() experience: string;
  @IsString() @IsOptional() salary?: string;
  @IsString() @IsNotEmpty() posted: string;
  @IsString() @IsNotEmpty() deadline: string;
  @IsString() @IsNotEmpty() description: string;
  @IsArray() @IsString({ each: true }) @IsOptional() skills?: string[];
  @IsBoolean() @IsOptional() featured?: boolean;
  @IsString() @IsOptional() postedById?: string;
}

class UpdateJobPostingDto {
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() company?: string;
  @IsString() @IsOptional() location?: string;
  @IsString() @IsOptional() country?: string;
  @IsString() @IsIn(JOB_TYPES) @IsOptional() type?: JobType;
  @IsString() @IsOptional() industry?: string;
  @IsString() @IsOptional() experience?: string;
  @IsString() @IsOptional() salary?: string;
  @IsString() @IsOptional() posted?: string;
  @IsString() @IsOptional() deadline?: string;
  @IsString() @IsOptional() description?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() skills?: string[];
  @IsBoolean() @IsOptional() featured?: boolean;
  @IsString() @IsOptional() postedById?: string;
}

// ── Controller ────────────────────────────────────────────────────

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  // Public
  @Get()
  findAll() {
    return this.jobs.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobs.findById(id);
  }

  // Admin
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.JOBS_WRITE)
  create(@Body() dto: CreateJobPostingDto) {
    return this.jobs.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.JOBS_WRITE)
  update(@Param('id') id: string, @Body() dto: UpdateJobPostingDto) {
    return this.jobs.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.JOBS_WRITE)
  remove(@Param('id') id: string) {
    return this.jobs.remove(id);
  }
}
