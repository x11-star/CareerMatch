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

export interface BlobDownload {
  blob: Blob;
  // Filename extracted from the server's Content-Disposition header (if present) so the browser
  // save dialog uses the server-sanitized name rather than a generic fallback.
  fileName: string | null;
}

// Requests a binary blob (e.g. PDF). On failure the server responds with JSON, so we parse the
// error body and throw a structured ApiErrorShape instead of returning a corrupt blob.
async function requestBlob(path: string, init: RequestInit = {}): Promise<BlobDownload> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw parseApiErrorBody(response.status, body);
  }
  // Guard against a proxy/gateway returning 200 with a non-PDF body (login wall, error HTML):
  // without this check the blob would be saved as a corrupt .pdf.
  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('application/pdf')) {
    throw { status: response.status, code: 'UNEXPECTED_CONTENT_TYPE', message: `导出失败:服务器返回了非 PDF 内容(${contentType || '未知类型'})` };
  }
  const blob = await response.blob();
  return { blob, fileName: parseContentDispositionFileName(response.headers.get('Content-Disposition')) };
}

// Parses filename="..." (or filename*=UTF-8''...) from a Content-Disposition header. Returns null
// when absent or unparseable so the caller can fall back to a default name.
function parseContentDispositionFileName(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
  if (star) return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''));
  const plain = /filename="?([^";]+)"?/i.exec(header);
  if (plain) return plain[1].trim();
  return null;
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
  requestChangePhoneCode: () => requestJson<{ ok: true; devCode?: string; expiresInSeconds: number }>('/api/me/change-phone/request-code', {
    method: 'POST',
  }),
  verifyChangePhoneCode: (code: string, newPhone: string) => requestJson<{ user: any }>('/api/me/change-phone/verify', {
    method: 'POST',
    body: JSON.stringify({ code, newPhone }),
  }),
  requestDeleteAccountCode: () => requestJson<{ ok: true; devCode?: string; expiresInSeconds: number }>('/api/me/delete-account/request-code', { method: 'POST' }),
  deleteAccount: (code: string) => requestJson<{ ok: true }>('/api/me/delete-account', { method: 'POST', body: JSON.stringify({ code }) }),
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
  exportPositionReport: (positionId: string) =>
    requestBlob('/api/reports/export', { method: 'POST', body: JSON.stringify({ positionId }) }),
};
