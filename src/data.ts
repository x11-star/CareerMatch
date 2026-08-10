import { Position, AssessmentQuestion, PersonalityResult, ResumeData } from './types';
import v2Data from '../prisma/positions-v2.json';

// Representative employers/cities per industry. The v2 dataset is role-TYPE level (not tied to a
// specific company/city — sourceCompanies/sourceCities are empty), so we pair each position with
// a real, recognizable representative employer for its industry. This is labeled "代表性" in the
// UI; we never claim "管培生@字节" is a real specific posting. Pools reuse the real company names
// that already existed in the old generator.
const REPRESENTATIVE_COMPANIES: Record<string, string[]> = {
  '央国企': ['国家电网有限公司', '中国移动通信集团', '中国电信集团', '中国航天科技集团 (CASC)', '中国建筑集团 (CSCEC)', '中国石油化工集团 (SINOPEC)', '中粮集团有限公司', '中国邮政集团'],
  '金融/咨询': ['中国工商银行 (ICBC)', '中国建设银行 (CCB)', '招商银行 (CMB)', '中信证券 (CITIC)', '中金公司 (CICC)', '普华永道 (PwC)', '德勤 (Deloitte)', '麦肯锡咨询 (McKinsey)'],
  '互联网': ['字节跳动 (ByteDance)', '腾讯科技 (Tencent)', '阿里巴巴 (Alibaba)', '美团 (Meituan)', '小红书 (RED)', '网易游戏 (NetEase)', '米哈游 (miHoYo)', '哔哩哔哩 (Bilibili)'],
  'AI/科技': ['华为技术有限公司', '比亚迪股份有限公司', '智谱AI', '月之暗面 (Moonshot)', '科大讯飞', '商汤科技', '百度 (Baidu)', 'MiniMax'],
  '半导体/硬件': ['中芯国际 (SMIC)', '长江存储', '紫光展锐', '寒武纪科技', '地平线机器人', '立讯精密', '歌尔股份', '韦尔股份'],
  '快消/零售': ['宝洁 (P&G)', '联合利华 (Unilever)', "欧莱雅 (L'Oreal)", '玛氏食品 (Mars)', '农夫山泉', '百事食品'],
  '通用': ['字节跳动 (ByteDance)', '腾讯科技 (Tencent)', '阿里巴巴 (Alibaba)', '美团 (Meituan)', '中国建筑集团 (CSCEC)', '中国工商银行 (ICBC)', '国家电网有限公司', '普华永道 (PwC)'],
  '生物医药': ['药明康德', '恒瑞医药', '中国医药集团', '迈瑞医疗', '百济神州'],
  '其他': ['中国建筑集团 (CSCEC)', '比亚迪股份有限公司', '顺丰控股', '京东集团 (JD)', '中国中车集团'],
};

const REPRESENTATIVE_CITIES: Record<string, string[]> = {
  '央国企': ['北京', '上海', '南京', '武汉', '西安', '成都'],
  '金融/咨询': ['北京', '上海', '深圳'],
  '互联网': ['北京', '上海', '深圳', '杭州', '广州', '成都'],
  'AI/科技': ['北京', '上海', '深圳', '杭州', '合肥'],
  '半导体/硬件': ['上海', '深圳', '北京', '武汉', '西安'],
  '快消/零售': ['上海', '广州', '北京'],
  '通用': ['北京', '上海', '深圳', '杭州', '成都', '南京', '武汉', '广州'],
  '生物医药': ['上海', '北京', '苏州', '武汉'],
  '其他': ['北京', '上海', '深圳', '广州', '杭州'],
};

const EXAM_FALLBACK = '重点准备专业知识、综合行测及逻辑推理，提前了解目标企业业务版图。';

function countStars(s: string): number {
  return (s.match(/⭐/g) || []).length;
}

// Convert "助理工程师(0-2年)" -> "助理工程师：0-2年" so PositionDetailPage's split('：')
// renders role (bold) + duration (muted). Honest: duration comes from real v2 data.
function careerPathItem(segment: string): string {
  return segment.trim().replace(/\(([^)]+)\)$/, '：$1');
}

