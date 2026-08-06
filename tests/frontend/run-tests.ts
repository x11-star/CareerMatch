import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const tests = ['./apiClient.test.ts', './userDataStore.test.ts'];
let imported = 0;

for (const test of tests) {
  const testUrl = new URL(test, import.meta.url);
  if (existsSync(testUrl)) {
    await import(pathToFileURL(testUrl.pathname).href);
    imported += 1;
  }
}

if (imported === 0) {
  console.log('test:frontend skipped: frontend helper tests are not implemented yet');
}
