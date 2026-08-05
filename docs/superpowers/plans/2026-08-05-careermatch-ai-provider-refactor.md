# CareerMatch AI Provider Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current Gemini/DeepSeek-in-server implementation with a backend AI provider module where Zhipu is primary, DeepSeek is fallback, and missing API keys produce honest configuration errors instead of fake AI results.

**Architecture:** AI calls move out of `server.ts` into focused server-side modules under `src/server/ai/`. Route handlers keep responsibility for HTTP, file text extraction, and response codes; `aiService` owns provider ordering, JSON validation, and normalized errors. Gemini is removed from code, dependencies, tests, and documentation.

**Tech Stack:** TypeScript, Express, `tsx`, Node built-in `fetch`, Node built-in `assert`, existing `pdf-parse` and `mammoth`, Zhipu OpenAI-compatible chat completions API, DeepSeek chat completions API.

## Global Constraints

- AI calls must be backend-only; the frontend never receives provider API keys.
- `ZHIPU_MODEL` defaults to `glm-4-flash`.
- `DEEPSEEK_MODEL` defaults to `deepseek-chat`.
- Delete Gemini usage and `GEMINI_API_KEY`.
- Provider order is Zhipu first, DeepSeek fallback second.
- If neither usable provider key is configured, return a clear configuration error; do not return default resumes, random matching scores, or template chat answers as if they were AI output.
- This plan does not implement OCR; image and scanned-PDF OCR are covered by the next plan.
- Keep PDF text extraction and DOCX extraction working through existing `pdf-parse` and `mammoth` code.
- Do not do broad UI redesign in this plan; only change UI copy needed to honestly surface AI configuration errors.

---

## File Structure

Create these focused AI files:

- `src/server/ai/errors.ts` — normalized AI error classes and HTTP status mapping.
- `src/server/ai/types.ts` — provider names, AI input/output interfaces, and provider interface.
- `src/server/ai/schemas.ts` — JSON cleanup, parse helpers, and runtime validation for resume and match results.
- `src/server/ai/prompts.ts` — prompt builders for resume parsing, position matching, and position chat.
- `src/server/ai/zhipuClient.ts` — Zhipu provider implementation.
- `src/server/ai/deepseekClient.ts` — DeepSeek provider implementation.
- `src/server/ai/aiService.ts` — provider orchestration and exported methods consumed by HTTP routes.

Create these tests:

- `tests/ai/schemas.test.ts` — no-network tests for JSON parsing and validation.
- `tests/ai/providers.test.ts` — mocked-fetch tests for provider request shape and response handling.
- `tests/ai/aiService.test.ts` — no-network tests for provider priority, fallback, and missing-key errors.

Modify these existing files:

- `server.ts` — remove Gemini client and delegate AI work to `aiService`.
- `.env.example` — replace Gemini with Zhipu + DeepSeek environment variables.
- `package.json` — remove `@google/genai`, add `test:ai`, add `typecheck` while keeping `lint` as a compatibility alias if desired.
- `package-lock.json` — regenerate after dependency removal.
- `README.md` — update AI setup instructions and remove Gemini references.
- `test_gemini.ts` — delete.

---

### Task 1: AI Types, Errors, Schemas, and No-Network Schema Tests

**Files:**
- Create: `src/server/ai/errors.ts`
- Create: `src/server/ai/types.ts`
- Create: `src/server/ai/schemas.ts`
- Create: `tests/ai/schemas.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `AiError`, `AiConfigurationError`, `AiProviderError`, `toHttpAiError(error: unknown): { status: number; body: { error: string; code: string; provider?: string } }`
- Produces: `ResumeParseInput`, `MatchPositionInput`, `PositionChatInput`, `MatchResult`, `AiProvider`, `AiProviderName`
- Produces: `cleanAndParseJSON(rawText: string): unknown`, `validateResumeData(value: unknown): ResumeData`, `validateMatchResult(value: unknown): MatchResult`, `validateChatReply(value: unknown): string`
- Consumes: existing `ResumeData`, `PersonalityResult`, and `Position` types from `src/types.ts`

- [ ] **Step 1: Add the AI test script to `package.json`**

Add scripts so the no-network tests can run before any provider integration:

```json
{
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "start": "node dist/server.cjs",
    "preview": "vite preview",
    "clean": "rm -rf dist server.js",
    "typecheck": "tsc --noEmit",
    "lint": "tsc --noEmit",
    "test:ai": "tsx tests/ai/*.test.ts"
  }
}
```

Keep all existing dependencies unchanged in this task.

- [ ] **Step 2: Write the failing schema tests**

Create `tests/ai/schemas.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the schema tests to verify they fail**

Run:

```bash
npm run test:ai
```

Expected: FAIL with an import error because `src/server/ai/schemas.ts` does not exist yet.

