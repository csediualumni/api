import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user-role.entity';
import { Role } from '../entities/role.entity';
import { UserExperience } from '../entities/user-experience.entity';
import { UserEducation } from '../entities/user-education.entity';
import { UserAchievement } from '../entities/user-achievement.entity';
import { Event } from '../entities/event.entity';

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
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
