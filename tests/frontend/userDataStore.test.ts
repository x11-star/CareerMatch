import assert from 'node:assert/strict';
import { readGuestJson, writeGuestJson } from '../../src/lib/userDataStore';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

function testGuestJsonRoundTrip() {
  const storage = new MemoryStorage();
  writeGuestJson(storage, 'resume_guest_1', { name: '张三' });
  assert.deepEqual(readGuestJson(storage, 'resume_guest_1'), { name: '张三' });
  assert.equal(readGuestJson(storage, 'missing'), null);
}

const tests = [testGuestJsonRoundTrip];
for (const test of tests) test();
console.log(`userDataStore.test.ts: ${tests.length} tests passed`);
