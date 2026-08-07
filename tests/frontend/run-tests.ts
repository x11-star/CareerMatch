import { existsSync } from 'node:fs';

const tests = ['./apiClient.test.ts', './userDataStore.test.ts', './uiCopy.test.ts', './profileCompleteness.test.ts'];
let imported = 0;

for (const test of tests) {
  if (existsSync(new URL(test, import.meta.url))) {
    await import(test);
    imported += 1;
  }
}

if (imported === 0) {
  console.log('test:frontend skipped: frontend helper tests are not implemented yet');
}
