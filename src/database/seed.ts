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
    ],
  );
  await upsertRole(
    roleRepo,
    rolePermRepo,
    'member',
    'Regular member — full access to alumni content',
    true,
    [
      perm('profile:read').id,
      perm('profile:write').id,
    ],
  );
  await upsertRole(
    roleRepo,
    rolePermRepo,
    'guest',
    'Newly registered user — can apply for membership',
    true,
    [
      perm('membership:apply').id,
      perm('profile:write').id,
    ],
  );

  console.log(`  ✓ Roles: super_admin, admin, member, guest`);

  // ── 3. Seed super admin user ────────────────────────────────
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
