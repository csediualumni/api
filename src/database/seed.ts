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
import { Campaign } from '../entities/campaign.entity';
import { GalleryAlbum } from '../entities/gallery-album.entity';
import { GalleryItem } from '../entities/gallery-item.entity';
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
    Campaign,
    GalleryAlbum,
    GalleryItem,
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

  // ── 4. Seed donation campaigns ──────────────────────────────────
  console.log('▶ Seeding campaigns…');
  const campaignRepo = ds.getRepository(Campaign);
  const campaignSeeds: Omit<
    Campaign,
    'id' | 'createdAt' | 'updatedAt' | 'generateId'
  >[] = [
    {
      title: 'Alumni Scholarship Fund 2026',
      tagline: 'Help a deserving student write their future.',
      description:
        'Every year, several academically brilliant students from underprivileged backgrounds struggle to continue their CSE education at DIU. Your donation directly funds tuition waivers, laptops, and living stipends for one complete academic year. No bureaucracy — 100% of donations go to recipients selected by a transparent committee.',
      goal: 1_500_000,
      status: 'active',
      deadline: 'June 30, 2026',
      category: 'Scholarship',
      icon: 'fa-graduation-cap',
      color: 'bg-blue-600',
      featured: true,
      impact: [
        'Full tuition waiver for one academic year per recipient',
        'Laptop & essential equipment allowance (BDT 40,000)',
        'Monthly living stipend (BDT 5,000 × 10 months)',
        'Mentorship pairing with a senior alumni volunteer',
      ],
      updates: [
        'March 2026: Shortlisted 12 candidates for final review.',
        'Feb 2026: Campaign progressing well — keep the donations coming!',
        'Jan 2026: Campaign officially launched by the 2024–25 committee.',
      ],
    },
    {
      title: 'DIU CSE Lab Upgrade Project',
      tagline: 'Better labs → better engineers.',
      description:
        'The undergraduate computer lab equipment at DIU CSE Department is aging. We are raising funds to equip two labs with modern workstations, high-speed networking, and an IoT & embedded systems corner, benefiting 400+ students every semester.',
      goal: 2_000_000,
      status: 'active',
      deadline: 'September 15, 2026',
      category: 'Infrastructure',
      icon: 'fa-server',
      color: 'bg-violet-600',
      featured: true,
      impact: [
        '20 new i7 workstations with 32 GB RAM each',
        'Dedicated GPU server for AI/ML coursework',
        'IoT & embedded-systems corner (Raspberry Pi, Arduino kits)',
        'Fibre-optic 10 Gbps LAN upgrade for both labs',
      ],
      updates: [
        'March 2026: Vendor quotes finalised; procurement to begin at 80% funding.',
        'Feb 2026: Campaign officially launched.',
      ],
    },
    {
      title: 'Annual Alumni Sports & Cultural Day',
      tagline: 'Reunite. Compete. Celebrate.',
      description:
        'Help us fund the logistics, venue, equipment, and catering for the annual Sports & Cultural Day — a beloved tradition that reunites batches from across the country and beyond for a day of friendly competition and celebration.',
      goal: 300_000,
      status: 'completed',
      deadline: null,
      category: 'Event',
      icon: 'fa-trophy',
      color: 'bg-amber-500',
      featured: false,
      impact: [
        'Venue booking and setup at DIU Permanent Campus',
        'Sports equipment and prizes for 8 event categories',
        'Catering for 600 attendees',
        'Live streaming for overseas alumni',
      ],
      updates: null,
    },
    {
      title: 'Emergency Relief — Flood Aid 2024',
      tagline: 'Standing by our community in crisis.',
      description:
        'In response to the devastating 2024 floods across Bangladesh, the alumni network mobilised swiftly to provide food packages, drinking water, and temporary shelter contributions to affected families, including several alumni families.',
      goal: 500_000,
      status: 'completed',
      deadline: null,
      category: 'Relief',
      icon: 'fa-hand-holding-heart',
      color: 'bg-rose-600',
      featured: false,
      impact: [
        'Food packages distributed to 820+ families',
        'Clean water & purification tablets for 200 households',
        'Temporary shelter materials for 45 families',
        'BDT 1.12 lakh surplus reinvested into scholarship fund',
      ],
      updates: null,
    },
    {
      title: 'Alumni Research Grant 2026',
      tagline: 'Funding the next breakthrough from our community.',
      description:
        'A new initiative to provide micro-grants (BDT 50,000–1,50,000) to CSE DIU alumni pursuing independent or collaborative applied research. Open to all alumni regardless of current institution or employer.',
      goal: 800_000,
      status: 'upcoming',
      deadline: 'Opens July 2026',
      category: 'Research',
      icon: 'fa-flask',
      color: 'bg-teal-600',
      featured: false,
      impact: [
        'Micro-grants of BDT 50,000–1,50,000 per project',
        'Support for publication fees at reputed venues',
        'Infrastructure credits (cloud compute, datasets)',
        'Mentorship from senior researcher alumni',
      ],
      updates: null,
    },
  ];

  for (const seed of campaignSeeds) {
    const existing = await campaignRepo.findOne({
      where: { title: seed.title },
    });
    if (existing) {
      await campaignRepo.save({ ...existing, ...seed });
    } else {
      await campaignRepo.save(campaignRepo.create(seed));
    }
  }
  console.log(`  ✓ ${campaignSeeds.length} campaigns ready`);

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
