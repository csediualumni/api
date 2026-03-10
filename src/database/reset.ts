import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { UserRole } from '../entities/user-role.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { UserExperience } from '../entities/user-experience.entity';
import { UserEducation } from '../entities/user-education.entity';
import { UserAchievement } from '../entities/user-achievement.entity';
import { Invoice } from '../entities/invoice.entity';
import { InvoicePayment } from '../entities/invoice-payment.entity';
import { NewsletterSubscription } from '../entities/newsletter-subscription.entity';
import { MembershipApplication } from '../entities/membership-application.entity';
import { DesignationRoleMapping } from '../entities/designation-role-mapping.entity';
import { GalleryAlbum } from '../entities/gallery-album.entity';
import { GalleryItem } from '../entities/gallery-item.entity';
import { Committee } from '../entities/committee.entity';
import { CommitteeMember } from '../entities/committee-member.entity';
import { Milestone } from '../entities/milestone.entity';
import { ContactTicket } from '../entities/contact-ticket.entity';
import { ContactTicketComment } from '../entities/contact-ticket-comment.entity';
import { Event } from '../entities/event.entity';
import { EventRsvp } from '../entities/event-rsvp.entity';
import { Campaign } from '../entities/campaign.entity';
import { NewsArticle } from '../entities/news-article.entity';
import { ResearchPaper } from '../entities/research-paper.entity';
import { Mentor } from '../entities/mentor.entity';
import { MentorApplication } from '../entities/mentor-application.entity';
import { Scholarship } from '../entities/scholarship.entity';
import { JobPosting } from '../entities/job-posting.entity';

const ds = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [
    User,
    Role,
    Permission,
    UserRole,
    RolePermission,
    UserExperience,
    UserEducation,
    UserAchievement,
    Invoice,
    InvoicePayment,
    NewsletterSubscription,
    MembershipApplication,
    DesignationRoleMapping,
    GalleryAlbum,
    GalleryItem,
    Committee,
    CommitteeMember,
    Milestone,
    ContactTicket,
    ContactTicketComment,
    Event,
    EventRsvp,
    Campaign,
    NewsArticle,
    ResearchPaper,
    Mentor,
    MentorApplication,
    Scholarship,
    JobPosting,
  ],
  // dropSchema drops the entire public schema and all its tables,
  // then synchronize recreates a clean schema from all entities.
  dropSchema: true,
  synchronize: true,
});

async function main() {
  console.log('⚠️  Dropping and recreating the entire database schema…');
  await ds.initialize();
  console.log('✓ Schema dropped and recreated — all tables are now empty.');
}

main()
  .catch((e) => {
    console.error('❌ Reset failed:', e);
    process.exit(1);
  })
  .finally(() => ds.destroy());
