import type { AssessmentQuestion, ResumeData } from './types';
export { CAREER_CATALOG as MOCK_POSITIONS } from './catalog';

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

export const DEFAULT_RESUME_DATA: ResumeData = {
  name: '', school: '', major: '', graduationYear: '', skills: [], internships: [], projects: [], inferredDirection: '', targetCities: [],
};