- [ ] **Step 4: Implement `errors.ts`**

Create `src/server/ai/errors.ts`:

```ts
export type AiErrorCode =
  | 'AI_CONFIGURATION_MISSING'
  | 'AI_PROVIDER_FAILED'
  | 'AI_RESPONSE_INVALID';

export class AiError extends Error {
  code: AiErrorCode;
  provider?: string;

  constructor(message: string, code: AiErrorCode, provider?: string) {
    super(message);
    this.name = 'AiError';
    this.code = code;
    this.provider = provider;
  }
}

export class AiConfigurationError extends AiError {
  constructor(message = 'AI 服务未配置，请在 .env 中填写 ZHIPU_API_KEY 或 DEEPSEEK_API_KEY') {
    super(message, 'AI_CONFIGURATION_MISSING');
    this.name = 'AiConfigurationError';
  }
}

export class AiProviderError extends AiError {
  constructor(provider: string, message: string) {
    super(message, 'AI_PROVIDER_FAILED', provider);
    this.name = 'AiProviderError';
  }
}

export class AiResponseInvalidError extends AiError {
  constructor(provider: string, message: string) {
    super(message, 'AI_RESPONSE_INVALID', provider);
    this.name = 'AiResponseInvalidError';
  }
}

export function toHttpAiError(error: unknown): {
  status: number;
  body: { error: string; code: AiErrorCode | 'UNKNOWN_ERROR'; provider?: string };
} {
  if (error instanceof AiConfigurationError) {
    return { status: 503, body: { error: error.message, code: error.code } };
  }

  if (error instanceof AiError) {
    return {
      status: 502,
      body: { error: error.message, code: error.code, provider: error.provider },
    };
  }

  if (error instanceof Error) {
    return { status: 500, body: { error: error.message, code: 'UNKNOWN_ERROR' } };
  }

  return { status: 500, body: { error: '未知 AI 服务错误', code: 'UNKNOWN_ERROR' } };
}
```

- [ ] **Step 5: Implement `types.ts`**

Create `src/server/ai/types.ts`:

```ts
import type { PersonalityResult, Position, ResumeData } from '../../types';

export type AiProviderName = 'zhipu' | 'deepseek';

export interface ResumeParseInput {
  extractedText: string;
  fileName?: string;
  sourceType: 'text' | 'pdf' | 'docx' | 'txt';
}

export interface MatchResult {
  resumeMatch: number;
  personalityMatch: number;
  overallMatch: number;
  resumeMatchExplanation: string;
  personalityMatchExplanation: string;
  whyExcellent: string;
}

export interface MatchPositionInput {
  resumeData: Partial<ResumeData>;
  personalityResult: Partial<PersonalityResult>;
  position: Position;
}

export interface ChatMessageInput {
  sender: 'user' | 'assistant' | 'model';
  text: string;
}

export interface PositionChatInput {
  position: Position;
  messages: ChatMessageInput[];
  resumeData?: Partial<ResumeData>;
}

export interface AiProvider {
  name: AiProviderName;
  isConfigured(): boolean;
  parseResume(input: ResumeParseInput): Promise<ResumeData>;
  matchPosition(input: MatchPositionInput): Promise<MatchResult>;
  chatAboutPosition(input: PositionChatInput): Promise<string>;
}
```

- [ ] **Step 6: Implement `schemas.ts`**

Create `src/server/ai/schemas.ts`:

