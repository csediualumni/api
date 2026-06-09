/**
 * One-off migration: add `contact_persons` JSONB column to the `events` table.
 * Run with: ts-node -r tsconfig-paths/register src/database/migrate-contact-persons.ts
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';

const ds = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [],
  synchronize: false,
});

async function main() {
  await ds.initialize();
  console.log('▶ Connected to database.');

  const qr = ds.createQueryRunner();
  await qr.connect();

  try {
    const columnExists = await qr.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'events'
        AND column_name = 'contact_persons'
    `);

    if (columnExists.length > 0) {
      console.log('  ✓ contact_persons column already exists — nothing to do.');
    } else {
      await qr.query(`
        ALTER TABLE events
        ADD COLUMN contact_persons jsonb DEFAULT NULL
      `);
      console.log('  ✓ contact_persons column added to events table.');
    }
  } finally {
    await qr.release();
  }
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(() => ds.destroy());
