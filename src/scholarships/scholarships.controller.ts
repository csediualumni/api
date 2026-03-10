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
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';
import { ScholarshipsService } from './scholarships.service';

// ── DTOs ──────────────────────────────────────────────────────────

class CreateScholarshipDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() provider: string;
  @IsString() @IsNotEmpty() amount: string;
  @IsString() @IsNotEmpty() currency: string;
  @IsString() @IsNotEmpty() deadline: string;
  @IsString() @IsNotEmpty() eligibility: string;
  @IsString() @IsNotEmpty() level: string;
  @IsString() @IsNotEmpty() country: string;
  @IsString() @IsNotEmpty() type: string;
  @IsString() @IsNotEmpty() description: string;
  @IsArray() @IsString({ each: true }) @IsOptional() tags?: string[];
  @IsString() @IsNotEmpty() link: string;
  @IsBoolean() @IsOptional() featured?: boolean;
  @IsBoolean() @IsOptional() urgent?: boolean;
}

class UpdateScholarshipDto {
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() provider?: string;
  @IsString() @IsOptional() amount?: string;
  @IsString() @IsOptional() currency?: string;
  @IsString() @IsOptional() deadline?: string;
  @IsString() @IsOptional() eligibility?: string;
  @IsString() @IsOptional() level?: string;
  @IsString() @IsOptional() country?: string;
  @IsString() @IsOptional() type?: string;
  @IsString() @IsOptional() description?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() tags?: string[];
  @IsString() @IsOptional() link?: string;
  @IsBoolean() @IsOptional() featured?: boolean;
  @IsBoolean() @IsOptional() urgent?: boolean;
}

// ── Controller ────────────────────────────────────────────────────

@Controller('scholarships')
export class ScholarshipsController {
  constructor(private readonly scholarships: ScholarshipsService) {}

  // Public
  @Get()
  findAll() {
    return this.scholarships.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.scholarships.findById(id);
  }

  // Admin
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.SCHOLARSHIPS_WRITE)
  create(@Body() dto: CreateScholarshipDto) {
    return this.scholarships.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.SCHOLARSHIPS_WRITE)
  update(@Param('id') id: string, @Body() dto: UpdateScholarshipDto) {
    return this.scholarships.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.SCHOLARSHIPS_WRITE)
  remove(@Param('id') id: string) {
    return this.scholarships.remove(id);
  }
}
