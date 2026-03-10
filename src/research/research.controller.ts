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
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';
import { ResearchService } from './research.service';
import type { VenueType } from '../entities/research-paper.entity';

const VENUE_TYPES: VenueType[] = ['journal', 'conference', 'preprint'];

// ── DTOs ──────────────────────────────────────────────────────────

class CreateResearchPaperDto {
  @IsString() @IsNotEmpty() title: string;
  @IsArray() @IsString({ each: true }) authors: string[];
  @IsString() @IsNotEmpty() abstract: string;
  @IsInt() @Min(1900) year: number;
  @IsString() @IsNotEmpty() venue: string;
  @IsString() @IsIn(VENUE_TYPES) venueType: VenueType;
  @IsArray() @IsString({ each: true }) @IsOptional() tags?: string[];
  @IsString() @IsOptional() doi?: string;
  @IsString() @IsNotEmpty() link: string;
  @IsInt() @Min(0) @IsOptional() citations?: number;
  @IsBoolean() @IsOptional() featured?: boolean;
}

class UpdateResearchPaperDto {
  @IsString() @IsOptional() title?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() authors?: string[];
  @IsString() @IsOptional() abstract?: string;
  @IsInt() @Min(1900) @IsOptional() year?: number;
  @IsString() @IsOptional() venue?: string;
  @IsString() @IsIn(VENUE_TYPES) @IsOptional() venueType?: VenueType;
  @IsArray() @IsString({ each: true }) @IsOptional() tags?: string[];
  @IsString() @IsOptional() doi?: string;
  @IsString() @IsOptional() link?: string;
  @IsInt() @Min(0) @IsOptional() citations?: number;
  @IsBoolean() @IsOptional() featured?: boolean;
}

// ── Controller ────────────────────────────────────────────────────

@Controller('research')
export class ResearchController {
  constructor(private readonly research: ResearchService) {}

  // Public
  @Get()
  findAll() {
    return this.research.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.research.findById(id);
  }

  // Admin
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.RESEARCH_WRITE)
  create(@Body() dto: CreateResearchPaperDto) {
    return this.research.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.RESEARCH_WRITE)
  update(@Param('id') id: string, @Body() dto: UpdateResearchPaperDto) {
    return this.research.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.RESEARCH_WRITE)
  remove(@Param('id') id: string) {
    return this.research.remove(id);
  }
}
