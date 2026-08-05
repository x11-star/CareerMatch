import assert from 'node:assert/strict';
import { createDeepSeekProvider } from '../../src/server/ai/deepseekClient';
import { createZhipuProvider } from '../../src/server/ai/zhipuClient';
import type { MatchPositionInput, ResumeParseInput } from '../../src/server/ai/types';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

const resumeInput: ResumeParseInput = {
  sourceType: 'text',
  fileName: 'resume.txt',
  extractedText: '张三，南京大学软件工程，熟悉 TypeScript 和 PostgreSQL。',
};

const matchInput: MatchPositionInput = {
  resumeData: {
    name: '张三',
    school: '南京大学',
    major: '软件工程',
    graduationYear: '2027',
    skills: ['TypeScript'],
    internships: [],
    projects: [],
    inferredDirection: '后端开发',
    targetCities: ['北京'],
  },
  personalityResult: {
    typeTitle: '尽责稳定型',
    hollandCode: 'RCI',
  },
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
    tags: ['校招'],
    summary: '负责后端服务开发。',
    responsibilities: ['开发 API'],
    requirements: ['TypeScript', 'SQL'],
    softSkills: ['沟通协作'],
    salaryDetail: '20-30k',
    careerPath: ['工程师', '高级工程师'],
    fitPersonality: ['尽责性高'],
    howToPrepare: { timeline: ['9月网申'], exam: '技术笔试', interview: '项目深挖' },
    relatedJobs: [],
  },
};

async function testZhipuParseResumeUsesConfiguredEndpointAndModel() {
  const calls: { url: string; init: RequestInit }[] = [];
  const provider = createZhipuProvider({
    apiKey: 'zhipu-key',
    model: 'glm-4-flash',
    fetchFn: async (url, init) => {
      calls.push({ url: String(url), init: init || {} });
      return jsonResponse({
        choices: [{ message: { content: JSON.stringify({
          name: '张三',
          graduationYear: '2027',
          school: '南京大学',
          major: '软件工程',
          skills: ['TypeScript'],
          internships: [],
          projects: [],
          inferredDirection: '后端开发',
          targetCities: ['北京'],
        }) } }],
      });
    },
  });

  const parsed = await provider.parseResume(resumeInput);
  assert.equal(parsed.name, '张三');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://open.bigmodel.cn/api/paas/v4/chat/completions');
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, 'Bearer zhipu-key');
  const body = JSON.parse(String(calls[0].init.body));
  assert.equal(body.model, 'glm-4-flash');
}

async function testDeepSeekMatchPositionParsesJsonResponse() {
  const provider = createDeepSeekProvider({
    apiKey: 'deepseek-key',
    model: 'deepseek-chat',
    fetchFn: async () => jsonResponse({
      choices: [{ message: { content: JSON.stringify({
        resumeMatch: 82,
        personalityMatch: 76,
        overallMatch: 80,
        resumeMatchExplanation: '技能与岗位要求较匹配。',
        personalityMatchExplanation: '性格适配团队协作要求。',
        whyExcellent: '候选人具备较好基础，但需要补充项目证明。',
      }) } }],
    }),
  });

  const result = await provider.matchPosition(matchInput);
  assert.equal(result.overallMatch, 80);
}

async function testProviderHttpFailureThrowsProviderError() {
  const provider = createZhipuProvider({
    apiKey: 'zhipu-key',
    fetchFn: async () => jsonResponse({ error: 'bad request' }, false, 400),
  });

  await assert.rejects(
    () => provider.parseResume(resumeInput),
    /Zhipu API returned status 400/
  );
}

const tests = [
  testZhipuParseResumeUsesConfiguredEndpointAndModel,
  testDeepSeekMatchPositionParsesJsonResponse,
  testProviderHttpFailureThrowsProviderError,
];

for (const test of tests) {
  await test();
}

console.log(`providers.test.ts: ${tests.length} tests passed`);
