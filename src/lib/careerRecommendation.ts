import type { CareerPreferences, Position, ResumeData, RecommendationResult } from '../types';

// Versioned, deterministic candidate ordering; scores are internal ordering values, not probabilities.
export const RECOMMENDATION_VERSION = 'career-rules-v1';
const aliases: string[][] = [
  ['python'], ['sql'], ['excel'], ['powerpoint', 'ppt'], ['javascript', 'js'], ['typescript', 'ts'],
  ['java'], ['c++', 'cpp'], ['c#'], ['react'], ['vue'], ['linux'], ['git'], ['photoshop', 'ps'],
  ['数据分析', 'data analysis'], ['需求分析', '需求调研'], ['用户研究', '用户调研'], ['机器学习', 'machine learning'],
  ['项目管理', 'project management'], ['财务分析'], ['英语六级', 'cet-6', 'cet6'], ['英语四级', 'cet-4', 'cet4'],
];
function contains(text: string, term: string): boolean {
  const value = term.toLowerCase().trim();
  if (value.length < 2) return false;
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // An explicit lack of a skill is not positive evidence. Ambiguous prose still needs human review.
  if (new RegExp(`(?:不会|不熟悉|未掌握|没有|不具备|不了解|未学过|不擅长|not familiar with|no experience with)\\s*${escaped}`, 'i').test(text)) return false;
  if (/^[a-z0-9+# -]+$/.test(value)) {
    return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, 'i').test(text);
  }
  return text.toLowerCase().includes(value);
}
function overlap(requirement: string, evidence: string): boolean {
  // Do not match a negative statement by reversing containment against the requirement.
  if (/^(不会|不熟悉|未掌握|没有|不具备|不了解|未学过|不擅长|not familiar with|no experience with)/i.test(evidence.trim())) return false;
  if (contains(requirement, evidence) || contains(evidence, requirement)) return true;
  return aliases.some(group => group.some(a => contains(requirement, a)) && group.some(a => contains(evidence, a)));
}
const degrees: Record<string, number> = { 大专: 1, 本科: 2, 硕士: 3, 博士: 4 };

export function recommendCareers(resume: ResumeData, preferences: CareerPreferences, catalog: Position[]): RecommendationResult {
  const qualifications = resume.qualifications;
  const declared = [...resume.skills, ...(qualifications?.languages || []), ...(qualifications?.certificates || [])].filter(s => s.trim());
  const experience = [...(qualifications?.evidence || []), ...resume.projects.map(p => p.tech)].filter(s => s.trim());
  const candidates = catalog.filter(p => !preferences.excludedCategories.includes(p.category || ''));
  const ranked = candidates.map(position => {
    const reasons: string[] = [], gaps: string[] = [], unknowns: string[] = [];
    let score = 0;
    const matched = position.requirements.filter(requirement => {
      const claim = declared.find(s => overlap(requirement, s));
      const mention = experience.find(s => overlap(requirement, s));
      if (claim) reasons.push(`你提供的「${claim}」对应类型要求「${requirement}」；熟练程度仍需核实。`);
      else if (mention) reasons.push(`经历文字「${mention}」提及类型要求「${requirement}」；需要进一步查看具体贡献。`);
      return Boolean(claim || mention);
    });
    score += position.requirements.length ? matched.length / position.requirements.length * 50 : 0;
    const missing = position.requirements.filter(r => !matched.includes(r));
    if (declared.length || experience.length) gaps.push(...missing.slice(0, 3).map(r => `材料中尚未看到「${r}」的证据，不代表你不具备。`));
    else unknowns.push('尚未提供技能或经历成果，无法判断能力覆盖。');
    if (preferences.industries.includes(position.industry || '')) { score += 20; reasons.push(`属于你偏好的「${position.industry}」行业。`); }
    if (preferences.categories.includes(position.category || '')) { score += 15; reasons.push(`属于你想探索的「${position.category}」。`); }
    const major = (position.typicalMajors || []).find(m => overlap(m, resume.major));
    if (major) { score += 10; reasons.push(`你提供的专业「${resume.major}」与类型参考专业「${major}」有文字关联。`); }
    else if (resume.major && position.typicalMajors?.length) unknowns.push(`参考专业：${position.typicalMajors.join('、')}；跨专业可行性需结合经历确认。`);
    else unknowns.push('专业信息或类型专业要求尚不完整。');
    if (resume.inferredDirection && overlap(position.title, resume.inferredDirection)) { score += 5; reasons.push(`与你确认的方向「${resume.inferredDirection}」有关。`); }
    const degree = qualifications?.degree;
    const requiredDegree = Object.keys(degrees).find(d => position.degreeRequirement?.includes(d));
    if (!degree || !requiredDegree || !degrees[degree]) unknowns.push(`学历尚待确认：类型参考要求为「${position.degreeRequirement || '未提供'}」。`);
    else if (degrees[degree] < degrees[requiredDegree]) gaps.push(`你的学历「${degree}」低于类型参考「${position.degreeRequirement}」；请查具体招聘公告，未自动排除。`);
    else reasons.push(`学历「${degree}」达到类型参考「${position.degreeRequirement}」；具体资格以公告为准。`);
    unknowns.push('城市、薪资、加班与工作价值偏好尚无逐条核验的类型依据，未用于排序。');
    if (!preferences.industries.length && !preferences.categories.length) unknowns.push('尚未设置行业或类别偏好，当前主要根据材料线索探索。');
    const label = matched.length >= 2 && matched.length >= position.requirements.length / 2 ? '依据较充分' : score > 0 ? '可以探索' : '需要补充信息';
    return { score, recommendation: { position, reasons, gaps, unknowns, label } };
  });
  ranked.sort((a, b) => b.score - a.score || a.recommendation.position.id.localeCompare(b.recommendation.position.id));
  // With no differentiating evidence, do not turn arbitrary catalog order into a personal Top10.
  const relevant = ranked.filter(r => r.score > 0);
  return {
    version: RECOMMENDATION_VERSION,
    recommendations: relevant.slice(0, 10).map(r => r.recommendation) as RecommendationResult['recommendations'],
    totalCandidates: candidates.length,
    notice: '这是职业类型探索建议，依据你提供的技能、经历文字、专业和行业/类别偏好排序；测评不参与排名。不是招聘资格审核或录用概率，未知信息不按缺点计分。',
  };
}
