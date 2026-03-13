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
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';
import { MentorshipService } from './mentorship.service';
import type { ApplicationStatus } from '../entities/mentor-application.entity';

// ── DTOs ──────────────────────────────────────────────────────────

class CreateMentorDto {
  @IsString() @IsNotEmpty() name: string;
  @IsInt() @Min(1990) batch: number;
  @IsString() @IsNotEmpty() role: string;
  @IsString() @IsNotEmpty() company: string;
  @IsString() @IsNotEmpty() country: string;
  @IsString() @IsNotEmpty() city: string;
  @IsString() @IsOptional() initials?: string;
  @IsString() @IsOptional() color?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() expertise?: string[];
  @IsString() @IsNotEmpty() bio: string;
  @IsString() @IsNotEmpty() availability: string;
  @IsInt() @Min(0) @IsOptional() mentees?: number;
  @IsNumber() @Min(0) @Max(5) @IsOptional() rating?: number;
  @IsBoolean() @IsOptional() featured?: boolean;
}

class UpdateMentorDto {
  @IsString() @IsOptional() name?: string;
  @IsInt() @Min(1990) @IsOptional() batch?: number;
  @IsString() @IsOptional() role?: string;
  @IsString() @IsOptional() company?: string;
  @IsString() @IsOptional() country?: string;
  @IsString() @IsOptional() city?: string;
  @IsString() @IsOptional() initials?: string;
  @IsString() @IsOptional() color?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() expertise?: string[];
  @IsString() @IsOptional() bio?: string;
  @IsString() @IsOptional() availability?: string;
  @IsInt() @Min(0) @IsOptional() mentees?: number;
  @IsNumber() @Min(0) @Max(5) @IsOptional() rating?: number;
  @IsBoolean() @IsOptional() featured?: boolean;
}

class ApplyMentorshipDto {
  @IsString() @IsNotEmpty() name: string;
  @IsEmail() email: string;
  @IsInt() @Min(1990) @IsOptional() batch?: number;
  @IsString() @IsNotEmpty() area: string;
  @IsString() @IsNotEmpty() goals: string;
  @IsString() @IsOptional() type?: string;
}

class UpdateApplicationStatusDto {
  @IsString() @IsNotEmpty() status: ApplicationStatus;
}

// ── Controller ────────────────────────────────────────────────────

@Controller('mentors')
export class MentorshipController {
  constructor(private readonly mentorship: MentorshipService) {}

  // ── Public ────────────────────────────────────────────────────

  @Get()
  findAll() {
    return this.mentorship.findAllMentors();
  }

  /** Get the current user's own mentor/mentee application by their email */
  @Get('my-application')
  @UseGuards(JwtAuthGuard)
  getMyApplication(@Req() req: Request) {
    const { email } = req.user as { email: string };
    return this.mentorship.findMyApplication(email);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mentorship.findMentorById(id);
  }

  @Post('apply')
  @HttpCode(HttpStatus.CREATED)
  apply(@Body() dto: ApplyMentorshipDto) {
    return this.mentorship.apply(dto);
  }

  // ── Admin ─────────────────────────────────────────────────────

  @Get('admin/applications')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.MENTORS_READ)
  listApplications() {
    return this.mentorship.findAllApplications();
  }

  @Patch('admin/applications/:id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.MENTORS_WRITE)
  updateApplicationStatus(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.mentorship.updateApplicationStatus(id, dto.status as ApplicationStatus);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.MENTORS_WRITE)
  create(@Body() dto: CreateMentorDto) {
    return this.mentorship.createMentor(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.MENTORS_WRITE)
  update(@Param('id') id: string, @Body() dto: UpdateMentorDto) {
    return this.mentorship.updateMentor(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.MENTORS_WRITE)
  remove(@Param('id') id: string) {
    return this.mentorship.removeMentor(id);
  }
}
