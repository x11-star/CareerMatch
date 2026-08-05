import assert from 'node:assert/strict';
import { AiConfigurationError, AiProviderError } from '../../src/server/ai/errors';
import { createAiService } from '../../src/server/ai/aiService';
import type { AiProvider, MatchPositionInput } from '../../src/server/ai/types';

const matchInput: MatchPositionInput = {
  resumeData: { name: '张三' },
  personalityResult: { typeTitle: '尽责稳定型' },
  position: {
    id: 'pos-0001',
    title: '后端开发工程师',
    company: '示例科技',
    city: '北京',
    type: 'internet',
    overallMatch: 0,
    resumeMatch: 0,
    personalityMatch: 0,
    salaryRange: '20-30k',
    difficultyRating: 4,
    tags: [],
    summary: '负责后端开发。',
    responsibilities: [],
    requirements: [],
    softSkills: [],
    salaryDetail: '20-30k',
    careerPath: [],
    fitPersonality: [],
    howToPrepare: { timeline: [], exam: '', interview: '' },
    relatedJobs: [],
  },
};

function provider(name: 'zhipu' | 'deepseek', configured: boolean, behavior: 'success' | 'fail'): AiProvider {
  return {
    name,
    isConfigured: () => configured,
    async parseResume() {
      if (behavior === 'fail') throw new AiProviderError(name, `${name} failed`);
      return {
        name: '张三',
        graduationYear: '2027',
        school: '南京大学',
        major: '软件工程',
        skills: [],
        internships: [],
        projects: [],
        inferredDirection: '后端开发',
        targetCities: ['北京'],
      };
    },
    async matchPosition() {
      if (behavior === 'fail') throw new AiProviderError(name, `${name} failed`);
      return {
        resumeMatch: name === 'zhipu' ? 90 : 70,
        personalityMatch: 80,
        overallMatch: name === 'zhipu' ? 86 : 74,
        resumeMatchExplanation: `${name} resume`,
        personalityMatchExplanation: `${name} personality`,
        whyExcellent: `${name} why`,
      };
    },
    async chatAboutPosition() {
      if (behavior === 'fail') throw new AiProviderError(name, `${name} failed`);
      return `${name} reply`;
    },
  };
}

async function testUsesZhipuFirstWhenConfigured() {
  const service = createAiService([
    provider('zhipu', true, 'success'),
    provider('deepseek', true, 'success'),
  ]);

  const result = await service.matchPosition(matchInput);
  assert.equal(result.overallMatch, 86);
}

async function testFallsBackToDeepSeekWhenZhipuFails() {
  const service = createAiService([
    provider('zhipu', true, 'fail'),
    provider('deepseek', true, 'success'),
  ]);

  const result = await service.matchPosition(matchInput);
  assert.equal(result.overallMatch, 74);
}

async function testSkipsUnconfiguredProviders() {
  const service = createAiService([
    provider('zhipu', false, 'success'),
    provider('deepseek', true, 'success'),
  ]);

  const reply = await service.chatAboutPosition({ position: matchInput.position, messages: [{ sender: 'user', text: '怎么准备？' }] });
  assert.equal(reply, 'deepseek reply');
}

async function testThrowsConfigurationErrorWhenNoProvidersConfigured() {
  const service = createAiService([
    provider('zhipu', false, 'success'),
    provider('deepseek', false, 'success'),
  ]);

  await assert.rejects(
    () => service.matchPosition(matchInput),
    AiConfigurationError
  );
}

const tests = [
  testUsesZhipuFirstWhenConfigured,
  testFallsBackToDeepSeekWhenZhipuFails,
  testSkipsUnconfiguredProviders,
  testThrowsConfigurationErrorWhenNoProvidersConfigured,
];

for (const test of tests) {
  await test();
}

console.log(`aiService.test.ts: ${tests.length} tests passed`);
