import type { Prisma, Assessment } from '@prisma/client';
import type { PersonalityResult } from '../../types';
import type { CreateAssessmentInput } from '../repositories/assessmentsRepository';

export function toPersonalityResult(record: Assessment): PersonalityResult {
  return {
    typeTitle: record.typeTitle,
    description: record.description,
    radarScores: record.radarScores as PersonalityResult['radarScores'],
    industryFit: record.industryFit as PersonalityResult['industryFit'],
    hollandCode: record.hollandCode,
    hollandTags: record.hollandTags as string[],
    deepInterpretation: record.deepInterpretation as PersonalityResult['deepInterpretation'],
  };
}

export function toAssessmentCreateInput(personalityResult: PersonalityResult, scores: unknown = {}): CreateAssessmentInput {
  return {
    answers: (scores || {}) as Prisma.InputJsonValue,
    typeTitle: personalityResult.typeTitle,
    description: personalityResult.description,
    radarScores: personalityResult.radarScores,
    industryFit: personalityResult.industryFit,
    hollandCode: personalityResult.hollandCode,
    hollandTags: personalityResult.hollandTags,
    deepInterpretation: personalityResult.deepInterpretation,
  };
}
