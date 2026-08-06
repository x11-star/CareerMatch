import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

if (!process.env.TEST_DATABASE_URL) {
  console.log('test:auth skipped: TEST_DATABASE_URL is not configured');
  process.exit(0);
}

if (process.env.DATABASE_URL && process.env.DATABASE_URL === process.env.TEST_DATABASE_URL) {
  console.error('test:auth refused: TEST_DATABASE_URL must be separate from DATABASE_URL');
  process.exit(1);
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.SMS_PROVIDER = process.env.SMS_PROVIDER || 'dev';
process.env.DEV_SMS_CODE = process.env.DEV_SMS_CODE || '123456';

const migrate = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
  env: process.env,
  stdio: 'inherit',
});

if (migrate.status !== 0) process.exit(migrate.status ?? 1);

try {
  const testPath = new URL('./authService.test.ts', import.meta.url);
  if (existsSync(testPath)) {
    await import('./authService.test');
  } else {
    console.log('test:auth skipped: authService.test.ts is not implemented yet');
  }
} finally {
  const { prisma } = await import('../../src/server/db/prisma');
  await prisma.$disconnect();
}
