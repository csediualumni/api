import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GalleryAlbum } from '../entities/gallery-album.entity';
import { GalleryItem } from '../entities/gallery-item.entity';
import { UploadService } from '../upload/upload.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateAlbumDto {
  title: string;
  description?: string;
  coverImageUrl?: string;
  category?: string;
  year?: number;
  isPublished?: boolean;
  sortOrder?: number;
}

export type UpdateAlbumDto = Partial<CreateAlbumDto>;

export interface AddItemDto {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  sortOrder?: number;
}

export type UpdateItemDto = Partial<AddItemDto>;

@Injectable()
export class GalleryService {
  constructor(
    @InjectRepository(GalleryAlbum)
    private readonly albumRepo: Repository<GalleryAlbum>,

    @InjectRepository(GalleryItem)
    private readonly itemRepo: Repository<GalleryItem>,

    private readonly uploadSvc: UploadService,
  ) {}

  // ── Albums (public) ────────────────────────────────────────────

  async findAllPublished(): Promise<GalleryAlbum[]> {
    const albums = await this.albumRepo.find({
      where: { isPublished: true },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
    // Load item counts without fetching all data
    return Promise.all(
      albums.map(async (album) => {
        const items = await this.itemRepo.find({
          where: { albumId: album.id },
          order: { sortOrder: 'ASC', createdAt: 'ASC' },
        });
        return Object.assign(album, { items });
      }),
    );
  }

  async findAll(): Promise<GalleryAlbum[]> {
    const albums = await this.albumRepo.find({
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
    return Promise.all(
      albums.map(async (album) => {
        const items = await this.itemRepo.find({
          where: { albumId: album.id },
          order: { sortOrder: 'ASC', createdAt: 'ASC' },
        });
        return Object.assign(album, { items });
      }),
    );
  }

  async findOne(id: string): Promise<GalleryAlbum> {
    const album = await this.albumRepo.findOne({ where: { id } });
    if (!album) throw new NotFoundException(`Gallery album ${id} not found`);
    const items = await this.itemRepo.find({
      where: { albumId: id },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return Object.assign(album, { items });
  }

  // ── Albums (admin) ─────────────────────────────────────────────

  async create(dto: CreateAlbumDto): Promise<GalleryAlbum> {
    const album = this.albumRepo.create({
      id: uuidv4(),
      title: dto.title,
      description: dto.description ?? null,
      coverImageUrl: dto.coverImageUrl ?? null,
      category: dto.category ?? 'General',
      year: dto.year ?? new Date().getFullYear(),
      isPublished: dto.isPublished ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
    const saved = await this.albumRepo.save(album);
    return Object.assign(saved, { items: [] as GalleryItem[] });
  }

  async update(id: string, dto: UpdateAlbumDto): Promise<GalleryAlbum> {
    const album = await this.albumRepo.findOne({ where: { id } });
    if (!album) throw new NotFoundException(`Gallery album ${id} not found`);
    await this.albumRepo.save({ ...album, ...dto });
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const album = await this.albumRepo.findOne({ where: { id } });
    if (!album) throw new NotFoundException(`Gallery album ${id} not found`);
    await this.albumRepo.remove(album);
  }

  // ── Items ──────────────────────────────────────────────────────

  async addItem(albumId: string, dto: AddItemDto): Promise<GalleryItem> {
    await this.findOne(albumId); // validates album exists
    const item = this.itemRepo.create({
      id: uuidv4(),
      albumId,
      type: dto.type,
      url: dto.url,
      thumbnailUrl: dto.thumbnailUrl ?? null,
      caption: dto.caption ?? null,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.itemRepo.save(item);
  }

  async uploadImage(
    albumId: string,
    buffer: Buffer,
    mimetype: string,
    originalname: string,
  ): Promise<GalleryItem> {
    await this.findOne(albumId); // validates album exists

    const ext = originalname.split('.').pop()?.toLowerCase();
    if (!ext || !['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      throw new BadRequestException(
        'Only JPEG, PNG, WebP, and GIF images are allowed',
      );
    }

    const url = await this.uploadSvc.uploadFile(
      buffer,
      mimetype,
      ext,
      'gallery',
    );

    const item = this.itemRepo.create({
      id: uuidv4(),
      albumId,
      type: 'image',
      url,
      thumbnailUrl: null,
      caption: null,
      sortOrder: 0,
    });
    const saved = await this.itemRepo.save(item);

    // Auto-set cover if album has none
    const album = await this.albumRepo.findOne({ where: { id: albumId } });
    if (album && !album.coverImageUrl) {
      await this.albumRepo.save({ ...album, coverImageUrl: url });
    }

    return saved;
  }

  async updateItem(
    albumId: string,
    itemId: string,
    dto: UpdateItemDto,
  ): Promise<GalleryItem> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId, albumId },
    });
    if (!item)
      throw new NotFoundException(
        `Gallery item ${itemId} not found in album ${albumId}`,
      );
    return this.itemRepo.save({ ...item, ...dto });
  }

  async removeItem(albumId: string, itemId: string): Promise<void> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId, albumId },
    });
    if (!item)
      throw new NotFoundException(
        `Gallery item ${itemId} not found in album ${albumId}`,
      );
    await this.itemRepo.remove(item);
  }
}
