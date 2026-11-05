import type { MatchPositionInput, PositionChatInput, ResumeParseInput } from './types';

export function buildResumeParsePrompt(input: ResumeParseInput): string {
  return `请解析以下简历，输出结构化 JSON。仅提取明确提供的信息，缺失内容留空；不要推断学历、证书或经历成果。qualifications.degree 只能是大专、本科、硕士、博士、其他或空字符串。\n\n来源类型：${input.sourceType}\n文件名：${input.fileName || '未提供'}\n\n简历内容：\n${input.extractedText}\n\n请严格输出以下 JSON，不要包含 markdown 或额外解释：\n{\n  "name": "姓名",\n  "graduationYear": "毕业年份，例如2027",\n  "school": "就读院校",\n  "major": "就读专业",\n  "skills": ["技能1"],\n  "internships": [{ "company": "公司名", "role": "岗位/角色", "duration": "时间范围" }],\n  "projects": [{ "name": "项目名", "role": "角色/职责", "tech": "技术栈描述" }],\n  "inferredDirection": "AI推断的求职方向",\n  "targetCities": ["城市1"],\n  "qualifications": {"degree": "", "languages": [], "certificates": [], "evidence": []}\n}`;
}

export function buildMatchPositionPrompt(input: MatchPositionInput): string {
  const resume = input.resumeData || {};
  const personality = input.personalityResult || {};
  const position = input.position;

  return `你是一位严谨、专业且直言不讳的校招招聘专家与职业规划导师。请根据候选人的真实简历、职业性格测评结果和目标岗位要求，进行严格匹配评估。不要客套，不要编造不存在的实习、项目或认证。\n\n=== 候选人简历 ===\n姓名: ${resume.name || '未提供'}\n学校: ${resume.school || '未提供'}\n专业: ${resume.major || '未提供'}\n毕业年份: ${resume.graduationYear || '未提供'}\n学历、语言、证书与成果（未提供按未知处理）: ${JSON.stringify(resume.qualifications || {})}\n核心技能: ${(resume.skills || []).join(', ') || '未提供'}\n实习经历: ${JSON.stringify(resume.internships || [])}\n项目经历: ${JSON.stringify(resume.projects || [])}\nAI推断方向: ${resume.inferredDirection || '未提供'}\n期望城市: ${(resume.targetCities || []).join(', ') || '未提供'}\n\n=== 职业测评 ===\n性格类型: ${personality.typeTitle || '未测评'}\n霍兰德代码: ${personality.hollandCode || '未测评'}\n雷达分: ${JSON.stringify(personality.radarScores || [])}\n\n=== 目标岗位 ===\n（注：这里是职业类型，不绑定企业、城市或福利。按职责和能力要求诊断，不要编造具体企业的招聘偏好、录用概率或待遇。）\n行业: ${position.industry || "未提供"}\n岗位: ${position.title}\n职业类别: ${position.category || "未提供"}\n类型: ${position.type}\n概述: ${position.summary}\n职责: ${(position.responsibilities || []).join('; ')}\n类型参考学历: ${position.degreeRequirement || "未知"}\n类型参考专业: ${(position.typicalMajors || []).join("、") || "未知"}\n类型参考学历: ${position.degreeRequirement || "未知"}\n类型参考专业: ${(position.typicalMajors || []).join("、") || "未知"}\n硬技能要求: ${(position.requirements || []).join(', ')}\n软技能要求: ${(position.softSkills || []).join('; ')}\n\n请严格输出以下 JSON，不要包含 markdown 或额外解释：\n{\n  "resumeMatch": 0,\n  "personalityMatch": 0,\n  "overallMatch": 0,\n  "resumeMatchExplanation": "100-150字，指出硬条件优势或短板",\n  "personalityMatchExplanation": "100-150字，结合性格与岗位氛围",\n  "whyExcellent": "150-250字，真实评价胜任情况和补救建议"\n}`;
}

export function buildPositionChatPrompt(input: PositionChatInput): string {
  const position = input.position;
  const resume = input.resumeData || {};
  const latestQuestion = [...input.messages].reverse().find((message) => message.sender === 'user')?.text || '请介绍这个岗位如何准备。';

  return `你是一名熟悉央国企和互联网校招的职业导师。请基于岗位信息和候选人背景回答用户问题，控制在 200 字以内，真实、具体、不编造。\n\n职业类型：${position.title}（未绑定企业，不是在招公告）\n行业：${position.industry || "未提供"}\n薪资参考范围（非企业报价）：${position.salaryRange}\n岗位概述：${position.summary}\n岗位要求：${(position.requirements || []).join(', ')}\n候选人：${resume.name || '求职学子'}，${resume.school || '学校未提供'}，${resume.major || '专业未提供'}\n\n用户问题：${latestQuestion}`;
}
