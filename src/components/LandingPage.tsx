import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, FileText, BrainCircuit, Target, Landmark, Laptop, CheckCircle, Award, Users } from 'lucide-react';
import { Position } from '../types';

interface LandingPageProps {
  onNavigate: (view: string) => void;
  positions?: Position[];
}

export default function LandingPage({ onNavigate, positions = [] }: LandingPageProps) {
  // Filter positions
  const soePositions = React.useMemo(() => {
    return positions.filter(p => p.type === 'state-owned');
  }, [positions]);

  const internetPositions = React.useMemo(() => {
    return positions.filter(p => p.type === 'internet');
  }, [positions]);

  const soeCount = soePositions.length || 35;
  const internetCount = internetPositions.length || 311;

  // Generate 4 diverse and flexible bullets for state-owned
  const soeBullets = React.useMemo(() => {
    if (soePositions.length === 0) {
      return [
        '国家电网 · 电力系统分析专责',
        '中国电信 · 5G网络规划与研发岗',
        '中国工商银行 · 金融科技管培生',
        '中国建筑 · 大型交建及勘测规划'
      ];
    }
    const bullets: string[] = [];
    const seenCos = new Set<string>();
    const seenTitles = new Set<string>();
    for (const p of soePositions) {
      const coShort = p.company.replace(/\s*(有限公司|集团|股份有限公司|科技|技术)\s*/g, '').trim();
      const titleShort = p.title.replace(/(高级|初级|资深|助理|研发|平台|核心|储备)/g, '').trim();
      if (!seenCos.has(coShort) && !seenTitles.has(titleShort) && bullets.length < 4) {
        seenCos.add(coShort);
        seenTitles.add(titleShort);
        bullets.push(`${coShort} · ${p.title}`);
      }
    }
    if (bullets.length < 4) {
      for (const p of soePositions) {
        const coShort = p.company.replace(/\s*(有限公司|集团|股份有限公司|科技|技术)\s*/g, '').trim();
        if (!seenCos.has(coShort) && bullets.length < 4) {
          seenCos.add(coShort);
          bullets.push(`${coShort} · ${p.title}`);
        }
      }
    }
    return bullets;
  }, [soePositions]);

  // Generate 4 diverse and flexible bullets for internet
  const internetBullets = React.useMemo(() => {
    if (internetPositions.length === 0) {
      return [
        '字节跳动 · 核心后端/算法研发',
        '腾讯科技 · 社交/游戏数据分析师',
        '美团 · 零售与本地生活产品经理',
        '小红书 · 内容社区运营与企划'
      ];
    }
    const bullets: string[] = [];
    const seenCos = new Set<string>();
    const seenTitles = new Set<string>();
    for (const p of internetPositions) {
      const coShort = p.company.replace(/\s*(有限公司|集团|股份有限公司|科技|技术)\s*/g, '').trim();
      const titleShort = p.title.replace(/(高级|初级|资深|助理|研发|平台|核心|储备)/g, '').trim();
      if (!seenCos.has(coShort) && !seenTitles.has(titleShort) && bullets.length < 4) {
        seenCos.add(coShort);
        seenTitles.add(titleShort);
        bullets.push(`${coShort} · ${p.title}`);
      }
    }
    if (bullets.length < 4) {
      for (const p of internetPositions) {
        const coShort = p.company.replace(/\s*(有限公司|集团|股份有限公司|科技|技术)\s*/g, '').trim();
        if (!seenCos.has(coShort) && bullets.length < 4) {
          seenCos.add(coShort);
          bullets.push(`${coShort} · ${p.title}`);
        }
      }
    }
    return bullets;
  }, [internetPositions]);
  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-slate-50 py-16 sm:py-24">
        {/* Background elements */}
        <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100/80 border border-blue-200/50 text-blue-800 text-xs font-semibold mb-6 shadow-xs"
          >
            <Users className="w-3.5 h-3.5" />
            已有 2,348 位高校同学通过本平台找到了求职方向
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display tracking-tight text-slate-900 leading-tight"
          >
            读懂你的简历，
            <span className="text-blue-600 block mt-2 sm:inline sm:mt-0 bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              更懂你的未来
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 max-w-2xl mx-auto text-base sm:text-lg lg:text-xl text-slate-600 font-normal leading-relaxed"
          >
            上传简历 + 5分钟测评，立等生成专属求职报告。<br />
            深度适配央国企与互联网两大热门求职赛道，发掘你真正的岗位相性。
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              id="landing-cta-primary"
              onClick={() => onNavigate('upload')}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg hover:shadow-blue-200/50 transition-all cursor-pointer transform hover:-translate-y-0.5 active:scale-98 flex items-center justify-center gap-2 group"
            >
              免费开始匹配 
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              id="landing-cta-secondary"
              onClick={() => onNavigate('browser')}
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-blue-600 font-medium rounded-xl border border-slate-200 shadow-xs hover:border-blue-200 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              浏览岗位库
            </button>
          </motion.div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-16 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900">
              双引擎智能匹配系统
            </h2>
            <p className="mt-3 text-slate-500 text-sm sm:text-base">
              拒绝千篇一律的岗位投递。通过简历技术底子与心理科学测验的双向匹配，锁定高度契合的职位。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-5">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">AI 简历解析</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                上传你的 PDF 或 Word 简历，30秒深度提取教育背景、硬技能、软实力、实习及项目经验，沉淀能力标签。
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-5">
                <BrainCircuit className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">科学性格测评</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                专为高校同学研发的5分钟精简性格模型。涵盖大五人格与霍兰德职业兴趣测验，理清你的职业原动力。
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-5">
                <Target className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">精准匹配度评分</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                融合硬核能力（简历）与软性气质（测评），科学输出多维度匹配分数，量身呈现你的最佳求职雷达。
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Track Sector Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 flex items-center justify-center gap-2">
              <Award className="w-8 h-8 text-blue-600" />
              覆盖两大求职黄金赛道
            </h2>
            <p className="mt-3 text-slate-500 text-sm sm:text-base">
              无论你是追求稳定的“上岸一族”，还是向往高成长、高回报的“科技极客”，这里都有对应的岗位模型深拆。
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sector 1: SOE */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                    <Landmark className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">🏛️ 央企/国企/事业单位</h3>
                    <p className="text-xs text-slate-500">稳定踏实，高福利，长期社会保障</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  精选国家电网、中国移动、中建集团、四大行及大型事业单位核心业务岗。聚焦电力系统、网络通信、金融科技、综合管理等高含金量科室。
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-700 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {soeBullets.map((bullet, i) => (
                    <div key={i} className="flex items-center gap-2 truncate" title={bullet}>
                      🔹 {bullet}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <span className="text-xs text-purple-700 font-semibold bg-purple-100/70 px-2.5 py-1 rounded-full">已拆解 {soeCount} 个核心岗位</span>
                <button onClick={() => onNavigate('browser')} className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1 cursor-pointer">
                  前往探索岗位库 <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sector 2: Internet */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                    <Laptop className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">💻 互联网/高科技大厂</h3>
                    <p className="text-xs text-slate-500">敏捷高速，高起薪，卓越的发展空间</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  对接字节跳动、腾讯、阿里巴巴、美团、小红书等头部平台。拆解后端开发、算法工程、数据分析、产品经理及 UI/UX 设计等全栈体系。
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-700 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {internetBullets.map((bullet, i) => (
                    <div key={i} className="flex items-center gap-2 truncate" title={bullet}>
                      🔸 {bullet}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <span className="text-xs text-blue-700 font-semibold bg-blue-100/70 px-2.5 py-1 rounded-full">已拆解 {internetCount} 个核心岗位</span>
                <button onClick={() => onNavigate('browser')} className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1 cursor-pointer">
                  前往探索岗位库 <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advantage Banner */}
      <section className="py-12 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-lg font-bold text-slate-900 text-center mb-8">为什么选择「精准职达」？</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 text-center">
            {[
              'AI精准匹配',
              '国企+互联网覆盖',
              '简历+性格双引擎',
              '科学性格量表',
              '深度岗位说明书',
              '免费基础服务'
            ].map((text, i) => (
              <div key={i} className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-100/60">
                <CheckCircle className="w-5 h-5 text-green-600 mb-2" />
                <span className="text-xs font-semibold text-slate-800">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            <span className="font-display font-bold text-white text-base">精准职达</span>
            <span className="text-xs text-slate-500">© 2026. 大学生求职双引擎推荐系统。</span>
          </div>
          <div className="flex gap-6 text-xs">
            <a href="#privacy" className="hover:text-white transition-colors">隐私政策</a>
            <a href="#terms" className="hover:text-white transition-colors">用户协议</a>
            <a href="#support" className="hover:text-white transition-colors">技术支持</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
