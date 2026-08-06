import type { PersonalityResult, Position, ResumeData } from '../types';

export type ApiErrorShape = { status: number; code: string; message: string };

export function parseApiErrorBody(status: number, body: any): ApiErrorShape {
  return { status, code: body?.code || 'HTTP_ERROR', message: body?.error || `请求失败：HTTP ${status}` };
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw parseApiErrorBody(response.status, body);
  return body as T;
}

export const api = {
  getMe: () => requestJson<{ user: any }>('/api/me'),
  requestLoginCode: (phone: string) => requestJson<{ ok: true; devCode?: string; expiresInSeconds: number }>('/api/auth/request-code', {
    method: 'POST',
    body: JSON.stringify({ phone, purpose: 'login' }),
  }),
  verifyLoginCode: (phone: string, code: string) => requestJson<{ user: any }>('/api/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ phone, code, purpose: 'login' }),
  }),
  logout: () => requestJson<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  updateMe: (profile: any) => requestJson<{ user: any }>('/api/me', { method: 'PATCH', body: JSON.stringify(profile) }),
  getLatestResume: () => requestJson<{ resume: ResumeData | null }>('/api/resumes/latest'),
  saveResume: (resume: ResumeData, metadata: any = {}) => requestJson<{ resume: ResumeData }>('/api/resumes', {
    method: 'POST',
    body: JSON.stringify({ resume, ...metadata }),
  }),
  getLatestAssessment: () => requestJson<{ assessment: { personalityResult: PersonalityResult; scores: unknown } | null }>('/api/assessments/latest'),
  saveAssessment: (personalityResult: PersonalityResult, scores: unknown = {}) => requestJson<{ assessment: { personalityResult: PersonalityResult; scores: unknown } }>('/api/assessments', {
    method: 'POST',
    body: JSON.stringify({ personalityResult, scores }),
  }),
  listPositions: (filters: Record<string, string | number | undefined> = {}) => requestJson<{ positions: Position[]; total: number; page: number; pageSize: number }>(
    `/api/positions?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]))}`,
  ),
  getPosition: (positionId: string) => requestJson<{ position: Position }>(`/api/positions/${encodeURIComponent(positionId)}`),
  getFavorites: () => requestJson<{ positionIds: string[] }>('/api/favorites'),
  addFavorite: (positionId: string) => requestJson<{ ok: true }>(`/api/favorites/${encodeURIComponent(positionId)}`, { method: 'POST' }),
  removeFavorite: (positionId: string) => requestJson<{ ok: true }>(`/api/favorites/${encodeURIComponent(positionId)}`, { method: 'DELETE' }),
  importLocalData: (payload: any) => requestJson<{ imported: { resume: boolean; assessment: boolean; favorites: number } }>('/api/me/import-local-data', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  matchPosition: (input: any) => requestJson<any>('/api/match-position', { method: 'POST', body: JSON.stringify(input) }),
};
