import type { PersonalityResult, Position, ResumeData } from '../types';
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
  if (!resume && !assessment && !Array.isArray(favoritePositionIds)) return null;
  return {
    ...(resume ? { resume } : {}),
    ...(assessment ? { assessment } : {}),
    favoritePositionIds: Array.isArray(favoritePositionIds) ? favoritePositionIds : [],
  };
}

function storage() {
  return window.localStorage;
}

export async function getPositions(): Promise<Position[]> {
  try {
    return (await api.listPositions({ pageSize: 50 })).positions;
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
  if (!user) return;
  if (user.isGuest) writeGuestJson(storage(), `resume_${user.id}`, data);
  else await api.saveResume(data);
}

export async function getLatestAssessment(user: AppUser | null): Promise<PersonalityResult | null> {
  if (!user) return null;
  if (user.isGuest) return (readGuestJson(storage(), `assessment_${user.id}`) as any)?.personalityResult || null;
  return (await api.getLatestAssessment()).assessment?.personalityResult || null;
}

export async function saveAssessment(user: AppUser | null, result: PersonalityResult, scores: unknown = {}): Promise<void> {
  if (!user) return;
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
  const current = await getFavorites(user);
  const nextValue = !current.includes(positionId);
  if (user.isGuest) {
    writeGuestJson(storage(), `favorites_${user.id}`, nextValue ? [...current, positionId] : current.filter((id) => id !== positionId));
  } else if (nextValue) {
    await api.addFavorite(positionId);
  } else {
    await api.removeFavorite(positionId);
  }
  return nextValue;
}
