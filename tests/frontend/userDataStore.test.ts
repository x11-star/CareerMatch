import assert from 'node:assert/strict';
import { buildGuestImportPayload, readGuestJson, writeGuestJson } from '../../src/lib/userDataStore';

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

function testGuestImportPayloadCollectsLocalData() {
  const storage = new MemoryStorage();
  storage.setItem('guest_uid', 'guest_1');
  storage.setItem('resume_guest_1', JSON.stringify({ name: '张三' }));
  storage.setItem('assessment_guest_1', JSON.stringify({ personalityResult: { typeTitle: '尽责稳定型' }, scores: { 1: 5 } }));
  storage.setItem('favorites_guest_1', JSON.stringify(['pos-1', 'pos-2']));

  assert.deepEqual(buildGuestImportPayload(storage), {
    resume: { name: '张三' },
    assessment: { personalityResult: { typeTitle: '尽责稳定型' }, scores: { 1: 5 } },
    favoritePositionIds: ['pos-1', 'pos-2'],
  });
}

const tests = [testGuestJsonRoundTrip, testGuestImportPayloadCollectsLocalData];
for (const test of tests) test();
console.log(`userDataStore.test.ts: ${tests.length} tests passed`);