```ts
import type { ResumeData } from '../../types';
import type { MatchResult } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string') {
    throw new Error(`字段 ${key} 必须是字符串`);
  }
  return value;
}

function requireStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`字段 ${key} 必须是字符串数组`);
  }
  return value;
}

function requireScore(record: Record<string, unknown>, key: keyof MatchResult): number {
  const value = record[key];
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new Error(`${key} 必须是 0 到 100 的整数`);
  }
  return value;
}

function requireObjectArray<T extends Record<string, string>>(
  record: Record<string, unknown>,
  key: string,
  requiredKeys: (keyof T)[]
): T[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    throw new Error(`字段 ${key} 必须是数组`);
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`字段 ${key}[${index}] 必须是对象`);
    }

    const parsed: Record<string, string> = {};
    for (const requiredKey of requiredKeys) {
      const raw = item[requiredKey as string];
      if (typeof raw !== 'string') {
        throw new Error(`字段 ${key}[${index}].${String(requiredKey)} 必须是字符串`);
      }
      parsed[requiredKey as string] = raw;
    }
    return parsed as T;
  });
}

export function cleanAndParseJSON(rawText: string): unknown {
  let cleaned = rawText.trim();

  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw firstError;
    }
    return JSON.parse(jsonMatch[0]);
  }
}

export function validateResumeData(value: unknown): ResumeData {
  if (!isRecord(value)) {
    throw new Error('简历解析结果必须是对象');
  }

  const requiredFields = [
    'name',
    'graduationYear',
    'school',
    'major',
    'skills',
    'internships',
    'projects',
    'inferredDirection',
    'targetCities',
  ];

  for (const field of requiredFields) {
    if (!(field in value)) {
      throw new Error(`简历解析结果缺少字段: ${field}`);
    }
  }

  return {
    name: requireString(value, 'name'),
    graduationYear: requireString(value, 'graduationYear'),
    school: requireString(value, 'school'),
    major: requireString(value, 'major'),
    skills: requireStringArray(value, 'skills'),
    internships: requireObjectArray(value, 'internships', ['company', 'role', 'duration']),
    projects: requireObjectArray(value, 'projects', ['name', 'role', 'tech']),
    inferredDirection: requireString(value, 'inferredDirection'),
    targetCities: requireStringArray(value, 'targetCities'),
  };
}

export function validateMatchResult(value: unknown): MatchResult {
  if (!isRecord(value)) {
    throw new Error('岗位匹配结果必须是对象');
  }

  return {
    resumeMatch: requireScore(value, 'resumeMatch'),
    personalityMatch: requireScore(value, 'personalityMatch'),
    overallMatch: requireScore(value, 'overallMatch'),
    resumeMatchExplanation: requireString(value, 'resumeMatchExplanation'),
    personalityMatchExplanation: requireString(value, 'personalityMatchExplanation'),
    whyExcellent: requireString(value, 'whyExcellent'),
  };
}

export function validateChatReply(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (isRecord(value) && typeof value.reply === 'string' && value.reply.trim()) {
    return value.reply.trim();
  }

  throw new Error('岗位问答结果必须是非空字符串或包含 reply 字段的对象');
}
```

- [ ] **Step 7: Run schema tests and typecheck**

Run:

```bash
npm run test:ai
npm run typecheck
```

Expected: `schemas.test.ts` passes. `typecheck` may still fail only if later tasks are needed because server integration is not done; if it fails here, the failure must not be from files created in this task.

- [ ] **Step 8: Commit Task 1**

```bash
git add package.json src/server/ai/errors.ts src/server/ai/types.ts src/server/ai/schemas.ts tests/ai/schemas.test.ts
git commit -m "feat: add AI schema validation"
```

---

### Task 2: Provider Clients with Mocked Fetch Tests

**Files:**
- Create: `src/server/ai/prompts.ts`
- Create: `src/server/ai/zhipuClient.ts`
- Create: `src/server/ai/deepseekClient.ts`
- Create: `tests/ai/providers.test.ts`

**Interfaces:**
- Consumes: `AiProvider`, `ResumeParseInput`, `MatchPositionInput`, `PositionChatInput`
- Produces: `buildResumeParsePrompt(input: ResumeParseInput): string`
- Produces: `buildMatchPositionPrompt(input: MatchPositionInput): string`
- Produces: `buildPositionChatPrompt(input: PositionChatInput): string`
- Produces: `createZhipuProvider(options?: { apiKey?: string; model?: string; fetchFn?: typeof fetch }): AiProvider`
- Produces: `createDeepSeekProvider(options?: { apiKey?: string; model?: string; fetchFn?: typeof fetch }): AiProvider`

- [ ] **Step 1: Write mocked provider tests**

Create `tests/ai/providers.test.ts`:

```ts
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
```

- [ ] **Step 2: Run provider tests to verify they fail**

Run:

```bash
npm run test:ai
```

Expected: FAIL because `zhipuClient.ts`, `deepseekClient.ts`, and `prompts.ts` do not exist.

- [ ] **Step 3: Implement prompt builders**

Create `src/server/ai/prompts.ts`:

