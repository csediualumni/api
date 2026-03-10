import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Scholarship } from '../entities/scholarship.entity';
import { ScholarshipsService } from './scholarships.service';
import { ScholarshipsController } from './scholarships.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Scholarship])],
  providers: [ScholarshipsService],
  controllers: [ScholarshipsController],
  exports: [ScholarshipsService],
})
export class ScholarshipsModule {}
