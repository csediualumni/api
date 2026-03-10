import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
import { CampaignsService } from './campaigns.service';
import type { CampaignStatus } from '../entities/campaign.entity';

// ── DTOs ─────────────────────────────────────────────────────────

class CreateCampaignDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() tagline: string;
  @IsString() @IsNotEmpty() description: string;
  @IsInt() @Min(1) goal: number;

  @IsString()
  @IsOptional()
  @IsIn(['active', 'completed', 'upcoming'])
  status?: CampaignStatus;

  @IsString() @IsOptional() deadline?: string;
  @IsString() @IsNotEmpty() category: string;
  @IsString() @IsNotEmpty() icon: string;
  @IsString() @IsNotEmpty() color: string;

  @IsBoolean() @IsOptional() featured?: boolean;
  @IsArray() @IsOptional() impact?: string[];
  @IsArray() @IsOptional() updates?: string[];
}

class UpdateCampaignDto {
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() tagline?: string;
  @IsString() @IsOptional() description?: string;
  @IsInt() @Min(1) @IsOptional() goal?: number;

  @IsString()
  @IsOptional()
  @IsIn(['active', 'completed', 'upcoming'])
  status?: CampaignStatus;

  @IsString() @IsOptional() deadline?: string;
  @IsString() @IsOptional() category?: string;
  @IsString() @IsOptional() icon?: string;
  @IsString() @IsOptional() color?: string;
  @IsBoolean() @IsOptional() featured?: boolean;
  @IsArray() @IsOptional() impact?: string[];
  @IsArray() @IsOptional() updates?: string[];
}

// ── Controller ───────────────────────────────────────────────────

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  // ── Public ────────────────────────────────────────────────────

  @Get()
  findAll() {
    return this.campaigns.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.campaigns.findById(id);
  }

  // ── Admin ─────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CAMPAIGNS_WRITE)
  create(@Body() dto: CreateCampaignDto) {
    return this.campaigns.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CAMPAIGNS_WRITE)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaigns.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CAMPAIGNS_WRITE)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.campaigns.remove(id);
  }
}
