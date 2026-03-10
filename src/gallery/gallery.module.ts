import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GalleryAlbum } from '../entities/gallery-album.entity';
import { GalleryItem } from '../entities/gallery-item.entity';
import { UploadModule } from '../upload/upload.module';
import { GalleryService } from './gallery.service';
import { GalleryController } from './gallery.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([GalleryAlbum, GalleryItem]),
    UploadModule,
  ],
  providers: [GalleryService],
  controllers: [GalleryController],
  exports: [GalleryService],
})
export class GalleryModule {}
