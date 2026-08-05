import assert from 'node:assert/strict';
import {
  cleanAndParseJSON,
  validateChatReply,
  validateMatchResult,
  validateResumeData,
} from '../../src/server/ai/schemas';

function testCleanAndParseJSONStripsMarkdownFence() {
  const parsed = cleanAndParseJSON('```json\n{"name":"张三"}\n```');
  assert.deepEqual(parsed, { name: '张三' });
}

function testValidateResumeDataAcceptsCompleteResume() {
  const resume = validateResumeData({
    name: '张三',
    graduationYear: '2027',
    school: '南京大学',
    major: '软件工程',
    skills: ['TypeScript', 'SQL'],
    internships: [{ company: '字节跳动', role: '后端实习生', duration: '2025.06-2025.09' }],
    projects: [{ name: '岗位匹配系统', role: '负责人', tech: 'React, Node.js, PostgreSQL' }],
    inferredDirection: '后端开发工程师',
    targetCities: ['北京', '上海'],
  });

  assert.equal(resume.name, '张三');
  assert.deepEqual(resume.skills, ['TypeScript', 'SQL']);
}

function testValidateResumeDataRejectsMissingRequiredFields() {
  assert.throws(
    () => validateResumeData({ name: '张三' }),
    /简历解析结果缺少字段: graduationYear/
  );
}

function testValidateMatchResultClampsNothingAndRequiresNumbers() {
  const result = validateMatchResult({
    resumeMatch: 82,
    personalityMatch: 76,
    overallMatch: 80,
    resumeMatchExplanation: '专业、项目和技能与岗位要求较匹配。',
    personalityMatchExplanation: '性格特质符合岗位协作和抗压要求。',
    whyExcellent: '候选人具备较好的基础，但仍需要补充相关项目证明。',
  });

  assert.equal(result.overallMatch, 80);
}

function testValidateMatchResultRejectsOutOfRangeScore() {
  assert.throws(
    () => validateMatchResult({
      resumeMatch: 101,
      personalityMatch: 76,
      overallMatch: 80,
      resumeMatchExplanation: 'x',
      personalityMatchExplanation: 'y',
      whyExcellent: 'z',
    }),
    /resumeMatch 必须是 0 到 100 的整数/
  );
}

function testValidateChatReplyAcceptsObjectOrString() {
  assert.equal(validateChatReply({ reply: '建议重点准备项目复盘。' }), '建议重点准备项目复盘。');
  assert.equal(validateChatReply('建议重点准备项目复盘。'), '建议重点准备项目复盘。');
}

const tests = [
  testCleanAndParseJSONStripsMarkdownFence,
  testValidateResumeDataAcceptsCompleteResume,
  testValidateResumeDataRejectsMissingRequiredFields,
  testValidateMatchResultClampsNothingAndRequiresNumbers,
  testValidateMatchResultRejectsOutOfRangeScore,
  testValidateChatReplyAcceptsObjectOrString,
];

for (const test of tests) {
  test();
}

console.log(`schemas.test.ts: ${tests.length} tests passed`);
