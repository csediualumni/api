import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
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
import { MemberIdCounter } from '../entities/member-id-counter.entity';
import { SiteConfig } from '../entities/site-config.entity';
import { AccountCategory } from '../entities/account-category.entity';
import { AccountTransaction } from '../entities/account-transaction.entity';
import { AuditReport } from '../entities/audit-report.entity';
import { ALL_PERMISSIONS } from '../auth/permissions.constants';

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
        MemberIdCounter,
    SiteConfig,
    AccountCategory,
    AccountTransaction,
    AuditReport,
  ],
  synchronize: true,
});

async function main() {
  await ds.initialize();

  const permRepo = ds.getRepository(Permission);
  const roleRepo = ds.getRepository(Role);
  const rolePermRepo = ds.getRepository(RolePermission);
  const userRepo = ds.getRepository(User);
  const userRoleRepo = ds.getRepository(UserRole);
  const mappingRepo = ds.getRepository(DesignationRoleMapping);

  // ── 1. Upsert every permission ──────────────────────────────
  console.log('▶ Seeding permissions…');
  for (const p of ALL_PERMISSIONS) {
    const existing = await permRepo.findOne({ where: { key: p.key } });
    if (existing) {
      await permRepo.save({ ...existing, ...p });
    } else {
      await permRepo.save(permRepo.create({ id: uuidv4(), ...p }));
    }
  }
  console.log(`  ✓ ${ALL_PERMISSIONS.length} permissions ready`);

  // ── 2. Create system roles ──────────────────────────────────
  console.log('▶ Seeding system roles…');

  const allPerms = await permRepo.find();
  const perm = (key: string) => allPerms.find((p) => p.key === key)!;

  const superAdminRole = await upsertRole(
    roleRepo,
    rolePermRepo,
    'super_admin',
    'Full system access',
    true,
    allPerms.map((p) => p.id),
  );
  await upsertRole(
    roleRepo,
    rolePermRepo,
    'admin',
    'Manage users and roles',
    true,
    [
      perm('users:read').id,
      perm('users:write').id,
      perm('users:assign_role').id,
      perm('roles:read').id,
      perm('permissions:read').id,
      perm('gallery:write').id,
      perm('gallery:read').id,
      perm('news:read').id,
      perm('news:write').id,
    ],
  );
  await upsertRole(
    roleRepo,
    rolePermRepo,
    'member',
    'Regular member — full access to alumni content',
    true,
    [perm('profile:read').id, perm('profile:write').id],
  );
  await upsertRole(
    roleRepo,
    rolePermRepo,
    'guest',
    'Newly registered user — can apply for membership',
    true,
    [perm('membership:apply').id, perm('profile:write').id],
  );

  console.log(`  ✓ Roles: super_admin, admin, member, guest`);

  // ── 2b. Committee roles ─────────────────────────────────────
  console.log('▶ Seeding committee roles…');

  const committeePresidentRole = await upsertRole(
    roleRepo,
    rolePermRepo,
    'committee_president',
    'Active committee — President / Vice-President',
    false,
    [
      perm('committees:read').id,
      perm('committees:write').id,
      perm('users:read').id,
      perm('contact:read').id,
      perm('contact:write').id,
      perm('newsletter:read').id,
      perm('newsletter:write').id,
      perm('membership:read').id,
      perm('invoices:read').id,
      perm('milestones:read').id,
      perm('milestones:write').id,
      perm('gallery:read').id,
      perm('gallery:write').id,
    ],
  );

  const committeeSecretaryRole = await upsertRole(
    roleRepo,
    rolePermRepo,
    'committee_secretary',
    'Active committee — Secretary',
    false,
    [
      perm('contact:read').id,
      perm('contact:write').id,
      perm('newsletter:read').id,
      perm('membership:read').id,
      perm('milestones:read').id,
    ],
  );

  const committeeTreasurerRole = await upsertRole(
    roleRepo,
    rolePermRepo,
    'committee_treasurer',
    'Active committee — Treasurer',
    false,
    [
      perm('invoices:read').id,
      perm('invoices:write').id,
      perm('membership:read').id,
      perm('accounting:read').id,
      perm('accounting:write').id,
    ],
  );

  const committeeMemberRole = await upsertRole(
    roleRepo,
    rolePermRepo,
    'committee_member',
    'Active committee — Executive Member / Adviser',
    false,
    [perm('users:read').id, perm('contact:read').id],
  );

  console.log(
    `  ✓ Committee roles: committee_president, committee_secretary, committee_treasurer, committee_member`,
  );

  // ── 3. Default designation → role mappings ──────────────────
  console.log('▶ Seeding designation role mappings…');

  const defaultMappings: { designation: string; roleId: string }[] = [
    { designation: 'President', roleId: committeePresidentRole.id },
    { designation: 'Vice President', roleId: committeePresidentRole.id },
    { designation: 'General Secretary', roleId: committeeSecretaryRole.id },
    { designation: 'Joint Secretary', roleId: committeeSecretaryRole.id },
    { designation: 'Treasurer', roleId: committeeTreasurerRole.id },
    { designation: 'Assistant Treasurer', roleId: committeeTreasurerRole.id },
    { designation: 'Executive Member', roleId: committeeMemberRole.id },
    { designation: 'Adviser', roleId: committeeMemberRole.id },
  ];

  for (const dm of defaultMappings) {
    const existing = await mappingRepo.findOne({
      where: { designation: dm.designation },
    });
    if (existing) {
      await mappingRepo.save({ ...existing, roleId: dm.roleId });
    } else {
      await mappingRepo.save(mappingRepo.create({ id: uuidv4(), ...dm }));
    }
  }
  console.log(`  ✓ ${defaultMappings.length} designation mappings ready`);

  // ── 4. Seed default accounting categories ───────────────────
  console.log('▶ Seeding accounting categories…');
  const categoryRepo = ds.getRepository(AccountCategory);

  const defaultCategories: { name: string; type: 'income' | 'expense' | 'both'; isSystem: boolean }[] = [
    // Income
    { name: 'Donations / Fundraising', type: 'income', isSystem: true },
    { name: 'Membership Fees', type: 'income', isSystem: true },
    { name: 'Event Ticket Sales', type: 'income', isSystem: true },
    { name: 'Sponsorships', type: 'income', isSystem: true },
    { name: 'Grants / Awards', type: 'income', isSystem: true },
    { name: 'Bank Interest', type: 'income', isSystem: true },
    // Expense
    { name: 'Event Expenses', type: 'expense', isSystem: true },
    { name: 'Administrative / Office Expenses', type: 'expense', isSystem: true },
    { name: 'Scholarship Disbursements', type: 'expense', isSystem: true },
    { name: 'Marketing / Printing', type: 'expense', isSystem: true },
    { name: 'Software / Tools', type: 'expense', isSystem: true },
    // Both
    { name: 'Miscellaneous', type: 'both', isSystem: true },
  ];

  for (const cat of defaultCategories) {
    const existing = await categoryRepo.findOne({ where: { name: cat.name } });
    if (!existing) {
      await categoryRepo.save(categoryRepo.create({ id: uuidv4(), ...cat }));
    }
  }
  console.log(`  ✓ ${defaultCategories.length} accounting categories ready`);

  // ── 5. Seed super admin user ──────────────────────────────────
  const email = process.env.ADMIN_EMAIL ?? 'admin@csediualumni.com';
  const rawPassword = process.env.ADMIN_PASSWORD;

  if (!rawPassword) {
    throw new Error(
      'ADMIN_PASSWORD is not set in .env — cannot seed super admin.',
    );
  }

  console.log(`▶ Seeding super admin user (${email})…`);
  const hashed = await bcrypt.hash(rawPassword, 12);

  let admin = await userRepo.findOne({ where: { email } });
  if (admin) {
    await userRepo.save({
      ...admin,
      password: hashed,
      displayName: 'System Admin',
    });
  } else {
    admin = await userRepo.save(
      userRepo.create({
        id: uuidv4(),
        email,
        password: hashed,
        displayName: 'System Admin',
      }),
    );
  }
  admin = await userRepo.findOneOrFail({ where: { email } });

  // Assign super_admin role
  await userRoleRepo.save({ userId: admin.id, roleId: superAdminRole.id });

  console.log(`  ✓ Super admin ready: ${admin.email} (id: ${admin.id})`);
}

async function upsertRole(
  roleRepo: ReturnType<typeof ds.getRepository<Role>>,
  rolePermRepo: ReturnType<typeof ds.getRepository<RolePermission>>,
  name: string,
  description: string,
  isSystem: boolean,
  permissionIds: string[],
) {
  let role = await roleRepo.findOne({ where: { name } });
  if (role) {
    await roleRepo.save({ ...role, description, isSystem });
  } else {
    role = await roleRepo.save(
      roleRepo.create({ id: uuidv4(), name, description, isSystem }),
    );
  }
  role = await roleRepo.findOneOrFail({ where: { name } });

  await rolePermRepo.delete({ roleId: role.id });
  if (permissionIds.length > 0) {
    await rolePermRepo.save(
      permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
    );
  }
  return role;
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => ds.destroy());
