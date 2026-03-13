import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteConfig } from '../entities/site-config.entity';
import { UploadService } from '../upload/upload.service';
import { UpdateConfigDto } from './dto/update-config.dto';

@Injectable()
export class SiteConfigService {
  constructor(
    @InjectRepository(SiteConfig)
    private readonly repo: Repository<SiteConfig>,
    private readonly upload: UploadService,
  ) {}

  async getAll(): Promise<Record<string, string | null>> {
    const rows = await this.repo.find();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async set(key: string, value: string | null): Promise<void> {
    await this.repo.upsert({ key, value }, ['key']);
  }

  async setMany(dto: UpdateConfigDto): Promise<Record<string, string | null>> {
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        await this.set(key, (value as string) || null);
      }
    }
    return this.getAll();
  }

  async uploadLogo(file: Express.Multer.File): Promise<string> {
    const ext = (file.originalname.split('.').pop() ?? 'png').toLowerCase();
    const url = await this.upload.uploadFile(file.buffer, file.mimetype, ext, 'branding');
    await this.set('logoUrl', url);
    return url;
  }

  async uploadFavicon(file: Express.Multer.File): Promise<string> {
    const ext = (file.originalname.split('.').pop() ?? 'png').toLowerCase();
    const url = await this.upload.uploadFile(file.buffer, file.mimetype, ext, 'branding');
    await this.set('faviconUrl', url);
    return url;
  }
}
