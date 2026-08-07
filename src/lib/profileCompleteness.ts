interface ProfileCompletenessInput {
  displayName: string;
  displaySchool: string;
  displayMajor: string;
  hasResume: boolean;
  hasAssessment: boolean;
}

export function formatProfileCompleteness({ displayName, displaySchool, displayMajor, hasResume, hasAssessment }: ProfileCompletenessInput) {
  const completed = [
    displayName !== '未完善',
    displaySchool !== '未完善',
    displayMajor !== '未完善',
    hasResume,
    hasAssessment,
  ].filter(Boolean).length;

  return `${completed}/5 项`;
}