```ts
import type { MatchPositionInput, PositionChatInput, ResumeParseInput } from './types';

export function buildResumeParsePrompt(input: ResumeParseInput): string {
  return `请深度解析以下简历，并根据其背景与优势匹配得出结构化 JSON 数据。\n\n来源类型：${input.sourceType}\n文件名：${input.fileName || '未提供'}\n\n简历内容：\n${input.extractedText}\n\n请严格输出以下 JSON，不要包含 markdown 或额外解释：\n{\n  "name": "姓名",\n  "graduationYear": "毕业年份，例如2027",\n  "school": "就读院校",\n  "major": "就读专业",\n  "skills": ["技能1"],\n  "internships": [{ "company": "公司名", "role": "岗位/角色", "duration": "时间范围" }],\n  "projects": [{ "name": "项目名", "role": "角色/职责", "tech": "技术栈描述" }],\n  "inferredDirection": "AI推断的求职方向",\n  "targetCities": ["城市1"]\n}`;
}

export function buildMatchPositionPrompt(input: MatchPositionInput): string {
  const resume = input.resumeData || {};
  const personality = input.personalityResult || {};
  const position = input.position;

  return `你是一位严谨、专业且直言不讳的校招招聘专家与职业规划导师。请根据候选人的真实简历、职业性格测评结果和目标岗位要求，进行严格匹配评估。不要客套，不要编造不存在的实习、项目或认证。\n\n=== 候选人简历 ===\n姓名: ${resume.name || '未提供'}\n学校: ${resume.school || '未提供'}\n专业: ${resume.major || '未提供'}\n毕业年份: ${resume.graduationYear || '未提供'}\n核心技能: ${(resume.skills || []).join(', ') || '未提供'}\n实习经历: ${JSON.stringify(resume.internships || [])}\n项目经历: ${JSON.stringify(resume.projects || [])}\nAI推断方向: ${resume.inferredDirection || '未提供'}\n期望城市: ${(resume.targetCities || []).join(', ') || '未提供'}\n\n=== 职业测评 ===\n性格类型: ${personality.typeTitle || '未测评'}\n霍兰德代码: ${personality.hollandCode || '未测评'}\n雷达分: ${JSON.stringify(personality.radarScores || [])}\n\n=== 目标岗位 ===\n公司: ${position.company}\n岗位: ${position.title}\n城市: ${position.city}\n类型: ${position.type}\n概述: ${position.summary}\n职责: ${(position.responsibilities || []).join('; ')}\n硬技能要求: ${(position.requirements || []).join(', ')}\n软技能要求: ${(position.softSkills || []).join('; ')}\n\n请严格输出以下 JSON，不要包含 markdown 或额外解释：\n{\n  "resumeMatch": 0,\n  "personalityMatch": 0,\n  "overallMatch": 0,\n  "resumeMatchExplanation": "100-150字，指出硬条件优势或短板",\n  "personalityMatchExplanation": "100-150字，结合性格与岗位氛围",\n  "whyExcellent": "150-250字，真实评价胜任情况和补救建议"\n}`;
}

export function buildPositionChatPrompt(input: PositionChatInput): string {
  const position = input.position;
  const resume = input.resumeData || {};
  const latestQuestion = [...input.messages].reverse().find((message) => message.sender === 'user')?.text || '请介绍这个岗位如何准备。';

  return `你是一名熟悉央国企和互联网校招的职业导师。请基于岗位信息和候选人背景回答用户问题，控制在 200 字以内，真实、具体、不编造。\n\n岗位：${position.company} · ${position.title}\n城市：${position.city}\n薪资：${position.salaryRange}\n岗位概述：${position.summary}\n岗位要求：${(position.requirements || []).join(', ')}\n候选人：${resume.name || '求职学子'}，${resume.school || '学校未提供'}，${resume.major || '专业未提供'}\n\n用户问题：${latestQuestion}`;
}
```

- [ ] **Step 4: Implement Zhipu provider**

Create `src/server/ai/zhipuClient.ts`:

```ts
import { AiProviderError, AiResponseInvalidError } from './errors';
import { buildMatchPositionPrompt, buildPositionChatPrompt, buildResumeParsePrompt } from './prompts';
import { cleanAndParseJSON, validateChatReply, validateMatchResult, validateResumeData } from './schemas';
import type { AiProvider, MatchPositionInput, PositionChatInput, ResumeParseInput } from './types';

interface ProviderOptions {
  apiKey?: string;
  model?: string;
  fetchFn?: typeof fetch;
}

const ZHIPU_ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

function extractContent(provider: string, data: any): string {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new AiResponseInvalidError(provider, 'Zhipu API 返回内容为空');
  }
  return content;
}

export function createZhipuProvider(options: ProviderOptions = {}): AiProvider {
  const apiKey = options.apiKey ?? process.env.ZHIPU_API_KEY ?? '';
  const model = options.model ?? process.env.ZHIPU_MODEL ?? 'glm-4-flash';
  const fetchFn = options.fetchFn ?? fetch;

  async function complete(prompt: string): Promise<string> {
    const response = await fetchFn(ZHIPU_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是专业、严谨的中文校招求职分析助手。必须按用户要求输出。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new AiProviderError('zhipu', `Zhipu API returned status ${response.status}`);
    }

    const data = await response.json();
    return extractContent('zhipu', data);
  }

  return {
    name: 'zhipu',
    isConfigured: () => Boolean(apiKey),
    async parseResume(input: ResumeParseInput) {
      const content = await complete(buildResumeParsePrompt(input));
      return validateResumeData(cleanAndParseJSON(content));
    },
    async matchPosition(input: MatchPositionInput) {
      const content = await complete(buildMatchPositionPrompt(input));
      return validateMatchResult(cleanAndParseJSON(content));
    },
    async chatAboutPosition(input: PositionChatInput) {
      const content = await complete(buildPositionChatPrompt(input));
      try {
        return validateChatReply(cleanAndParseJSON(content));
      } catch {
        return validateChatReply(content);
      }
    },
  };
}
```

