import assert from 'node:assert/strict';
import { DEFAULT_RESUME_DATA } from '../../src/data';
import { hasRealResumeData } from '../../src/lib/resumeState';

function testDefaultResumeDataIsNotRealUserData() {
  assert.equal(hasRealResumeData(DEFAULT_RESUME_DATA), false);
}

function testParsedResumeDataIsRealUserData() {
  assert.equal(hasRealResumeData({ ...DEFAULT_RESUME_DATA, name: '李同学', school: '', major: '', skills: [] }), true);
}

const tests = [testDefaultResumeDataIsNotRealUserData, testParsedResumeDataIsRealUserData];
for (const test of tests) test();
console.log(`resumeState.test.ts: ${tests.length} tests passed`);
