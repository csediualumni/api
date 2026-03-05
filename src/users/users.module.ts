import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user-role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserRole])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