- [ ] **Step 5: Implement DeepSeek provider**

Create `src/server/ai/deepseekClient.ts`:

```ts
import { AiProviderError, AiResponseInvalidError } from './errors';
import { buildMatchPositionPrompt, buildPositionChatPrompt, buildResumeParsePrompt } from './prompts';
import { cleanAndParseJSON, validateChatReply, validateMatchResult, validateResumeData } from './schemas';
import type { AiProvider, MatchPositionInput, PositionChatInput, ResumeParseInput } from './types';

interface ProviderOptions {
  apiKey?: string;
  model?: string;
  fetchFn?: typeof fetch;
}

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';

function extractContent(provider: string, data: any): string {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new AiResponseInvalidError(provider, 'DeepSeek API 返回内容为空');
  }
  return content;
}

export function createDeepSeekProvider(options: ProviderOptions = {}): AiProvider {
  const apiKey = options.apiKey ?? process.env.DEEPSEEK_API_KEY ?? '';
  const model = options.model ?? process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';
  const fetchFn = options.fetchFn ?? fetch;

  async function complete(prompt: string): Promise<string> {
    const response = await fetchFn(DEEPSEEK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是专业、严谨的中文校招求职分析助手。必须按用户要求输出。' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new AiProviderError('deepseek', `DeepSeek API returned status ${response.status}`);
    }

    const data = await response.json();
    return extractContent('deepseek', data);
  }

  return {
    name: 'deepseek',
    isConfigured: () => Boolean(apiKey),
    async parseResume(input: ResumeParseInput) {
      const content = await complete(buildResumeParsePrompt(input));
      return validateResumeData(cleanAndParseJSON(content));
    },
    async matchPosition(input: MatchPositionInput) {
      const content = await complete(buildMatchPositionPrompt(input));
      return validateMatchResult(cleanAndParseJSON(content));
    },
    async chatAboutPosition(input: PositionChatInput) {
      const content = await complete(buildPositionChatPrompt(input));
      try {
        return validateChatReply(cleanAndParseJSON(content));
      } catch {
        return validateChatReply(content);
      }
    },
  };
}
```

- [ ] **Step 6: Run provider tests**

Run:

```bash
npm run test:ai
```

Expected: `schemas.test.ts` and `providers.test.ts` pass.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/server/ai/prompts.ts src/server/ai/zhipuClient.ts src/server/ai/deepseekClient.ts tests/ai/providers.test.ts
git commit -m "feat: add Zhipu and DeepSeek AI providers"
```

---

### Task 3: AI Service Orchestration and Fallback Tests

**Files:**
- Create: `src/server/ai/aiService.ts`
- Create: `tests/ai/aiService.test.ts`

**Interfaces:**
- Consumes: `AiProvider`
- Produces: `createAiService(providers?: AiProvider[]): { parseResume(input): Promise<ResumeData>; matchPosition(input): Promise<MatchResult>; chatAboutPosition(input): Promise<string> }`
- Produces: `defaultAiService`

- [ ] **Step 1: Write AI service tests**

Create `tests/ai/aiService.test.ts`:

```ts
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
```

- [ ] **Step 2: Run AI service tests to verify they fail**

Run:

```bash
npm run test:ai
```

Expected: FAIL because `src/server/ai/aiService.ts` does not exist.

- [ ] **Step 3: Implement `aiService.ts`**

Create `src/server/ai/aiService.ts`:

```ts
import { createDeepSeekProvider } from './deepseekClient';
import { AiConfigurationError, AiProviderError } from './errors';
import { createZhipuProvider } from './zhipuClient';
import type { AiProvider, MatchPositionInput, PositionChatInput, ResumeParseInput } from './types';

