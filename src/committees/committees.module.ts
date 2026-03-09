import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Committee } from '../entities/committee.entity';
import { CommitteeMember } from '../entities/committee-member.entity';
import { DesignationRoleMapping } from '../entities/designation-role-mapping.entity';
import { UserRole } from '../entities/user-role.entity';
import { CommitteesService } from './committees.service';
import { CommitteesController } from './committees.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Committee, CommitteeMember, DesignationRoleMapping, UserRole])],
  providers: [CommitteesService],
  controllers: [CommitteesController],
  exports: [CommitteesService],
})
export class CommitteesModule {}
