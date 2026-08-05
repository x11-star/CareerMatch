import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const originalDatabaseUrl = process.env.DATABASE_URL;
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  console.log('test:db skipped: TEST_DATABASE_URL is not configured');
  process.exit(0);
}

if (originalDatabaseUrl && originalDatabaseUrl === testDatabaseUrl) {
  console.error('test:db refused: TEST_DATABASE_URL must be separate from DATABASE_URL');
  process.exit(1);
}

process.env.DATABASE_URL = testDatabaseUrl;

const migrate = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
  env: process.env,
  stdio: 'inherit',
});

if (migrate.status !== 0) {
  process.exit(migrate.status ?? 1);
}

try {
  await import('./repositories.test');
} finally {
  const { prisma } = await import('../../src/server/db/prisma');
  await prisma.$disconnect();
}