async function callWithFallback<T>(providers: AiProvider[], action: (provider: AiProvider) => Promise<T>): Promise<T> {
  const configuredProviders = providers.filter((provider) => provider.isConfigured());

  if (configuredProviders.length === 0) {
    throw new AiConfigurationError();
  }

  let lastError: unknown = null;
  for (const provider of configuredProviders) {
    try {
      return await action(provider);
    } catch (error) {
      lastError = error;
      console.error(`[AI] ${provider.name} failed, trying next provider if available:`, error);
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new AiProviderError('all', '所有 AI Provider 调用失败');
}

export function createAiService(providers: AiProvider[] = [createZhipuProvider(), createDeepSeekProvider()]) {
  return {
    parseResume(input: ResumeParseInput) {
      return callWithFallback(providers, (provider) => provider.parseResume(input));
    },
    matchPosition(input: MatchPositionInput) {
      return callWithFallback(providers, (provider) => provider.matchPosition(input));
    },
    chatAboutPosition(input: PositionChatInput) {
      return callWithFallback(providers, (provider) => provider.chatAboutPosition(input));
    },
  };
}

export const defaultAiService = createAiService();
```

- [ ] **Step 4: Run AI tests**

Run:

```bash
npm run test:ai
```

Expected: all AI tests pass.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/server/ai/aiService.ts tests/ai/aiService.test.ts
git commit -m "feat: orchestrate AI provider fallback"
```

---

### Task 4: Integrate AI Service into Express Routes and Remove Fake AI Fallbacks

**Files:**
- Modify: `server.ts`

**Interfaces:**
- Consumes: `defaultAiService.parseResume(input)`
- Consumes: `defaultAiService.matchPosition(input)`
- Consumes: `defaultAiService.chatAboutPosition(input)`
- Consumes: `toHttpAiError(error)`
- Produces: HTTP route behavior where AI errors are honest JSON errors with appropriate status codes.

- [ ] **Step 1: Create a backup diff of current AI code locations**

Run:

```bash
git diff -- server.ts
```

Expected: no unrelated local edits in `server.ts`. If there are unrelated user edits, stop and ask before editing this task.

- [ ] **Step 2: Remove Gemini imports and client initialization from `server.ts`**

Remove these imports and initialization blocks:

```ts
import { GoogleGenAI, Type } from "@google/genai";
```

Remove the `const ai = new GoogleGenAI(...)` block.

Remove `RESUME_SCHEMA` and `MATCH_SCHEMA` constants if they only exist for Gemini response schema usage.

Add imports:

```ts
import { defaultAiService } from "./src/server/ai/aiService";
import { toHttpAiError } from "./src/server/ai/errors";
```

- [ ] **Step 3: Replace the AI section of `/api/parse-resume`**

Keep existing text extraction for text, TXT, DOCX, and text PDF. For image files in this plan, return an honest not-yet-available response because OCR is implemented in the next plan.

Use this route-level behavior after `finalPromptText` has been populated with extracted text:

```ts
if (isMultiModalFile) {
  return res.status(501).json({
    error: "图片简历解析需要 OCR 模块，下一阶段实现。本阶段支持文本、DOCX 和可提取文字的 PDF。",
    code: "OCR_NOT_IMPLEMENTED"
  });
}

try {
  const parsed = await defaultAiService.parseResume({
    extractedText: finalPromptText,
    fileName,
    sourceType: mimeType === "application/pdf" ? "pdf" : mimeType?.includes("word") ? "docx" : "text",
  });
  return res.json(parsed);
} catch (error) {
  const httpError = toHttpAiError(error);
  return res.status(httpError.status).json(httpError.body);
}
```

Remove the old DeepSeek inline fetch and Gemini fallback branches from this route.

- [ ] **Step 4: Replace `/api/match-position` AI logic**

Delete the old Gemini branch and delete use of `calculateRuleBasedMatch()` as the returned AI fallback.

Replace the body after input validation with:

```ts
try {
  const matchResult = await defaultAiService.matchPosition({
    resumeData: activeResume,
    personalityResult: activePersonality,
    position,
  });
  return res.json(matchResult);
} catch (error) {
  const httpError = toHttpAiError(error);
  return res.status(httpError.status).json(httpError.body);
}
```

If `calculateRuleBasedMatch` is no longer referenced anywhere, remove the function entirely so no random scoring remains in shipped code.

- [ ] **Step 5: Replace `/api/position-chat` AI logic**

Delete the old Gemini call and template fallback response.

Replace the route internals with:

```ts
try {
  const reply = await defaultAiService.chatAboutPosition({
    position,
    messages: (messages || []).map((m: any) => ({
      sender: m.sender === "user" ? "user" : "assistant",
      text: String(m.text || ""),
    })),
    resumeData,
  });
  return res.json({ reply });
} catch (error) {
  const httpError = toHttpAiError(error);
  return res.status(httpError.status).json(httpError.body);
}
```

- [ ] **Step 6: Run AI tests and typecheck**

Run:

```bash
npm run test:ai
npm run typecheck
```

Expected: AI tests pass. Typecheck passes or reveals only integration type issues from this task; fix all such issues before continuing.

- [ ] **Step 7: Smoke test missing-key behavior**

Run the server without AI keys:

```bash
npm run dev
```

In another terminal, run:

```bash
curl -sS -X POST http://localhost:3000/api/match-position \
  -H "Content-Type: application/json" \
  -d '{"position":{"id":"pos-1","title":"后端开发","company":"示例公司","city":"北京","type":"internet","overallMatch":0,"resumeMatch":0,"personalityMatch":0,"salaryRange":"20-30k","difficultyRating":3,"tags":[],"summary":"负责后端开发","responsibilities":[],"requirements":[],"softSkills":[],"salaryDetail":"20-30k","careerPath":[],"fitPersonality":[],"howToPrepare":{"timeline":[],"exam":"","interview":""},"relatedJobs":[]}}'
```

Expected response includes:

```json
{
  "code": "AI_CONFIGURATION_MISSING"
}
```

- [ ] **Step 8: Commit Task 4**

```bash
git add server.ts
git commit -m "refactor: route AI calls through provider service"
```

---

### Task 5: Frontend Error Copy for Honest AI Configuration Failures

**Files:**
- Modify: `src/components/ResumeUploadPage.tsx`
- Modify: `src/components/PositionDetailPage.tsx`

**Interfaces:**
- Consumes: AI error response `{ error: string; code: string; provider?: string }`
- Produces: user-visible copy that distinguishes missing AI configuration from generic failures.

- [ ] **Step 1: Add API error parsing helper inside `ResumeUploadPage.tsx`**

Near `triggerRealAiParse`, add this helper:

```ts
async function parseApiError(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  if (body?.code === 'AI_CONFIGURATION_MISSING') {
    return 'AI 服务未配置：请在 .env 中填写 ZHIPU_API_KEY 或 DEEPSEEK_API_KEY 后重启服务。';
  }
  if (body?.code === 'OCR_NOT_IMPLEMENTED') {
    return body.error || '图片简历解析将在 OCR 模块完成后开放，请先上传 PDF、DOCX、TXT 或粘贴文本。';
  }
  return body?.error || `解析服务器返回错误：HTTP ${response.status}`;
}
```

Then replace the existing non-ok error block with:

```ts
if (!response.ok) {
  throw new Error(await parseApiError(response));
}
```

- [ ] **Step 2: Add API error parsing helper inside `PositionDetailPage.tsx`**

Inside the component, before the `useEffect`, add:

```ts
async function parseMatchApiError(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  if (body?.code === 'AI_CONFIGURATION_MISSING') {
    return 'AI 匹配服务未配置：请在 .env 中填写 ZHIPU_API_KEY 或 DEEPSEEK_API_KEY 后重启服务。';
  }
  return body?.error || `获取 AI 匹配评估失败：HTTP ${response.status}`;
}
```

Replace:

```ts
throw new Error(`HTTP 错误 ${response.status}`);
```

with:

```ts
throw new Error(await parseMatchApiError(response));
```

- [ ] **Step 3: Ensure the match error is visible in the rendered detail page**

If `matchError` is only set but not displayed, add this block above the matching score cards in `PositionDetailPage.tsx`:

```tsx
{matchError && (
  <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
    {matchError}
  </div>
)}
```

- [ ] **Step 4: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Browser smoke test missing-key copy**

Run:

```bash
npm run dev
```

Open `http://localhost:3000`, navigate to upload, paste resume text, and submit with no AI keys configured.

Expected: Upload page shows copy containing:

```text
AI 服务未配置
```

Navigate to a position detail page with no AI keys configured.

Expected: Detail page shows copy containing:

```text
AI 匹配服务未配置
```

- [ ] **Step 6: Commit Task 5**

```bash
git add src/components/ResumeUploadPage.tsx src/components/PositionDetailPage.tsx
git commit -m "fix: show honest AI configuration errors"
```

---

### Task 6: Remove Gemini Dependency, Scripts, and Documentation References

**Files:**
- Modify: `.env.example`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `README.md`
- Delete: `test_gemini.ts`

**Interfaces:**
- Consumes: AI provider env names from previous tasks.
- Produces: project setup docs that match implementation.

- [ ] **Step 1: Update `.env.example`**

Replace AI-related content with:

```env
# AI 主引擎：智谱。正式 AI 能力需要填写。
ZHIPU_API_KEY=""
ZHIPU_MODEL="glm-4-flash"

# AI 兜底引擎：DeepSeek。智谱失败时使用。
DEEPSEEK_API_KEY=""
DEEPSEEK_MODEL="deepseek-chat"

# APP_URL: 本地开发默认地址。
APP_URL="http://localhost:3000"
```

Remove `GEMINI_API_KEY`.

- [ ] **Step 2: Remove Gemini package**

Run:

```bash
npm uninstall @google/genai
```

Expected: `package.json` and `package-lock.json` no longer include `@google/genai`.

- [ ] **Step 3: Delete Gemini test script**

Delete:

```text
test_gemini.ts
```

Keep DeepSeek tests if they are still useful, but update them later only if they reference obsolete docs.

- [ ] **Step 4: Update README AI setup section**

In `README.md`, replace the Gemini/DeepSeek section with:

```md
### AI 配置

本项目使用后端 AI Provider：智谱 AI 为主，DeepSeek 为兜底。前端不会接触 API Key。

复制 `.env.example` 为 `.env` 后填写：

```env
ZHIPU_API_KEY=your_zhipu_api_key_here
ZHIPU_MODEL=glm-4-flash
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_MODEL=deepseek-chat
```

如果两个 Key 都未配置，简历解析、岗位匹配和岗位问答会返回明确的“AI 服务未配置”提示，不会使用假数据模拟 AI 结果。
```

Also update the tech stack line to remove Gemini and say:

```md
- **AI 服务**: 智谱 AI（主引擎） + DeepSeek（兜底），通过后端 Provider 模块统一调用。
```

- [ ] **Step 5: Search for remaining Gemini references**

Run:

```bash
rg -n "Gemini|GEMINI|@google/genai|GoogleGenAI|gemini" .
```

Expected: no remaining references except historical notes inside `docs/superpowers/specs/2026-08-05-careermatch-launch-ready-refactor-design.md` that describe the old state or migration decision.

- [ ] **Step 6: Run tests, typecheck, and build**

Run:

```bash
npm run test:ai
npm run typecheck
npm run build
```

Expected: all pass.

- [ ] **Step 7: Commit Task 6**

```bash
git add .env.example package.json package-lock.json README.md
git add -u test_gemini.ts
git commit -m "chore: remove Gemini configuration"
```

---

### Task 7: Final Verification for AI Provider Refactor

**Files:**
- No planned file changes unless verification reveals a defect from Tasks 1-6.

**Interfaces:**
- Consumes: all previous task outputs.
- Produces: verified AI provider refactor ready for the next plan.

- [ ] **Step 1: Run static checks**

Run:

```bash
npm run test:ai
npm run typecheck
npm run build
```

Expected: all pass.

- [ ] **Step 2: Run missing-key HTTP smoke tests**

With `.env` missing both AI keys, start the app:

```bash
npm run dev
```

Check health:

```bash
curl -sS http://localhost:3000/api/health
```

Expected:

```json
{"status":"ok","mode":"development"}
```

Check parse resume missing-key error:

```bash
curl -sS -X POST http://localhost:3000/api/parse-resume \
  -H "Content-Type: application/json" \
  -d '{"text":"张三，南京大学软件工程，熟悉 TypeScript。"}'
```

Expected includes:

```json
{"code":"AI_CONFIGURATION_MISSING"}
```

- [ ] **Step 3: Run one configured-provider smoke test if a real key is available**

If `ZHIPU_API_KEY` is available, set it in `.env`, restart the server, and run:

```bash
curl -sS -X POST http://localhost:3000/api/parse-resume \
  -H "Content-Type: application/json" \
  -d '{"text":"张三，南京大学软件工程2027届，熟悉 TypeScript、Node.js 和 PostgreSQL，做过岗位匹配系统项目。目标城市北京、上海。"}'
```

Expected: JSON contains these fields:

```json
{
  "name": "张三",
  "graduationYear": "2027",
  "school": "南京大学",
  "major": "软件工程",
  "skills": [],
  "internships": [],
  "projects": [],
  "inferredDirection": "",
  "targetCities": []
}
```

The exact values may differ, but the field names and JSON structure must match.

If no real key is available during implementation, record this check as skipped with reason “no real AI key provided”, not as passed.

- [ ] **Step 4: Confirm no random AI fallback remains**

Run:

```bash
rg -n "Math\.random\(|calculateRuleBasedMatch|No active AI keys succeeded|Gemini|GEMINI|@google/genai|GoogleGenAI" server.ts src package.json README.md .env.example
```

Expected:

- No Gemini references in runtime code or setup files.
- No `calculateRuleBasedMatch` in runtime code.
- `Math.random()` may still exist in non-AI development helpers such as test/demo assessment autofill, but not in server-side AI matching.

- [ ] **Step 5: Check git status**

Run:

```bash
git status --short
```

Expected: clean working tree after commits, or only intentionally uncommitted local `.env` changes.

- [ ] **Step 6: Commit verification fixes if needed**

If Step 1-4 revealed fixes, commit them:

```bash
git add <fixed-files>
git commit -m "fix: complete AI provider refactor verification"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review Notes

- Spec coverage: This plan covers the AI-provider slice of the approved design: AI backend module, Gemini removal, Zhipu primary, DeepSeek fallback, missing-key honesty, output validation, no fake AI fallback, frontend copy for missing configuration, docs/env cleanup, and verification. OCR, PostgreSQL, authentication, UI redesign, PDF report, and Docker are intentionally left to later plans.
- Placeholder scan: This plan avoids open-ended placeholders. The only conditional step is the real-key smoke test, which explicitly states the skip condition and expected recording.
- Type consistency: `AiProvider`, `ResumeParseInput`, `MatchPositionInput`, `PositionChatInput`, and `MatchResult` are defined in Task 1 and used consistently in Tasks 2-7.
