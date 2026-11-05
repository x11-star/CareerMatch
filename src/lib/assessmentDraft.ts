import { MOCK_QUESTIONS } from '../data';
export type AssessmentDraft = { answers: Record<number, number>; currentIndex: number };
export const draftKey = (userId: string) => `assessment_draft_${userId}`;
export function readAssessmentDraft(storage: Pick<Storage, 'getItem'>, userId: string): AssessmentDraft {
  try {
    const parsed = JSON.parse(storage.getItem(draftKey(userId)) || 'null');
    const answers: Record<number, number> = {};
    for (const q of MOCK_QUESTIONS) {
      const value = parsed?.answers?.[q.id];
      if (Number.isInteger(value) && value >= 1 && value <= 5) answers[q.id] = value;
    }
    const firstMissing = MOCK_QUESTIONS.findIndex(q => !answers[q.id]);
    return { answers, currentIndex: firstMissing < 0 ? MOCK_QUESTIONS.length - 1 : firstMissing };
  } catch { return { answers: {}, currentIndex: 0 }; }
}
