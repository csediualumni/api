import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';
import { SiteConfigService } from './config.service';
import { UpdateConfigDto } from './dto/update-config.dto';

@Controller('config')
export class SiteConfigController {
  constructor(private readonly siteConfig: SiteConfigService) {}

  /** Public endpoint — returns all config as a flat key→value map */
  @Get()
  getAll(): Promise<Record<string, string | null>> {
    return this.siteConfig.getAll();
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONFIG_EDIT)
  updateConfig(@Body() dto: UpdateConfigDto): Promise<Record<string, string | null>> {
    return this.siteConfig.setMany(dto);
  }

  @Post('logo')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONFIG_EDIT)
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ logoUrl: string }> {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!file.mimetype.startsWith('image/'))
      throw new BadRequestException('Only image files are allowed');
    const url = await this.siteConfig.uploadLogo(file);
    return { logoUrl: url };
  }

  @Post('favicon')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONFIG_EDIT)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFavicon(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ faviconUrl: string }> {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!file.mimetype.startsWith('image/'))
      throw new BadRequestException('Only image files are allowed');
    const url = await this.siteConfig.uploadFavicon(file);
    return { faviconUrl: url };
  }
}