export const MOCK_POSITIONS: Position[] = (() => {
  const rawPositions = (v2Data as { positions: any[] }).positions || [];
  const industryIndex: Record<string, number> = {};

  const mapped: Position[] = rawPositions.map((raw: any): Position => {
    const industry: string = raw.industry || '其他';
    const idx = (industryIndex[industry] = (industryIndex[industry] ?? -1) + 1);
    const companyPool = REPRESENTATIVE_COMPANIES[industry] || REPRESENTATIVE_COMPANIES['其他'];
    const cityPool = REPRESENTATIVE_CITIES[industry] || REPRESENTATIVE_CITIES['其他'];
    const company = companyPool[idx % companyPool.length];
    const city = cityPool[idx % cityPool.length];

    const isStateOwned = industry === '央国企' || industry === '金融/咨询';
    const type: Position['type'] = isStateOwned ? 'state-owned' : 'internet';

    const salaryRange = `${raw.salaryRange[0]}-${raw.salaryRange[1]}${raw.salaryUnit || '万年薪'}`;
    const starCount = raw.entryDifficulty ? countStars(raw.entryDifficulty) : 3;

    const careerPath: string[] = raw.developmentPath
      ? String(raw.developmentPath).split('→').map(careerPathItem).filter(Boolean)
      : ['初级(0-2年)：0-2年', '中级(2-5年)：2-5年'];

    const timeline: string[] = raw.recruitmentTimeline
      ? String(raw.recruitmentTimeline).split('→').map((s: string) => s.trim()).filter(Boolean)
      : ['9月网申', '10-11月笔试', '11-12月面试', '12月录用'];

    const exam = raw.examPrepNotes || EXAM_FALLBACK;
    const softSkills: string[] = raw.softSkills || ['沟通表达能力', '团队协同', '快速适应'];
    const workStyle: string = raw.workStyleDescription || '该岗位具有良好的发展前景，适合有志于该领域长期发展的同学。';
    const interview = `难度${starCount}星：${workStyle}。面试重点考查岗位核心职责与软实力（${softSkills.slice(0, 2).join('、')}）的体现。`;

    let salaryDetail = `首年约${salaryRange}（基本薪金+绩效奖金）。${workStyle}`;
    const comparison: string = raw.soeVsInternetComparison || '';
    if (comparison && comparison !== '不适用') {
      salaryDetail += ` 赛道对比：${comparison}`;
    }

    return {
      id: raw.id,
      title: raw.name,
      company,
      city,
      type,
      industry,
      category: raw.category,
      subIndustry: undefined,
      subCategory: undefined,
      overallMatch: 0,
      resumeMatch: 0,
      personalityMatch: 0,
      salaryRange,
      difficultyRating: starCount,
      tags: raw.personalityTags || ['尽责性高', '情绪稳定'],
      summary: workStyle,
      responsibilities: raw.responsibilities || [],
      requirements: raw.hardSkills || [],
      softSkills,
      salaryDetail,
      careerPath,
      fitPersonality: raw.personalityTags || ['尽责性高', '情绪稳定'],
      howToPrepare: { timeline, exam, interview },
      relatedJobs: [],
    };
  });

  // relatedJobs: pick up to 3 same-category titles (fallback any). Deterministic, no fake data.
  mapped.forEach((pos) => {
    const candidates = mapped.filter((p) => p.id !== pos.id);
    const sameCategory = candidates.filter((p) => p.category === pos.category);
    const selected = sameCategory.length >= 3 ? sameCategory : candidates;
    pos.relatedJobs = selected.slice(0, 3).map((p) => p.title);
  });

  return mapped;
})();

