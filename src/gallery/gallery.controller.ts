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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
import { GalleryService } from './gallery.service';

// ── DTOs ─────────────────────────────────────────────────────────

class CreateAlbumDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() coverImageUrl?: string;
  @IsString() @IsOptional() category?: string;
  @IsInt() @Min(1900) @IsOptional() year?: number;
  @IsBoolean() @IsOptional() isPublished?: boolean;
  @IsInt() @Min(0) @IsOptional() sortOrder?: number;
}

class UpdateAlbumDto {
  @IsString() @IsNotEmpty() @IsOptional() title?: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() coverImageUrl?: string;
  @IsString() @IsOptional() category?: string;
  @IsInt() @Min(1900) @IsOptional() year?: number;
  @IsBoolean() @IsOptional() isPublished?: boolean;
  @IsInt() @Min(0) @IsOptional() sortOrder?: number;
}

class AddItemDto {
  @IsString() @IsNotEmpty() @IsIn(['image', 'video']) type: 'image' | 'video';
  @IsString() @IsNotEmpty() url: string;
  @IsString() @IsOptional() thumbnailUrl?: string;
  @IsString() @IsOptional() caption?: string;
  @IsInt() @Min(0) @IsOptional() sortOrder?: number;
}

class UpdateItemDto {
  @IsString() @IsNotEmpty() @IsIn(['image', 'video']) @IsOptional() type?:
    | 'image'
    | 'video';
  @IsString() @IsOptional() url?: string;
  @IsString() @IsOptional() thumbnailUrl?: string;
  @IsString() @IsOptional() caption?: string;
  @IsInt() @Min(0) @IsOptional() sortOrder?: number;
}

// ── Controller ───────────────────────────────────────────────────

@Controller('gallery')
export class GalleryController {
  constructor(private readonly gallery: GalleryService) {}

  // ── Public ────────────────────────────────────────────────────

  /** Returns all published albums with their items */
  @Get('albums')
  findAll() {
    return this.gallery.findAllPublished();
  }

  /** Returns a single published OR unpublished album (admin can query any) */
  @Get('albums/:id')
  findOne(@Param('id') id: string) {
    return this.gallery.findOne(id);
  }

  // ── Admin — Albums ────────────────────────────────────────────

  /** Admin: list ALL albums including unpublished */
  @Get('admin/albums')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.GALLERY_WRITE)
  findAllAdmin() {
    return this.gallery.findAll();
  }

  @Post('albums')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.GALLERY_WRITE)
  createAlbum(@Body() dto: CreateAlbumDto) {
    return this.gallery.create(dto);
  }

  @Patch('albums/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.GALLERY_WRITE)
  updateAlbum(@Param('id') id: string, @Body() dto: UpdateAlbumDto) {
    return this.gallery.update(id, dto);
  }

  @Delete('albums/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.GALLERY_WRITE)
  removeAlbum(@Param('id') id: string) {
    return this.gallery.remove(id);
  }

  // ── Admin — Items ─────────────────────────────────────────────

  /** Add an image/video item via JSON body (use URL for images already on S3 or external video URLs) */
  @Post('albums/:albumId/items')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.GALLERY_WRITE)
  addItem(@Param('albumId') albumId: string, @Body() dto: AddItemDto) {
    return this.gallery.addItem(albumId, dto);
  }

  /** Upload an image file directly to S3 */
  @Post('albums/:albumId/items/upload')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.GALLERY_WRITE)
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(
    @Param('albumId') albumId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    return this.gallery.uploadImage(
      albumId,
      file.buffer,
      file.mimetype,
      file.originalname,
    );
  }

  @Patch('albums/:albumId/items/:itemId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.GALLERY_WRITE)
  updateItem(
    @Param('albumId') albumId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.gallery.updateItem(albumId, itemId, dto);
  }

  @Delete('albums/:albumId/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.GALLERY_WRITE)
  removeItem(
    @Param('albumId') albumId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.gallery.removeItem(albumId, itemId);
  }
}
