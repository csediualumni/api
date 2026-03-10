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
import { NewsService } from './news.service';
import type { NewsCategory } from '../entities/news-article.entity';

const CATEGORIES: NewsCategory[] = [
  'Announcement',
  'Achievement',
  'Events',
  'Research',
  'Career',
  'Community',
];

// ── DTOs ─────────────────────────────────────────────────────────

class CreateNewsArticleDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() summary: string;
  @IsString() @IsNotEmpty() body: string;
  @IsString() @IsIn(CATEGORIES) category: NewsCategory;
  @IsString() @IsNotEmpty() author: string;
  @IsString() @IsNotEmpty() date: string;
  @IsString() @IsNotEmpty() readTime: string;
  @IsString() @IsNotEmpty() icon: string;
  @IsString() @IsNotEmpty() color: string;
  @IsBoolean() @IsOptional() pinned?: boolean;
  @IsBoolean() @IsOptional() featured?: boolean;
  @IsInt() @Min(0) @IsOptional() sortOrder?: number;
}

class UpdateNewsArticleDto {
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() summary?: string;
  @IsString() @IsOptional() body?: string;
  @IsString() @IsIn(CATEGORIES) @IsOptional() category?: NewsCategory;
  @IsString() @IsOptional() author?: string;
  @IsString() @IsOptional() date?: string;
  @IsString() @IsOptional() readTime?: string;
  @IsString() @IsOptional() icon?: string;
  @IsString() @IsOptional() color?: string;
  @IsBoolean() @IsOptional() pinned?: boolean;
  @IsBoolean() @IsOptional() featured?: boolean;
  @IsInt() @Min(0) @IsOptional() sortOrder?: number;
}

// ── Controller ───────────────────────────────────────────────────

@Controller('news')
export class NewsController {
  constructor(private readonly news: NewsService) {}

  // ── Public ────────────────────────────────────────────────────

  @Get()
  findAll() {
    return this.news.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.news.findById(id);
  }

  // ── Admin ─────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.NEWS_WRITE)
  create(@Body() dto: CreateNewsArticleDto) {
    return this.news.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.NEWS_WRITE)
  update(@Param('id') id: string, @Body() dto: UpdateNewsArticleDto) {
    return this.news.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.NEWS_WRITE)
  remove(@Param('id') id: string) {
    return this.news.remove(id);
  }
}
