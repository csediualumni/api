import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiteConfig } from '../entities/site-config.entity';
import { UploadModule } from '../upload/upload.module';
import { SiteConfigService } from './config.service';
import { SiteConfigController } from './config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SiteConfig]), UploadModule],
  providers: [SiteConfigService],
  controllers: [SiteConfigController],
  exports: [SiteConfigService],
})
export class SiteConfigModule {}
