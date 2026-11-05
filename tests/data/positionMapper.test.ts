import assert from 'node:assert/strict';
import { CAREER_CATALOG, interviewPracticeQuestions } from '../../src/catalog';
import { toPosition } from '../../src/server/mappers/positionMapper';
import v2Data from '../../prisma/positions-v2.json';

assert.equal(CAREER_CATALOG.length, v2Data._meta.totalPositions);
assert.equal(new Set(CAREER_CATALOG.map(p => p.id)).size, CAREER_CATALOG.length);
assert.equal(new Set(CAREER_CATALOG.map(p => p.title)).size, CAREER_CATALOG.length);
for (const position of CAREER_CATALOG) {
  assert.equal(position.company, '', `${position.title}: no invented company`);
  assert.equal(position.city, '', `${position.title}: no invented city`);
  assert.deepEqual(position.tags, [], `${position.title}: no invented benefits`);
  assert.equal(position.type, 'role-type');
  assert.equal(position.overallMatch, 0);
  assert.equal(position.resumeMatch, 0);
  assert.equal(position.personalityMatch, 0);
  assert.match(position.salaryDetail, /未经.*核验/);
  assert.ok(position.requirements.length && position.responsibilities.length);
  assert.ok(position.title && position.industry && position.category);
  assert.deepEqual(position.howToPrepare.timeline, (v2Data.positions.find(p => p.id === position.id)!.recruitmentTimeline || '').split('→').map(s => s.trim()).filter(Boolean));
  const questions = interviewPracticeQuestions(position);
  assert.equal(questions.length, 3);
  assert.ok(questions.every(question => !position.howToPrepare.timeline.includes(question)));
}
// A database populated by the earlier employer-rotation seed must not leak those assignments.
const career = CAREER_CATALOG[0];
const migrated = toPosition({ ...career, id: 'old-db-id', company: '虚构绑定', city: '北京', tags: ['编制保障'], type: 'internet' } as any);
assert.equal(migrated.id, 'old-db-id');
assert.equal(migrated.company, '');
assert.equal(migrated.city, '');
assert.deepEqual(migrated.tags, []);
assert.equal(migrated.type, 'role-type');
console.log('positionMapper.test.ts: catalog honesty, stable IDs and legacy normalization passed');
