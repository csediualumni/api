import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Milestone } from '../entities/milestone.entity';
import { MilestonesService } from './milestones.service';
import { MilestonesController } from './milestones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Milestone])],
  providers: [MilestonesService],
  controllers: [MilestonesController],
  exports: [MilestonesService],
})
export class MilestonesModule {}
