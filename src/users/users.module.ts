import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ReferenceController } from './reference.controller';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user-role.entity';
import { Role } from '../entities/role.entity';
import { UserExperience } from '../entities/user-experience.entity';
import { UserEducation } from '../entities/user-education.entity';
import { UserAchievement } from '../entities/user-achievement.entity';
import { Event } from '../entities/event.entity';
import { MemberIdCounter } from '../entities/member-id-counter.entity';
import { Department } from '../entities/department.entity';
import { AcademicShift } from '../entities/academic-shift.entity';
import { AcademicSession } from '../entities/academic-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserRole,
      Role,
      UserExperience,
      UserEducation,
      UserAchievement,
      Event,
      MemberIdCounter,
      Department,
      AcademicShift,
      AcademicSession,
    ]),
  ],
  controllers: [UsersController, ReferenceController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
