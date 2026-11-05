import type { PersonalityResult, Position, ResumeData, CareerPreferences } from '../types';
import { EMPTY_PREFERENCES, normalizePreferences, normalizeCatalogPreferences } from './careerPreferences';
import { validateResumeData } from '../server/ai/schemas';
import { hasRealResumeData } from './resumeState';
import { MOCK_POSITIONS } from '../data';
import { api } from './apiClient';

export type AppUser = { id: string; phone: string | null; isGuest: boolean };

export function readGuestJson(storage: Pick<Storage, 'getItem'>, key: string) {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeGuestJson(storage: Pick<Storage, 'setItem'>, key: string, value: unknown) {
  storage.setItem(key, JSON.stringify(value));
}

export function buildGuestImportPayload(storage: Pick<Storage, 'getItem'>) {
  const guestUid = storage.getItem('guest_uid');
  if (!guestUid) return null;
  const resume = readGuestJson(storage, `resume_${guestUid}`);
  const assessment = readGuestJson(storage, `assessment_${guestUid}`);
  const favoritePositionIds = readGuestJson(storage, `favorites_${guestUid}`);
  const preferences = readGuestJson(storage, `preferences_${guestUid}`);
  if (!resume && !assessment && !preferences && !Array.isArray(favoritePositionIds)) return null;
  return {
    ...(resume ? { resume } : {}),
    ...(assessment ? { assessment } : {}),
    ...(preferences ? { preferences } : {}),
    favoritePositionIds: Array.isArray(favoritePositionIds) ? favoritePositionIds : [],
  };
}

function storage() {
  return window.localStorage;
}

// Fetch paginated batches until the server's total is reached; never truncate at a fixed cap.
export const ALL_POSITIONS_PAGE_SIZE = 200;

export async function getPositions(pageSize = 50): Promise<Position[]> {
  try {
    const positions: Position[] = [];
    for (let page = 1; ; page++) {
      const result = await api.listPositions({ pageSize, page });
      positions.push(...result.positions);
      if (positions.length >= result.total || result.positions.length === 0) return positions;
    }
  } catch {
    return MOCK_POSITIONS;
  }
}

export async function getLatestResume(user: AppUser | null): Promise<ResumeData | null> {
  if (!user) return null;
  if (user.isGuest) return readGuestJson(storage(), `resume_${user.id}`) as ResumeData | null;
  return (await api.getLatestResume()).resume;
}

export async function saveResume(user: AppUser | null, data: ResumeData): Promise<void> {
  if (!user) throw new Error('请先选择游客体验或登录，再保存简历。');
  const normalized = validateResumeData(data);
  if (!hasRealResumeData(normalized)) throw new Error('请至少填写一项个人材料；其他信息可以留空。');
  if (user.isGuest) writeGuestJson(storage(), `resume_${user.id}`, normalized);
  else await api.saveResume(normalized);
}

export async function getLatestAssessment(user: AppUser | null): Promise<PersonalityResult | null> {
  if (!user) return null;
  if (user.isGuest) return (readGuestJson(storage(), `assessment_${user.id}`) as any)?.personalityResult || null;
  return (await api.getLatestAssessment()).assessment?.personalityResult || null;
}

export async function saveAssessment(user: AppUser | null, result: PersonalityResult, scores: unknown = {}): Promise<void> {
  if (!user) throw new Error('请先选择游客体验或登录，再保存测评。');
  if (user.isGuest) writeGuestJson(storage(), `assessment_${user.id}`, { personalityResult: result, scores });
  else await api.saveAssessment(result, scores);
}

export async function getFavorites(user: AppUser | null): Promise<string[]> {
  if (!user) return [];
  if (user.isGuest) return (readGuestJson(storage(), `favorites_${user.id}`) as string[] | null) || [];
  return (await api.getFavorites()).positionIds;
}

export async function toggleFavorite(user: AppUser | null, positionId: string): Promise<boolean> {
  if (!user) return false;
  if (user.isGuest) {
    // No await between guest read/write: simultaneous saves of different careers must not overwrite.
    const saved = readGuestJson(storage(), `favorites_${user.id}`);
    const current: string[] = Array.isArray(saved) ? saved : [];
    const nextValue = !current.includes(positionId);
    writeGuestJson(storage(), `favorites_${user.id}`, nextValue ? [...current, positionId] : current.filter(id => id !== positionId));
    return nextValue;
  }
  const current = await getFavorites(user);
  const nextValue = !current.includes(positionId);
  if (nextValue) {
    await api.addFavorite(positionId);
  } else {
    await api.removeFavorite(positionId);
  }
  return nextValue;
}

export async function deleteMaterials(user: AppUser, kind: 'resume' | 'assessment') {
  if (user.isGuest) storage().removeItem(`${kind}_${user.id}`);
  else if (kind === 'resume') await api.deleteResumes();
  else await api.deleteAssessments();
  if (kind === 'assessment') { try { sessionStorage.removeItem(`assessment_draft_${user.id}`); } catch {} }
}
export function clearPrivateSessionData(userId: string) {
  const keys = Object.keys(sessionStorage).filter(key => key === `assessment_draft_${userId}` || key.startsWith(`match_${userId}_`) || key.startsWith('match_guest_'));
  for (const key of keys) sessionStorage.removeItem(key);
}
export function clearGuestData(userId: string) {
  for (const prefix of ['resume', 'assessment', 'favorites', 'profile', 'preferences']) storage().removeItem(`${prefix}_${userId}`);
  if (storage().getItem('guest_uid') === userId) storage().removeItem('guest_uid');
  clearPrivateSessionData(userId);
}

export async function getPreferences(user: AppUser | null): Promise<CareerPreferences> {
  if (!user) return { ...EMPTY_PREFERENCES };
  if (user.isGuest) return normalizePreferences(readGuestJson(storage(), `preferences_${user.id}`) || {});
  return (await api.getPreferences()).preferences;
}
export async function savePreferences(user: AppUser | null, value: CareerPreferences): Promise<CareerPreferences> {
  if (!user) throw new Error('请先选择游客体验或登录。');
  const preferences = normalizeCatalogPreferences(value, MOCK_POSITIONS);
  if (user.isGuest) { writeGuestJson(storage(), `preferences_${user.id}`, preferences); return preferences; }
  return (await api.savePreferences(preferences)).preferences;
}
