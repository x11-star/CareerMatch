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
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 100) {
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
