import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mentor } from '../entities/mentor.entity';
import { MentorApplication } from '../entities/mentor-application.entity';
import { MentorshipService } from './mentorship.service';
import { MentorshipController } from './mentorship.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Mentor, MentorApplication])],
  providers: [MentorshipService],
  controllers: [MentorshipController],
  exports: [MentorshipService],
})
export class MentorshipModule {}
