import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AdminModule } from './admin/admin.module';
import { InvoicesModule } from './invoices/invoices.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { ContactModule } from './contact/contact.module';
import { ContactTicket } from './entities/contact-ticket.entity';
import { ContactTicketComment } from './entities/contact-ticket-comment.entity';
import { Invoice } from './entities/invoice.entity';
import { InvoicePayment } from './entities/invoice-payment.entity';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { UserRole } from './entities/user-role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserExperience } from './entities/user-experience.entity';
import { UserEducation } from './entities/user-education.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { NewsletterSubscription } from './entities/newsletter-subscription.entity';
import { MembershipApplication } from './entities/membership-application.entity';
import { MembershipModule } from './membership/membership.module';
import { MilestonesModule } from './milestones/milestones.module';
import { Milestone } from './entities/milestone.entity';
import { CommitteesModule } from './committees/committees.module';
import { Committee } from './entities/committee.entity';
import { CommitteeMember } from './entities/committee-member.entity';
import { DesignationRoleMapping } from './entities/designation-role-mapping.entity';
import { EventsModule } from './events/events.module';
import { Event } from './entities/event.entity';
import { EventRsvp } from './entities/event-rsvp.entity';
import { CampaignsModule } from './campaigns/campaigns.module';
import { Campaign } from './entities/campaign.entity';
import { GalleryModule } from './gallery/gallery.module';
import { GalleryAlbum } from './entities/gallery-album.entity';
import { GalleryItem } from './entities/gallery-item.entity';
import { NewsModule } from './news/news.module';
import { NewsArticle } from './entities/news-article.entity';
import { ResearchModule } from './research/research.module';
import { ResearchPaper } from './entities/research-paper.entity';
import { MentorshipModule } from './mentorship/mentorship.module';
import { Mentor } from './entities/mentor.entity';
import { MentorApplication } from './entities/mentor-application.entity';
import { ScholarshipsModule } from './scholarships/scholarships.module';
import { Scholarship } from './entities/scholarship.entity';
import { JobsModule } from './jobs/jobs.module';
import { JobPosting } from './entities/job-posting.entity';
import { MemberIdCounter } from './entities/member-id-counter.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [
          User,
          Role,
          Permission,
          UserRole,
          RolePermission,
          Invoice,
          InvoicePayment,
          UserExperience,
          UserEducation,
          UserAchievement,
          NewsletterSubscription,
          ContactTicket,
          ContactTicketComment,
          MembershipApplication,
          Milestone,
          Committee,
          CommitteeMember,
          DesignationRoleMapping,
          Event,
          EventRsvp,
          Campaign,
          GalleryAlbum,
          GalleryItem,
          NewsArticle,
          ResearchPaper,
          Mentor,
          MentorApplication,
          Scholarship,
          JobPosting,
          MemberIdCounter,
        ],
        synchronize: true,
        ssl: { rejectUnauthorized: false },
      }),
    }),
    UsersModule,
    AuthModule,
    RolesModule,
    PermissionsModule,
    AdminModule,
    InvoicesModule,
    NewsletterModule,
    ContactModule,
    MembershipModule,
    MilestonesModule,
    CommitteesModule,
    EventsModule,
    CampaignsModule,
    GalleryModule,
    NewsModule,
    ResearchModule,
    MentorshipModule,
    ScholarshipsModule,
    JobsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
