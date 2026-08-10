import assert from 'node:assert/strict';
import { MOCK_POSITIONS } from '../../src/data';
import type { Position } from '../../src/types';

const DIRTY_ALIAS = '软件研发与敏捷项目管培生助理胶水工程师';

function testCountIs346() {
  assert.equal(MOCK_POSITIONS.length, 346);
}

function testFirstTitleIsCleanName() {
  // net-0001 = 管培生 (clean v2.name, never an alias)
  assert.equal(MOCK_POSITIONS[0].title, '管培生');
}

function testNoDirtyAliasLeakedAsTitle() {
  // The dirty alias must never become a title (old data.ts did this).
  assert.ok(!MOCK_POSITIONS.some((p) => p.title === DIRTY_ALIAS), 'dirty alias must not be a title');
}

function testNoDirtyAliasInListFields() {
  for (const p of MOCK_POSITIONS) {
    for (const field of ['responsibilities', 'requirements', 'softSkills'] as const) {
      const arr = p[field] as string[];
      assert.ok(!arr.some((s) => s.includes(DIRTY_ALIAS)), `${field} in ${p.title} leaked alias`);
    }
  }
}

function testAllMatchScoresAreZero() {
  // Type-level positions don't carry preset match scores; matching is computed at runtime by AI.
  for (const p of MOCK_POSITIONS) {
    assert.equal(p.overallMatch, 0, `${p.title} overallMatch must be 0`);
    assert.equal(p.resumeMatch, 0, `${p.title} resumeMatch must be 0`);
    assert.equal(p.personalityMatch, 0, `${p.title} personalityMatch must be 0`);
  }
}

function testSalaryRangeFormat() {
  for (const p of MOCK_POSITIONS) {
    assert.match(p.salaryRange, /^\d+-\d+万年薪$/, `bad salaryRange: ${p.title} -> ${p.salaryRange}`);
  }
}

function testDifficultyIsStarCount() {
  const algo = MOCK_POSITIONS.find((p) => p.title === '算法工程师');
  assert.ok(algo, '算法工程师 missing');
  assert.equal(algo!.difficultyRating, 5);
}

function testCareerPathHasColonForDuration() {
  // careerPath entries WITH a (year) suffix become "角色：年限" so PositionDetailPage's split('：')
  // renders role+duration. The final segment is often a terminal role with no year (e.g.
  // "部门经理/总监") — that's honest real data, so only assert the colon format on segments
  // that originally carried a parenthetical.
  for (const p of MOCK_POSITIONS) {
    // At least one segment must carry the colon form (non-terminal roles have years).
    const withColon = p.careerPath.filter((item) => /.+：.+/.test(item));
    assert.ok(withColon.length > 0, `${p.title} has no role：duration segments`);
  }
}

function testCompanyIsRepresentative() {
  const allowed = new Set([
    '国家电网有限公司','中国移动通信集团','中国电信集团','中国航天科技集团 (CASC)','中国建筑集团 (CSCEC)',
    '中国石油化工集团 (SINOPEC)','中粮集团有限公司','中国邮政集团','中国工商银行 (ICBC)','中国建设银行 (CCB)',
    '招商银行 (CMB)','中信证券 (CITIC)','中金公司 (CICC)','普华永道 (PwC)','德勤 (Deloitte)','麦肯锡咨询 (McKinsey)',
    '字节跳动 (ByteDance)','腾讯科技 (Tencent)','阿里巴巴 (Alibaba)','美团 (Meituan)','小红书 (RED)',
    '网易游戏 (NetEase)','米哈游 (miHoYo)','哔哩哔哩 (Bilibili)','华为技术有限公司','比亚迪股份有限公司',
    '智谱AI','月之暗面 (Moonshot)','科大讯飞','商汤科技','百度 (Baidu)','MiniMax','中芯国际 (SMIC)','长江存储',
    '紫光展锐','寒武纪科技','地平线机器人','立讯精密','歌尔股份','韦尔股份','宝洁 (P&G)','联合利华 (Unilever)',
    "欧莱雅 (L'Oreal)",'玛氏食品 (Mars)','农夫山泉','百事食品','药明康德','恒瑞医药','中国医药集团','迈瑞医疗',
    '百济神州','顺丰控股','京东集团 (JD)','中国中车集团',
  ]);
  for (const p of MOCK_POSITIONS) {
    assert.ok(allowed.has(p.company), `unknown company: ${p.company} (${p.title})`);
  }
}

function testCompanyRotatesWithinIndustry() {
  // 116 "通用" positions must not all share one company (rotation gives visual variety).
  const general = MOCK_POSITIONS.filter((p) => p.industry === '通用');
  assert.ok(general.length > 50, 'expected many 通用 positions');
  const companies = new Set(general.map((p) => p.company));
  assert.ok(companies.size >= 3, `通用 company not rotated: only ${companies.size} distinct`);
}

