/**
 * All permission keys used by the system.
 * These are the ONLY hardcoded values — every role assignment and check
 * happens dynamically against these keys stored in the database.
 */
export const PERMISSIONS = {
  // User management
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',
  USERS_ASSIGN_ROLE: 'users:assign_role',

  // Role management
  ROLES_READ: 'roles:read',
  ROLES_WRITE: 'roles:write',
  ROLES_DELETE: 'roles:delete',

  // Permission management
  PERMISSIONS_READ: 'permissions:read',
  PERMISSIONS_ASSIGN: 'permissions:assign',

  // Invoice management
  INVOICES_READ: 'invoices:read',
  INVOICES_WRITE: 'invoices:write',

  // Newsletter management
  NEWSLETTER_READ: 'newsletter:read',
  NEWSLETTER_WRITE: 'newsletter:write',

  // Contact ticket management
  CONTACT_READ: 'contact:read',
  CONTACT_WRITE: 'contact:write',

  // Membership management
  MEMBERSHIP_APPLY: 'membership:apply',
  MEMBERSHIP_READ: 'membership:read',
  MEMBERSHIP_REVIEW: 'membership:review',

  // Profile management
  PROFILE_READ: 'profile:read',
  PROFILE_WRITE: 'profile:write',

  // Milestone management (About page history)
  MILESTONES_READ: 'milestones:read',
  MILESTONES_WRITE: 'milestones:write',

  // Committee management
  COMMITTEES_READ: 'committees:read',
  COMMITTEES_WRITE: 'committees:write',

  // Events management
  EVENTS_READ: 'events:read',
  EVENTS_WRITE: 'events:write',

  // Campaigns management
  CAMPAIGNS_WRITE: 'campaigns:write',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Flat metadata describing every permission — used by the seeder */
export const ALL_PERMISSIONS: {
  key: PermissionKey;
  description: string;
  group: string;
}[] = [
  { key: 'users:read', description: 'View user list', group: 'Users' },
  { key: 'users:write', description: 'Create or update users', group: 'Users' },
  { key: 'users:delete', description: 'Delete users', group: 'Users' },
  {
    key: 'users:assign_role',
    description: 'Assign/remove roles on users',
    group: 'Users',
  },
  { key: 'roles:read', description: 'View roles list', group: 'Roles' },
  { key: 'roles:write', description: 'Create or update roles', group: 'Roles' },
  { key: 'roles:delete', description: 'Delete roles', group: 'Roles' },
  {
    key: 'permissions:read',
    description: 'View permissions list',
    group: 'Permissions',
  },
  {
    key: 'permissions:assign',
    description: 'Assign permissions to roles',
    group: 'Permissions',
  },
  {
    key: 'invoices:read',
    description: 'View all invoices & payments',
    group: 'Invoices',
  },
  {
    key: 'invoices:write',
    description: 'Manage invoice & payment status, issue refunds',
    group: 'Invoices',
  },
  {
    key: 'newsletter:read',
    description: 'View newsletter subscriptions',
    group: 'Newsletter',
  },
  {
    key: 'newsletter:write',
    description: 'Manage subscriptions and send newsletter emails',
    group: 'Newsletter',
  },
  {
    key: 'contact:read',
    description: 'View contact form submissions / tickets',
    group: 'Contact',
  },
  {
    key: 'contact:write',
    description: 'Update ticket status and add comments',
    group: 'Contact',
  },
  {
    key: 'membership:apply',
    description: 'Submit a membership application',
    group: 'Membership',
  },
  {
    key: 'membership:read',
    description: 'View all membership applications',
    group: 'Membership',
  },
  {
    key: 'membership:review',
    description: 'Approve or reject membership applications',
    group: 'Membership',
  },
  {
    key: 'profile:read',
    description: 'View full member profiles',
    group: 'Profile',
  },
  {
    key: 'profile:write',
    description: 'Edit own profile',
    group: 'Profile',
  },
  {
    key: 'milestones:read',
    description: 'View history milestones',
    group: 'Milestones',
  },
  {
    key: 'milestones:write',
    description: 'Create, update and delete history milestones',
    group: 'Milestones',
  },
  {
    key: 'committees:read',
    description: 'View all committees and members',
    group: 'Committees',
  },
  {
    key: 'committees:write',
    description: 'Create, update and delete committees and members',
    group: 'Committees',
  },
  {
    key: 'events:read',
    description: 'View all events and RSVP lists',
    group: 'Events',
  },
  {
    key: 'events:write',
    description: 'Create, update and delete events',
    group: 'Events',
  },
  {
    key: 'campaigns:write',
    description: 'Create, update and delete donation campaigns',
    group: 'Campaigns',
  },
];
