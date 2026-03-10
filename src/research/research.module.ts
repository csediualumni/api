import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResearchPaper } from '../entities/research-paper.entity';
import { ResearchService } from './research.service';
import { ResearchController } from './research.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ResearchPaper])],
  providers: [ResearchService],
  controllers: [ResearchController],
  exports: [ResearchService],
})
export class ResearchModule {}
