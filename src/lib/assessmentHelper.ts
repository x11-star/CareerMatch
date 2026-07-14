import { PersonalityResult } from '../types';

export function calculatePersonalityResult(answers: Record<number, number>): PersonalityResult {
  const getVal = (id: number) => answers[id] || 3;

  // 1. Conscientiousness (C) - 8 items: Q2, Q7, Q12, Q15, Q22, Q27(reversed), Q32, Q37(reversed)
  const cSum = getVal(2) + getVal(7) + getVal(12) + getVal(15) + getVal(22) + (6 - getVal(27)) + getVal(32) + (6 - getVal(37));
  const cScore = Math.round(((cSum - 8) / 32) * 60 + 40); // Map to 40 - 100

  // 2. Emotional Stability (S) - 8 items: Q3(reversed), Q8, Q13(reversed), Q20, Q23(reversed), Q28, Q33(reversed), Q38
  const sSum = (6 - getVal(3)) + getVal(8) + (6 - getVal(13)) + getVal(20) + (6 - getVal(23)) + getVal(28) + (6 - getVal(33)) + getVal(38);
  const sScore = Math.round(((sSum - 8) / 32) * 60 + 40);

  // 3. Agreeableness (A) - 8 items: Q5, Q10, Q18, Q19, Q24(reversed), Q29, Q34, Q39(reversed)
  const aSum = getVal(5) + getVal(10) + getVal(18) + getVal(19) + (6 - getVal(24)) + getVal(29) + getVal(34) + (6 - getVal(39));
  const aScore = Math.round(((aSum - 8) / 32) * 60 + 40);

  // 4. Openness (O) - 8 items: Q1, Q6, Q11, Q16, Q21, Q26(reversed), Q31, Q36
  const oSum = getVal(1) + getVal(6) + getVal(11) + getVal(16) + getVal(21) + (6 - getVal(26)) + getVal(31) + getVal(36);
  const oScore = Math.round(((oSum - 8) / 32) * 60 + 40);

  // 5. Extraversion (E) - 8 items: Q4, Q9(reversed), Q14, Q17, Q25(reversed), Q30, Q35, Q40
  const eSum = getVal(4) + (6 - getVal(9)) + getVal(14) + getVal(17) + (6 - getVal(25)) + getVal(30) + getVal(35) + getVal(40);
  const eScore = Math.round(((eSum - 8) / 32) * 60 + 40);

  // Decide Personality Type Title
  let typeTitle = '均衡发展型 (Balanced Core)';
  let description = '你是一个全面、协调、性格温和的人。在各种场合下，你都能找到适合自己的角色，非常善于在规范与弹性之间找到最佳平衡点。';
  let hollandCode = 'SEC';
  let hollandTags = ['社会型 (Social)', '企业型 (Enterprising)', '常规型 (Conventional)'];
  let summary = '你在各个维度上展现出良好的均衡度。你不仅拥有较强的执行力和计划性，同时也能在需要创新和快速变通的场合中展现出敏锐的适应力。你擅长协调团队关系，既能扎实推进工作落实，也能在大局中进行科学决断，适合跨部门协作频繁的综合型核心岗位。';
  let advantages = [
    '【跨界专家】：具备多元化的思维模式，能够快速在技术与管理语言中自由切换。',
    '【合作枢纽】：拥有出色的宜人度和适中的外向度，是团队里极具信赖的协调器。',
    '【稳健先锋】：计划性与敏捷度兼备，能在充满不确定的项目进程中稳步输出。'
  ];

  if (cScore >= 75 && sScore >= 70) {
    typeTitle = '尽责稳定型 (C-N Core)';
    description = '你做事认真负责，计划性强，情绪平稳、行事稳重。你非常擅长在规范有序、分工清晰的环境中，通过日复一日的坚持与严谨，发挥出长期的战略价值，是团队中极其可靠的中流砥柱。';
    hollandCode = 'RCI';
    hollandTags = ['现实型 (Realistic)', '常规型 (Conventional)', '研究型 (Investigative)'];
    summary = '你拥有非常突出的自律与责任感。在接受任务后，你会习惯性地制定详细的时间节点并百分百贯彻执行，极少出现拖延或遗漏。你情绪极具韧性，遇到挫折、领导施压时，能以极高的大局观与稳定性承受并化解压力，非常符合国资央企、国家重大技术骨干岗位以及大型合规性高要求团队的期待。';
    advantages = [
      '【执行先锋】：极强的自驱与执行力，保证复杂交付不打折扣、质量上乘。',
      '【定海神针】：面对突发、杂乱、高频的突击任务能保持从容，是优秀的风险控制者。',
      '【秩序专家】：善于优化既定工作流，整理极度清晰的知识框架、标准方案。'
    ];
  } else if (oScore >= 75 && eScore >= 70) {
    typeTitle = '开拓创新型 (O-E Core)';
    description = '你思想前卫、热爱创新，善于发现事物的本质和新奇可能。你拥有极强的外向型能量与感染力，非常适合在快速迭代、充满未知的朝阳业务中发挥奇思妙想，是团队的创新引擎。';
    hollandCode = 'EAI';
    hollandTags = ['企业型 (Enterprising)', '艺术型 (Artistic)', '研究型 (Investigative)'];
    summary = '你在开放性与外向度上展现出极高的特质。这使你永远对未知和前沿科技抱有无限的人热枕，同时能将新颖的概念与逻辑顺畅地输出和表达。面对守旧的制度与低效的工作，你敢于打破常规、进行开拓性的探索，极受前沿互联网、科技独角兽以及AI创新类团队的欢迎。';
    advantages = [
      '【灵感源泉】：脑洞大、嗅觉敏锐，能在红海市场中迅速发现全新破局点。',
      '【能量极客】：拥有超强的个人感染力与宣讲能力，极善于激发合作者的共鸣。',
      '【敏捷破局】：快速适应变化，能够在一无所有的荒原上快速搭建起0到1的样板。'
    ];
  } else if (aScore >= 75 && eScore >= 70) {
    typeTitle = '卓越协同型 (A-E Core)';
    description = '你天生极具同理心与亲和力，重视人际和谐，擅长在倾听与互动中凝聚人心。你的外向与阳光，能让周围的人感到温暖与力量，是绝佳的团队协调官和客户沟通桥梁。';
    hollandCode = 'SAE';
    hollandTags = ['社会型 (Social)', '艺术型 (Artistic)', '企业型 (Enterprising)'];
    summary = '你在宜人性与外向度上得分高昂，说明你是典型的情感连结者。在团队中，你总是最快洞察他人情绪波动的人，擅长倾听并包容不同的政见，从而在求同存异中凝聚最大的团队合力。不管是面对高要求的内外部客户，还是复杂的跨部门合作，你都能以极高的亲和力游刃有余地化解矛盾。';
    advantages = [
      '【信任纽带】：能在极短时间内与任何人建立起深层的情感连接与相互信任。',
      '【冲突克星】：善于在多方博弈、利益冲突的场合中，找到各方皆赢的最佳出路。',
      '【共情大师】：拥有无与伦比的客户与用户洞察同理心，对用户痛点感同身受。'
    ];
  }

  const stateOwnedFit = Math.min(100, Math.max(40, Math.round((cScore * 0.5 + sScore * 0.3 + aScore * 0.2))));
  const internetFit = Math.min(100, Math.max(40, Math.round((oScore * 0.4 + eScore * 0.3 + sScore * 0.3))));

  return {
    typeTitle,
    description,
    radarScores: [
      { dimension: '尽责性 (Conscientiousness)', score: cScore, avg: 65 },
      { dimension: '情绪稳定性 (Emotional Stability)', score: sScore, avg: 60 },
      { dimension: '宜人性 (Agreeableness)', score: aScore, avg: 72 },
      { dimension: '开放性 (Openness to Experience)', score: oScore, avg: 68 },
      { dimension: '外向性 (Extraversion)', score: eScore, avg: 62 }
    ],
    industryFit: {
      stateOwned: stateOwnedFit,
      internet: internetFit
    },
    hollandCode,
    hollandTags,
    deepInterpretation: {
      summary,
      advantages
    }
  };
}