export const MOCK_QUESTIONS: AssessmentQuestion[] = [
  { id: 1, text: '我对抽象的理论、科学概念和深度的思想探讨很感兴趣。', dimension: 'O' },
  { id: 2, text: '我喜欢按照明确的计划、日程表和固定的规则来开展工作，而不是随性而为。', dimension: 'C' },
  { id: 3, text: '在面对突发危机或巨大的工作压力时，我很容易感到焦虑、紧张或情绪波动。', dimension: 'N' },
  { id: 4, text: '我喜欢主动结交新朋友，并在社交场合、团队讨论中扮演活跃气氛的角色。', dimension: 'E' },
  { id: 5, text: '在团队合作中，我总是尽量迎合他人的意见，避免发生冲突或争论。', dimension: 'A' },
  { id: 6, text: '我倾向于从艺术、诗歌、自然风光和新奇的事物中获得心灵层面的启发。', dimension: 'O' },
  { id: 7, text: '我是一个十分注重细节的人，甚至对微小的瑕疵都有所追求，必须做到完美无瑕。', dimension: 'C' },
  { id: 8, text: '在面对否定、批评或挫折时，我能够迅速调整好心态，保持内心平静与积极。', dimension: 'N' },
  { id: 9, text: '相比于热闹的派对或多人的活动，我更享受独自一人看书、写代码或安静独处。', dimension: 'E' },
  { id: 10, text: '我相信大多数人都是善良和真诚的，我很容易对他人产生信任感并给予帮助。', dimension: 'A' },
  { id: 11, text: '我很享受探索和学习一门全新的、我从未涉足过的知识领域的快感。', dimension: 'O' },
  { id: 12, text: '在做决定之前，我一定会经过极其缜密的思考，评估各种潜在风险和计划，极少冲动。', dimension: 'C' },
  { id: 13, text: '我经常会无缘无故地感到有点沮丧、疲惫或者情绪低落，即使并没有发生什么坏事。', dimension: 'N' },
  { id: 14, text: '我发现当着许多人的面发表长篇演讲、展示汇报会让我感到极其兴奋和充满能量。', dimension: 'E' },
  { id: 15, text: '我更喜欢结构规范、规章制度完善、职能分工极其清晰透明的团队。', dimension: 'C' },
  { id: 16, text: '我喜欢尝试新奇独特的解决问题方法，而不是一味遵循传统的老路子。', dimension: 'O' },
  { id: 17, text: '在需要快速做出决策或带头行动的时刻，我通常会主动站出来领导大家。', dimension: 'E' },
  { id: 18, text: '我能够敏锐地察觉到团队成员的情绪波动，并愿意花时间去倾听和安慰他们。', dimension: 'A' },
  { id: 19, text: '在面对团队利益冲突时，我更倾向于妥协或寻找双方均赢的妥协点，而不是固执己见。', dimension: 'A' },
  { id: 20, text: '在面对截止日期或多重任务交织的混乱状态时，我依然能保持冷静和沉着，不被打乱阵脚。', dimension: 'N' },
  { id: 21, text: '我经常产生一些天马行空的灵感和创意，并喜欢将它们融入到我的实际工作或项目中。', dimension: 'O' },
  { id: 22, text: '我习惯把身边的环境（桌椅、文件、代码等）整理得井井有条。', dimension: 'C' },
  { id: 23, text: '我对突如其来的变化、批评或变故非常敏感，哪怕很小的事情也会让我纠结很久。', dimension: 'N' },
  { id: 24, text: '相比于别人的感受，我更看重事实与逻辑的正确性，有时可能会表现得有些冷漠。', dimension: 'A' },
  { id: 25, text: '在群体活动中，我往往更愿意扮演安静的倾听者，而不是引人注目的焦点。', dimension: 'E' },
  { id: 26, text: '我更喜欢待在熟悉、可预测的环境里，面对频繁的未知改变会感到有些不适. ', dimension: 'O' },
  { id: 27, text: '我有时在执行任务时会有些拖延，直到临近截止日期才感到紧迫。', dimension: 'C' },
  { id: 28, text: '我能很好地控制自己的脾气，极少在公共场合或团队沟通中情绪失控。', dimension: 'N' },
  { id: 29, text: '我觉得挑剔别人或指出他人的错误是一件让人不舒服的事，因此说话通常比较温和委婉。', dimension: 'A' },
  { id: 30, text: '在一个由陌生人组成的会议或社交圈中，我能很快、很自然地与他人开启交谈。', dimension: 'E' },
  { id: 31, text: '我喜欢探索事物背后的“为什么”和底层逻辑，而不仅仅满足于知道怎么做。', dimension: 'O' },
  { id: 32, text: '只要我承诺了某件事，我一定会排除万难、高质量地按时交付。', dimension: 'C' },
  { id: 33, text: '我时常会担心未来可能发生的最坏结果，难以让自己放松下来。', dimension: 'N' },
  { id: 34, text: '我热衷于帮助同事，即使这可能会占用我自己的一部分时间和工作精力。', dimension: 'A' },
  { id: 35, text: '漫长的独处或不与人交流的工作会让我感到无聊，我需要通过社交来给自己“充电”。', dimension: 'E' },
  { id: 36, text: '我对参观美术馆、听交响乐或体验小众先锋文化等美学活动抱有浓厚兴趣。', dimension: 'O' },
  { id: 37, text: '在面对复杂繁琐的日常事务时，我容易感到不耐烦，偶尔会有些粗心大意。', dimension: 'C' },
  { id: 38, text: '无论遇到多么棘手的突发状况，我都能够理智、客观地分析问题而非被情绪左右。', dimension: 'N' },
  { id: 39, text: '面对自私或无理的人，我有时会控制不住表达出厌恶或进行言语交锋。', dimension: 'A' },
  { id: 40, text: '别人常评价我是一个充满激情、乐观活泼、非常有感召力的人。', dimension: 'E' }
];