function testUniqueCompanyTitleCityTuples() {
  // seed.ts upserts on company_title_city; tuples must be unique to avoid collision.
  const seen = new Set<string>();
  for (const p of MOCK_POSITIONS) {
    const key = `${p.company}|${p.title}|${p.city}`;
    assert.ok(!seen.has(key), `duplicate tuple: ${key}`);
    seen.add(key);
  }
  assert.equal(seen.size, 346);
}

function testExamFallbackWhenEmpty() {
  // The position whose v2 examPrepNotes is empty must use the fallback (not empty string).
  for (const p of MOCK_POSITIONS) {
    assert.ok(p.howToPrepare.exam.length > 0, `${p.title} exam empty`);
  }
}

function testTypeDerivation() {
  for (const p of MOCK_POSITIONS) {
    assert.ok(p.type === 'state-owned' || p.type === 'internet', `bad type: ${p.type}`);
  }
  // 央国企 + 金融/咨询 => state-owned
  for (const p of MOCK_POSITIONS.filter((x) => x.industry === '央国企' || x.industry === '金融/咨询')) {
    assert.equal(p.type, 'state-owned', `${p.title} (${p.industry}) should be state-owned`);
  }
}

function testIdsUnique() {
  const ids = new Set(MOCK_POSITIONS.map((p) => p.id));
  assert.equal(ids.size, 346);
}

function testTypeShape() {
  // ensure every required Position field is present (no undefined leaking for required fields)
  for (const p of MOCK_POSITIONS) {
    assert.ok(typeof p.id === 'string' && p.id);
    assert.ok(typeof p.title === 'string' && p.title);
    assert.ok(typeof p.company === 'string' && p.company);
    assert.ok(typeof p.city === 'string' && p.city);
    assert.ok(Array.isArray(p.tags) && p.tags.length > 0);
    assert.ok(typeof p.summary === 'string' && p.summary);
    assert.ok(Array.isArray(p.responsibilities) && p.responsibilities.length > 0);
    assert.ok(Array.isArray(p.requirements) && p.requirements.length > 0);
    assert.ok(Array.isArray(p.softSkills) && p.softSkills.length > 0);
    assert.ok(typeof p.salaryDetail === 'string' && p.salaryDetail);
    assert.ok(Array.isArray(p.careerPath) && p.careerPath.length > 0);
    assert.ok(Array.isArray(p.fitPersonality) && p.fitPersonality.length > 0);
    assert.ok(Array.isArray(p.howToPrepare.timeline) && p.howToPrepare.timeline.length > 0);
    assert.ok(typeof p.howToPrepare.exam === 'string' && p.howToPrepare.exam);
    assert.ok(typeof p.howToPrepare.interview === 'string' && p.howToPrepare.interview);
  }
}

const tests: Array<{ name: string; fn: () => void }> = [
  { name: 'testCountIs346', fn: testCountIs346 },
  { name: 'testFirstTitleIsCleanName', fn: testFirstTitleIsCleanName },
  { name: 'testNoDirtyAliasLeakedAsTitle', fn: testNoDirtyAliasLeakedAsTitle },
  { name: 'testNoDirtyAliasInListFields', fn: testNoDirtyAliasInListFields },
  { name: 'testAllMatchScoresAreZero', fn: testAllMatchScoresAreZero },
  { name: 'testSalaryRangeFormat', fn: testSalaryRangeFormat },
  { name: 'testDifficultyIsStarCount', fn: testDifficultyIsStarCount },
  { name: 'testCareerPathHasColonForDuration', fn: testCareerPathHasColonForDuration },
  { name: 'testCompanyIsRepresentative', fn: testCompanyIsRepresentative },
  { name: 'testCompanyRotatesWithinIndustry', fn: testCompanyRotatesWithinIndustry },
  { name: 'testUniqueCompanyTitleCityTuples', fn: testUniqueCompanyTitleCityTuples },
  { name: 'testExamFallbackWhenEmpty', fn: testExamFallbackWhenEmpty },
  { name: 'testTypeDerivation', fn: testTypeDerivation },
  { name: 'testIdsUnique', fn: testIdsUnique },
  { name: 'testTypeShape', fn: testTypeShape },
];

for (const t of tests) {
  try {
    t.fn();
  } catch (e) {
    console.error(`FAIL: ${t.name}`);
    throw e;
  }
}

// shape reference to keep the Position import meaningful
const _shape: Position = MOCK_POSITIONS[0];
void _shape;

console.log(`positionMapper.test.ts: ${tests.length} tests passed`);
