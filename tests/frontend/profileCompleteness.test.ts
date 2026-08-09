import assert from 'node:assert/strict';
import { formatProfileCompleteness } from '../../src/lib/profileCompleteness';

function testCountsAllCompletedProfileInputs() {
  const result = formatProfileCompleteness({
    displayName: '张同学',
    displaySchool: '北京大学',
    displayMajor: '软件工程',
    hasResume: true,
    hasAssessment: true,
  });

  assert.equal(result, '5/5 项');
}

function testCountsPartialProfileInputs() {
  const result = formatProfileCompleteness({
    displayName: '未完善',
    displaySchool: '北京大学',
    displayMajor: '未完善',
    hasResume: true,
    hasAssessment: false,
  });

  assert.equal(result, '2/5 项');
}

const tests = [testCountsAllCompletedProfileInputs, testCountsPartialProfileInputs];
for (const test of tests) test();
console.log(`profileCompleteness.test.ts: ${tests.length} tests passed`);