export const DEFAULT_PERSONALITY_RESULT: PersonalityResult = {
  typeTitle: '尽责稳定型 (C-N Core)',
  description: '你做事认真负责，计划性强，情绪平稳、行事稳重。你非常擅长在规范有序、分工清晰的环境中，通过日复一日的坚持与严谨，发挥出长期的战略价值，是团队中极其可靠的中流砥柱。',
  radarScores: [
    { dimension: '尽责性 (Conscientiousness)', score: 92, avg: 65 },
    { dimension: '情绪稳定性 (Emotional Stability)', score: 85, avg: 60 },
    { dimension: '宜人性 (Agreeableness)', score: 78, avg: 72 },
    { dimension: '开放性 (Openness to Experience)', score: 65, avg: 68 },
    { dimension: '外向性 (Extraversion)', score: 58, avg: 62 }
  ],
  industryFit: {
    stateOwned: 88,
    internet: 65
  },
  hollandCode: 'RCI',
  hollandTags: ['现实型 (Realistic)', '常规型 (Conventional)', '研究型 (Investigative)'],
  deepInterpretation: {
    summary: '你拥有非常突出的自律与责任感。在接受任务后，你会习惯性地制定详细的时间节点并百分百贯彻执行，极少出现拖延或遗漏。你情绪极具韧性，遇到挫折、领导施压时，能以极高的大局观与稳定性承受并化解压力，非常符合国资央企、国家重大技术骨干岗位以及大型合规性高要求团队的期待。',
    advantages: [
      '【执行先锋】：极强的自驱与执行力，保证复杂交付不打折扣、质量上乘。',
      '【定海神针】：面对突发、杂乱、高频的突击任务能保持从容，是优秀的风险控制者。',
      '【秩序专家】：善于优化既定工作流，整理极度清晰的知识框架、标准方案。'
    ]
  }
};

export const DEFAULT_RESUME_DATA: ResumeData = {
  name: '张同学',
  school: '清华大学 / 北京邮电大学',
  major: '计算机科学与技术 / 软件工程',
  graduationYear: '2027届 (2023级本科)',
  skills: ['Python', 'Java', 'SQL', 'Machine Learning', 'React', 'Linux', 'Spring Boot'],
  internships: [
    {
      company: '字节跳动 (ByteDance)',
      role: '后端开发实习生',
      duration: '3个月 (2025.06 - 2025.09)'
    },
    {
      company: '腾讯科技 (Tencent)',
      role: '数据分析实习生',
      duration: '2个月 (2025.12 - 2026.02)'
    }
  ],
  projects: [
    {
      name: '分布式网关高可用重构项目',
      role: '后端主力研发',
      tech: 'Go, gRPC, Redis, Docker'
    },
    {
      name: '智能招聘大模型推荐平台',
      role: '算法与全栈核心开发',
      tech: 'Python, Django, React, PyTorch'
    }
  ],
  inferredDirection: '互联网后端开发 / 大数据工程 / 央国企金融科技IT',
  targetCities: ['北京', '上海', '南京', '杭州']
};
