import type { CareerPreferences, ResumeQualifications, Position } from '../types';

export const EMPTY_PREFERENCES: CareerPreferences = {
  industries: [], categories: [], excludedCategories: [], targetCities: [], salaryExpectation: '', priorities: [],
};
export const EMPTY_QUALIFICATIONS: ResumeQualifications = { degree: '', languages: [], certificates: [], evidence: [] };
const choices = ['稳定性', '成长', '工作生活平衡', '收入', '社会贡献'];
export const WORK_PRIORITIES = choices;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('信息格式不正确');
  return value as Record<string, unknown>;
}
function strings(value: unknown, max = 20): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max || value.some(v => typeof v !== 'string' || v.length > 200)) throw new Error('列表格式不正确或过长');
  return [...new Set(value.map(v => v.trim()).filter(Boolean))];
}
function string(value: unknown, max = 200): string {
  if (value === undefined) return '';
  if (typeof value !== 'string' || value.length > max) throw new Error('文字格式不正确或过长');
  return value.trim();
}
export function normalizeQualifications(value: unknown): ResumeQualifications {
  const input = record(value ?? {});
  const degree = string(input.degree);
  if (degree && !['大专', '本科', '硕士', '博士', '其他'].includes(degree)) throw new Error('请选择有效学历');
  return { degree, languages: strings(input.languages), certificates: strings(input.certificates), evidence: strings(input.evidence, 30) };
}
export function normalizePreferences(value: unknown): CareerPreferences {
  const input = record(value ?? {});
  const result = {
    industries: strings(input.industries), categories: strings(input.categories), excludedCategories: strings(input.excludedCategories),
    targetCities: strings(input.targetCities), salaryExpectation: string(input.salaryExpectation), priorities: strings(input.priorities, 5),
  };
  if (result.categories.some(c => result.excludedCategories.includes(c))) throw new Error('同一职业类别不能同时偏好和排除');
  if (result.priorities.some(p => !choices.includes(p))) throw new Error('工作价值偏好不正确');
  return result;
}

export function normalizeCatalogPreferences(value: unknown, catalog: Pick<Position, 'industry' | 'category'>[]): CareerPreferences {
  const preferences = normalizePreferences(value);
  const industries = new Set(catalog.map(p => p.industry));
  const categories = new Set(catalog.map(p => p.category));
  if (preferences.industries.some(i => !industries.has(i)) || [...preferences.categories, ...preferences.excludedCategories].some(c => !categories.has(c))) {
    throw new Error('请选择职业库中的行业和类别。');
  }
  return preferences;
}
